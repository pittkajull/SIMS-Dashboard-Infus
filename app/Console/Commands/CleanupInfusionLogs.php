<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\InfusionLog;
use Carbon\Carbon;

class CleanupInfusionLogs extends Command
{
    protected $signature = 'infusion:cleanup-logs {--days=7 : Hapus log yang lebih tua dari N hari}';
    protected $description = 'Hapus infusion_logs yang lebih tua dari 7 hari (default)';

    public function handle()
    {
        $days = (int) $this->option('days');
        $cutoff = Carbon::now()->subDays($days);

        $count = InfusionLog::where('created_at', '<', $cutoff)->count();

        if ($count === 0) {
            $this->info("Tidak ada log yang lebih tua dari {$days} hari.");
            return 0;
        }

        InfusionLog::where('created_at', '<', $cutoff)->delete();

        $this->info("Berhasil menghapus {$count} log yang lebih tua dari {$days} hari.");
        return 0;
    }
}
