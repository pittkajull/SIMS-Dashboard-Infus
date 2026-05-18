<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Infusion extends Model
{
    use HasFactory;

    protected $fillable = [
        'patient_name', 'room_number', 'fluid_type', 'total_volume', 
        'current_remaining', 'flowrate', 'drip_type', 'status', 'start_time', 'tpm_target'
    ];

    protected $appends = ['tpm_calculated', 'estimated_time_remaining', 'percentage_remaining'];

    // REQ-002: Kalkulasi TPM Otomatis
    public function getTpmCalculatedAttribute() {
        if ($this->flowrate <= 0) return 0;
        $factor = ($this->drip_type === 'Mikro') ? 60 : 20;
        return round(($this->flowrate * $factor) / 60);
    }

    // REQ-004: Estimasi Waktu Habis
    public function getEstimatedTimeRemainingAttribute() {
        if ($this->flowrate <= 0) return "Tergantung Tetesan";
        $total_minutes = ($this->current_remaining / $this->flowrate) * 60;
        $hours = floor($total_minutes / 60);
        $minutes = round($total_minutes % 60);
        return $hours > 0 || $minutes > 0 ? "{$hours}j {$minutes}m" : "Segera Habis";
    }

    public function getPercentageRemainingAttribute() {
        return ($this->total_volume > 0) ? round(($this->current_remaining / $this->total_volume) * 100, 1) : 0;
    }

    public function logs() {
        return $this->hasMany(InfusionLog::class);
    }
}