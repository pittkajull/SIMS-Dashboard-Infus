<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('infusions', function (Blueprint $table) {
            $table->string('patient_group')->nullable()->after('room_number');
            $table->integer('infusion_number')->default(1)->after('patient_group');
            $table->dateTime('finished_at')->nullable()->after('start_time');
        });

        // Backfill data existing
        DB::table('infusions')->update([
            'patient_group' => DB::raw("CONCAT(patient_name, '_', room_number)"),
            'infusion_number' => 1,
        ]);
    }

    public function down(): void
    {
        Schema::table('infusions', function (Blueprint $table) {
            $table->dropColumn(['patient_group', 'infusion_number', 'finished_at']);
        });
    }
};
