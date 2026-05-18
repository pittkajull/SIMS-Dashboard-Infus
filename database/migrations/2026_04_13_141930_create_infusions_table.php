<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('infusions', function (Blueprint $table) {
            $table->id();
            $table->string('patient_name'); // Nama Pasien
            $table->string('room_number');  // Nomor Bed/Kamar
            $table->string('fluid_type');   // Jenis Cairan (RL, NaCl, dll)
            $table->integer('total_volume'); // Volume awal (100, 500, 1000ml)
            $table->integer('current_remaining'); // Sisa saat ini (ml)
            $table->integer('tpm_target');  // Target Tetes Per Menit (TPM)
            $table->string('drip_type');    // Makro atau Mikro
            $table->enum('status', ['monitoring', 'warning', 'finished', 'offline'])->default('monitoring');
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('infusions');
    }
};
