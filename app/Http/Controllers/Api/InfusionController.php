<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Infusion;
use App\Models\InfusionLog;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Carbon\Carbon;

class InfusionController extends Controller
{
    public function updateStatus(Request $request)
    {
        $startTime = microtime(true);

        // ========== LOG: Data Masuk dari ESP32 ==========
        Log::channel('infusion')->info('=== DATA MASUK DARI DEVICE ===', [
            'device_id' => $request->input('device_id'),
            'raw_body' => $request->getContent(),
            'parsed' => $request->all(),
            'ip' => $request->ip(),
            'timestamp' => now()->toDateTimeString(),
        ]);

        // Ambil device_id dari body JSON
        $deviceId = $request->input('device_id');
        if (empty($deviceId)) {
            Log::channel('infusion')->error('device_id KOSONG di request');
            return response()->json([
                'status' => 'error',
                'message' => 'device_id is required',
            ], 422);
        }

        // Cari infus aktif berdasarkan device_id (yang belum selesai)
        $infusion = Infusion::where('device_id', $deviceId)
            ->whereNull('finished_at')
            ->first();

        if (!$infusion) {
            Log::channel('infusion')->error('Infusion TIDAK DITEMUKAN untuk device_id', [
                'device_id' => $deviceId,
            ]);
            return response()->json([
                'status' => 'error',
                'message' => "No active infusion found for device_id: {$deviceId}",
            ], 404);
        }

        // Terima data dari ESP32
        $tpm = (float) $request->input('tpm', 0);
        $beratRaw = (float) $request->input('berat_raw', 0);
        $sisaVolumeEsp = $request->has('sisa_volume') ? (float) $request->input('sisa_volume') : null;
        $persenSisaEsp = (float) $request->input('persen_sisa', 0);
        $statusKritis = (bool) $request->input('status_kritis', false);

        // ========================================
        // VALIDASI RANGE DATA (cegah sensor error/corrupt)
        // ========================================
        $tpm = max(0, min($tpm, 500));                    // TPM: 0 - 500
        $beratRaw = max(0, $beratRaw);                     // Berat: minimal 0
        if ($sisaVolumeEsp !== null) {
            $sisaVolumeEsp = max(0, min($sisaVolumeEsp, $infusion->total_volume * 1.1)); // Max 110% dari total
        }
        $persenSisaEsp = max(0, min($persenSisaEsp, 100)); // Persen: 0 - 100

        // Simpan sisa volume sebelum di-update (untuk hitung konsumsi)
        $prevRemaining = $infusion->current_remaining;

        // ========================================
        // GUNAKAN sisa_volume DARI ESP32 LANGSUNG
        // ESP32 sudah hitung dari sensor berat (load cell)
        // null = field tidak dikirim, 0 = load cell kosong (valid!)
        // ========================================
        if ($sisaVolumeEsp !== null) {
            $currentRemaining = round($sisaVolumeEsp);
            $volumeConsumed = max(0, $prevRemaining - $currentRemaining);

            Log::channel('infusion')->info('UPDATE DARI SENSOR ESP32', [
                'sisa_volume_esp' => $sisaVolumeEsp,
                'berat_raw' => $beratRaw,
                'prev_remaining' => $prevRemaining,
                'new_remaining' => $currentRemaining,
                'volume_consumed' => $volumeConsumed,
            ]);
        } else {
            // Fallback: hitung dari TPM jika ESP32 tidak kirim sisa_volume
            $dropFactor = (strtolower($infusion->drip_type) === 'mikro') ? 60 : 20;
            $lastLog = InfusionLog::where('infusion_id', $infusion->id)->latest('created_at')->first();
            $now = Carbon::now();

            if ($lastLog && $tpm > 0) {
                $elapsedSeconds = Carbon::parse($lastLog->created_at)->diffInSeconds($now);
                $elapsedMinutes = $elapsedSeconds / 60;
                $volumeConsumed = ($tpm / $dropFactor) * $elapsedMinutes;
                $currentRemaining = max(0, round($prevRemaining - $volumeConsumed));

                Log::channel('infusion')->info('HITUNG DARI TPM (fallback)', [
                    'elapsed_minutes' => round($elapsedMinutes, 4),
                    'tpm' => $tpm,
                    'drop_factor' => $dropFactor,
                    'volume_consumed' => round($volumeConsumed, 4),
                    'prev_remaining' => $prevRemaining,
                    'new_remaining' => $currentRemaining,
                ]);
            } else {
                $currentRemaining = $prevRemaining;
                $volumeConsumed = 0;

                Log::channel('infusion')->info('TIDAK ADA DATA SENSOR (tpm=0, sisa_volume=0)', [
                    'current_remaining' => $currentRemaining,
                ]);
            }
        }

        // ========================================
        // TENTUKAN STATUS
        // ========================================
        // 1. status_kritis dari ESP32 (misal tombol darurat)
        // 2. sisa volume < 10% dari total
        // 3. TPM = 0 tapi masih ada volume → indikasi sumbatan / infus berhenti menetes
        $isTpmZero = ($tpm <= 0 && $currentRemaining > 0);

        if ($statusKritis) {
            $newStatus = 'warning';
            Log::channel('infusion')->warning('WARNING: status_kritis dari ESP32');
        } elseif ($currentRemaining < ($infusion->total_volume * 0.1)) {
            $newStatus = 'warning';
            Log::channel('infusion')->warning('WARNING: sisa volume < 10%');
        } elseif ($isTpmZero) {
            $newStatus = 'warning';
            Log::channel('infusion')->warning('WARNING: TPM = 0 (indikasi sumbatan/berhenti menetes)', [
                'tpm' => $tpm,
                'current_remaining' => $currentRemaining,
            ]);
        } else {
            $newStatus = 'monitoring';
        }

        // Simpan ke database
        $infusion->current_remaining = $currentRemaining;
        $infusion->status = $newStatus;
        $infusion->save();

        InfusionLog::create([
            'infusion_id' => $infusion->id,
            'volume_recorded' => $currentRemaining,
            'tpm' => $tpm,
        ]);

        $elapsed = round((microtime(true) - $startTime) * 1000, 2);

        // ========== LOG: Hasil Akhir ==========
        Log::channel('infusion')->info('=== DATA TERSIMPAN ===', [
            'device_id' => $deviceId,
            'infusion_id' => $infusion->id,
            'patient' => $infusion->patient_name,
            'room' => $infusion->room_number,
            'tpm' => $tpm,
            'berat_raw' => $beratRaw,
            'sisa_volume_esp' => $sisaVolumeEsp,
            'persen_sisa_esp' => $persenSisaEsp,
            'status_kritis' => $statusKritis,
            'volume_consumed' => round($volumeConsumed, 2),
            'prev_remaining' => $prevRemaining,
            'current_remaining' => $currentRemaining,
            'total_volume' => $infusion->total_volume,
            'percentage' => round(($currentRemaining / $infusion->total_volume) * 100, 1) . '%',
            'status' => $infusion->status,
            'process_time_ms' => $elapsed,
        ]);

        // Tentukan alasan warning untuk response
        $warningReason = null;
        if ($newStatus === 'warning') {
            if ($statusKritis) $warningReason = 'status_kritis dari ESP32';
            elseif ($currentRemaining < ($infusion->total_volume * 0.1)) $warningReason = 'sisa volume kritis (< 10%)';
            elseif ($isTpmZero) $warningReason = 'TPM = 0, indikasi sumbatan atau infus berhenti menetes';
        }

        // Cek apakah ada command tare dari dashboard
        $command = null;
        if ($infusion->tare_command) {
            $command = 'tare';
            // Reset flag setelah dikirim ke ESP32
            $infusion->tare_command = false;
            $infusion->save();

            Log::channel('infusion')->info('COMMAND TARE dikirim ke ESP32', [
                'device_id' => $deviceId,
            ]);
        }

        // Handle acknowledge dari ESP32 bahwa tare sudah selesai
        if ($request->input('tare_done') === true) {
            Log::channel('infusion')->info('ESP32 TARE SELESAI', [
                'device_id' => $deviceId,
            ]);
        }

        return response()->json([
            'status' => 'success',
            'device_id' => $deviceId,
            'infusion_status' => $newStatus,
            'warning_reason' => $warningReason,
            'current_remaining' => $currentRemaining,
            'tpm_received' => $tpm,
            'berat_raw' => $beratRaw,
            'volume_consumed' => round($volumeConsumed, 2),
            'percentage' => round(($currentRemaining / $infusion->total_volume) * 100, 1),
            'command' => $command,
        ]);
    }
}
