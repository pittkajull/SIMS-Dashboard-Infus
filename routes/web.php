<?php

use App\Http\Controllers\ProfileController;
use Illuminate\Support\Facades\Route;
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

Route::middleware(['auth', 'verified'])->group(function () {

    // ==========================================
    // PUSAT MONITORING (DASHBOARD)
    // ==========================================
    Route::get('/dashboard', function () {
        return Inertia::render('Dashboard', [
            'infusions' => Infusion::latest()->get()
        ]);
    })->name('dashboard');

    // ==========================================
    // MANAJEMEN INFUS
    // ==========================================
    
    // Simpan Pasien Baru
    Route::post('/infusions', function (Request $request) {
        $validated = $request->validate([
            'patient_name' => 'required|string|max:255',
            'room_number'  => 'required|string|max:50',
            'fluid_type'   => 'required|string|max:255',
            'total_volume' => 'required|numeric|min:1',
            'flowrate'     => 'required|numeric|min:1',
            'drip_type'    => 'required|in:Mikro,Makro,mikro,makro',
        ]);

        Infusion::create([
            'patient_name'      => $validated['patient_name'],
            'room_number'       => $validated['room_number'],
            'fluid_type'        => $validated['fluid_type'],
            'total_volume'      => $validated['total_volume'],
            'current_remaining' => $validated['total_volume'],
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
        return Inertia::render('Recap', [
            'infusion' => Infusion::findOrFail($id),
            'logs'     => InfusionLog::where('infusion_id', $id)->latest()->take(50)->get()
        ]);
    })->name('infusions.recap');

    // Hapus Monitoring
    Route::delete('/infusions/{id}', function ($id) {
        Infusion::findOrFail($id)->delete();
        return redirect()->back();
    })->name('infusions.destroy');

    // ==========================================
    // PENGATURAN PROFIL
    // ==========================================
    Route::get('/profile', [ProfileController::class, 'edit'])->name('profile.edit');
    Route::patch('/profile', [ProfileController::class, 'update'])->name('profile.update');
    Route::delete('/profile', [ProfileController::class, 'destroy'])->name('profile.destroy');
});

require __DIR__.'/auth.php';