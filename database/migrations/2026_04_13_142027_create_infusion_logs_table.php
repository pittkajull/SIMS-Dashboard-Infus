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
    Schema::create('infusion_logs', function (Blueprint $table) {
        $table->id();
        $table->foreignId('infusion_id')->constrained()->onDelete('cascade');
        $table->integer('volume_recorded');
        $table->timestamps(); // record waktu perekaman
    });
}

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('infusion_logs');
    }
};
