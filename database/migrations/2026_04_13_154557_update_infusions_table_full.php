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
    Schema::table('infusions', function (Blueprint $table) {
    $table->integer('flowrate')->default(0)->after('tpm_target'); // ml/jam
    $table->dateTime('start_time')->nullable()->after('status');
});
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        //
    }
};
