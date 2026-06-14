<?php

use App\Http\Controllers\ProfileController;
use App\Http\Controllers\ChatController;
use Illuminate\Support\Facades\Route;
use Illuminate\Support\Str;
use Inertia\Inertia;
use App\Models\Infusion;
use App\Models\InfusionLog;
use Illuminate\Http\Request;

Route::get('/', function () {
    return Inertia::render('Welcome', [
        'canLogin' => Route::has('login'),
        'canRegister' => Route::has('register'),
    ]);
});

// ==========================================
// PUBLIC DASHBOARD (Tanpa Login)
// ==========================================
Route::get('/public/dashboard', function () {
    return Inertia::render('PublicDashboard');
})->name('public.dashboard');

Route::get('/api/public/infusions/{room}', function (string $roomNumber) {
    $infusions = Infusion::where('room_number', $roomNumber)
        ->whereNull('finished_at')
        ->latest('start_time')
        ->get();

    return response()->json($infusions);
});

// Public chat & infusion API (moved to routes/api.php to avoid CSRF)

Route::middleware(['auth', 'verified'])->group(function () {

    // ==========================================
    // PUSAT MONITORING (DASHBOARD)
    // ==========================================
    Route::get('/dashboard', function () {
        return Inertia::render('Dashboard', [
            'infusions' => Infusion::whereNull('finished_at')->latest('start_time')->get()
        ]);
    })->name('dashboard');

    // ==========================================
    // MANAJEMEN INFUS
    // ==========================================
    
    // Simpan Pasien Baru
    Route::post('/infusions', function (Request $request) {
        $validated = $request->validate([
            'device_id'    => 'nullable|string|max:10',
            'patient_name' => 'required|string|max:255',
            'room_number'  => 'required|string|max:50',
            'fluid_type'   => 'required|string|max:255',
            'total_volume' => 'required|numeric|min:1',
            'flowrate'     => 'required|numeric|min:1',
            'drip_type'    => 'required|in:Mikro,Makro,mikro,makro',
        ]);

        // Validasi: cek apakah device_id sudah dipakai infus aktif lain
        if (!empty($validated['device_id'])) {
            $existingDevice = Infusion::where('device_id', $validated['device_id'])
                ->whereNull('finished_at')
                ->first();

            if ($existingDevice) {
                return back()->withErrors([
                    'device_id' => "Device tersebut sedang digunakan oleh BED {$existingDevice->room_number} ({$existingDevice->patient_name})"
                ])->withInput();
            }
        }

        Infusion::create([
            'device_id'         => $validated['device_id'] ?? null,
            'patient_name'      => $validated['patient_name'],
            'room_number'       => $validated['room_number'],
            'patient_group'     => Str::slug($validated['patient_name'] . '_' . $validated['room_number']),
            'infusion_number'   => 1,
            'fluid_type'        => $validated['fluid_type'],
            'total_volume'      => $validated['total_volume'],
            'current_remaining' => 0, // Menunggu data dari ESP32
            'flowrate'          => $validated['flowrate'],
            'drip_type'         => $validated['drip_type'],
            'tpm_target'        => 0,
            'start_time'        => now(),
            'status'            => 'monitoring',
        ]);

        return redirect()->route('dashboard');
    })->name('infusions.store');

    // Digital Charting / Rekap
    Route::get('/recap/{id}', function ($id) {
        $infusion = Infusion::findOrFail($id);
        $allInfusions = Infusion::where('patient_group', $infusion->patient_group)
            ->orderBy('infusion_number')
            ->get();
        $logs = InfusionLog::where('infusion_id', $id)
            ->latest()
            ->take(50)
            ->get();

        return Inertia::render('Recap', [
            'infusion'     => $infusion,
            'allInfusions' => $allInfusions,
            'logs'         => $logs,
        ]);
    })->name('infusions.recap');

    // Ganti Infus (tandai selesai + buat baru)
    Route::post('/infusions/{id}/ganti', function ($id) {
        $infusion = Infusion::findOrFail($id);
        if (!$infusion->isActive()) {
            return redirect()->back()->with('error', 'Infus sudah ditandai selesai.');
        }

        try {
            $newInfusion = $infusion->gantiInfus();
            if (!$newInfusion) {
                return redirect()->back()->with('error', 'Gagal membuat infus baru.');
            }
        } catch (\Exception $e) {
            return redirect()->back()->with('error', 'Terjadi kesalahan: ' . $e->getMessage());
        }

        return redirect()->route('dashboard');
    })->name('infusions.ganti');

    // Tare Load Cell (kirim command ke ESP32)
    Route::post('/infusions/{id}/tare', function ($id) {
        $infusion = Infusion::findOrFail($id);
        $infusion->update(['tare_command' => true]);
        return redirect()->back()->with('success', 'Perintah Tare dikirim ke device. Timbangan akan di-reset pada pengiriman data berikutnya.');
    })->name('infusions.tare');

    // Hapus Monitoring
    Route::delete('/infusions/{id}', function ($id) {
        Infusion::findOrFail($id)->delete();
        return redirect()->back();
    })->name('infusions.destroy');

    // ==========================================
    // LOG VIEWER (DEBUG)
    // ==========================================
    Route::get('/logs', function (Request $request) {
        // Ambil semua infus (aktif + selesai) untuk dropdown
        $infusions = Infusion::orderByDesc('id')
            ->get(['id', 'device_id', 'patient_name', 'room_number', 'finished_at']);

        // Filter by device_id jika dipilih
        $selectedDevice = $request->input('device');

        // Baca semua log file (hari ini + kemarin), urutkan dari terlama ke terbaru
        $logs = '';
        $logFiles = [
            storage_path('logs/infusion-' . now()->subDay()->format('Y-m-d') . '.log'),
            storage_path('logs/infusion-' . now()->format('Y-m-d') . '.log'),
        ];

        foreach ($logFiles as $logPath) {
            if (file_exists($logPath)) {
                $logs .= file_get_contents($logPath);
            }
        }

        // Fallback ke log file lama jika yang baru tidak ada
        if (empty($logs)) {
            $legacyPath = storage_path('logs/infusion.log');
            if (file_exists($legacyPath)) {
                $logs = file_get_contents($legacyPath);
            }
        }

        // Fallback ke log file lama jika yang baru tidak ada
        if (empty($logs)) {
            $legacyPath = storage_path('logs/infusion.log');
            if (file_exists($legacyPath)) {
                $logs = file_get_contents($legacyPath);
            }
        }

        // Filter log berdasarkan device_id jika dipilih
        if ($selectedDevice) {
            $filteredLines = [];
            foreach (explode("\n", $logs) as $line) {
                if (stripos($line, '"device_id":"' . $selectedDevice . '"') !== false ||
                    stripos($line, '"device_id": "' . $selectedDevice . '"') !== false ||
                    stripos($line, 'device_id=' . $selectedDevice) !== false ||
                    stripos($line, 'device_id: ' . $selectedDevice) !== false) {
                    $filteredLines[] = $line;
                }
            }
            $logs = implode("\n", $filteredLines);
        }

        return Inertia::render('LogViewer', [
            'logs' => $logs,
            'infusions' => $infusions,
            'selectedDevice' => $selectedDevice,
        ]);
    })->name('logs.viewer');

    // ==========================================
    // PENGATURAN PROFIL
    // ==========================================
    Route::get('/profile', [ProfileController::class, 'edit'])->name('profile.edit');
    Route::patch('/profile', [ProfileController::class, 'update'])->name('profile.update');
    Route::delete('/profile', [ProfileController::class, 'destroy'])->name('profile.destroy');

    // ==========================================
    // CHAT (SUSTER)
    // ==========================================
    Route::get('/chat', [ChatController::class, 'index'])->name('chat');
    Route::post('/chat', [ChatController::class, 'store'])->name('chat.store');
    Route::post('/chat/read/{room}', [ChatController::class, 'markRead'])->name('chat.read');
});

require __DIR__.'/auth.php';