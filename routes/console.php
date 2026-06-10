<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

// Cleanup infusion_logs setiap jam 2 pagi, hapus yang lebih tua dari 7 hari
Schedule::command('infusion:cleanup-logs --days=7')->dailyAt('02:00');
