<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

class Infusion extends Model
{
    use HasFactory;

    protected $fillable = [
        'device_id', 'tare_command', 'patient_name', 'room_number', 'patient_group', 'infusion_number', 'fluid_type', 'total_volume',
        'current_remaining', 'flowrate', 'drip_type', 'status', 'start_time', 'finished_at', 'tpm_target'
    ];

    protected $casts = [
        'finished_at' => 'datetime',
    ];

    protected $appends = ['tpm_calculated', 'tpm_actual', 'estimated_time_remaining', 'percentage_remaining', 'device_status', 'last_data_at'];

    // REQ-002: Kalkulasi TPM Otomatis (teori dari flowrate)
    public function getTpmCalculatedAttribute() {
        if ($this->flowrate <= 0) return 0;
        $factor = ($this->drip_type === 'Mikro') ? 60 : 20;
        return round(($this->flowrate * $factor) / 60);
    }

    // TPM aktual dari sensor IR (data terakhir dari ESP32)
    public function getTpmActualAttribute() {
        $lastLog = $this->logs()->latest('created_at')->first();
        return $lastLog ? round((float) $lastLog->tpm, 1) : 0;
    }

    // REQ-004: Estimasi Waktu Habis — berdasarkan TPM aktual dari sensor
    public function getEstimatedTimeRemainingAttribute() {
        // Jika belum ada data dari ESP32 sama sekali
        if ($this->current_remaining <= 0 && $this->logs()->count() === 0) {
            return "Menunggu Data";
        }

        // Ambil TPM dari log terakhir (data sensor IR)
        $lastLog = $this->logs()->latest('created_at')->first();
        $tpm = $lastLog ? (float) $lastLog->tpm : 0;

        if ($tpm <= 0) {
            // Fallback ke flowrate jika belum ada data sensor
            if ($this->flowrate <= 0) return "Tergantung Tetesan";
            $total_minutes = ($this->current_remaining / $this->flowrate) * 60;
        } else {
            // Hitung dari TPM aktual: volume_per_minute = tpm / drop_factor
            $dropFactor = (strtolower($this->drip_type) === 'mikro') ? 60 : 20;
            $mlPerMinute = $tpm / $dropFactor;
            if ($mlPerMinute <= 0) return "Tergantung Tetesan";
            $total_minutes = $this->current_remaining / $mlPerMinute;
        }

        $hours = floor($total_minutes / 60);
        $minutes = round($total_minutes % 60);
        return $hours > 0 || $minutes > 0 ? "{$hours}j {$minutes}m" : "Segera Habis";
    }

    public function getPercentageRemainingAttribute() {
        return ($this->total_volume > 0) ? round(($this->current_remaining / $this->total_volume) * 100, 1) : 0;
    }

    // Status device: online / offline berdasarkan data terakhir
    public function getDeviceStatusAttribute() {
        if (!$this->device_id) return 'no_device';

        $lastLog = $this->logs()->latest('created_at')->first();
        if (!$lastLog) return 'no_data';

        $secondsAgo = Carbon::parse($lastLog->created_at)->diffInSeconds(now());
        return $secondsAgo > 30 ? 'offline' : 'online';
    }

    // Waktu data terakhir diterima dari device
    public function getLastDataAtAttribute() {
        $lastLog = $this->logs()->latest('created_at')->first();
        return $lastLog ? Carbon::parse($lastLog->created_at)->diffForHumans() : null;
    }

    public function logs() {
        return $this->hasMany(InfusionLog::class);
    }

    public function isActive() {
        return is_null($this->finished_at);
    }

    public function gantiInfus($newFluidType = null, $newTotalVolume = null) {
        return DB::transaction(function () use ($newFluidType, $newTotalVolume) {
            // Tandai infus lama selesai
            $this->update([
                'status' => 'finished',
                'finished_at' => now(),
            ]);

            // Buat infus baru untuk pasien yang sama
            return Infusion::create([
                'device_id' => $this->device_id,
                'patient_name' => $this->patient_name,
                'room_number' => $this->room_number,
                'patient_group' => $this->patient_group,
                'infusion_number' => $this->infusion_number + 1,
                'fluid_type' => $newFluidType ?? $this->fluid_type,
                'total_volume' => $newTotalVolume ?? $this->total_volume,
                'current_remaining' => 0, // Menunggu data dari ESP32
                'flowrate' => $this->flowrate,
                'drip_type' => $this->drip_type,
                'tpm_target' => 0,
                'status' => 'monitoring',
                'start_time' => now(),
            ]);
        });
    }
}