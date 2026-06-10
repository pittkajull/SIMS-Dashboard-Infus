<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\InfusionController;

// Route untuk menerima data dari ESP32 (device_id dikirim di body JSON)
// Rate limit: max 30 request per menit per IP (ESP32 kirim tiap 5 detik = 12/menit)
Route::post('/update-infusion', [InfusionController::class, 'updateStatus'])
    ->middleware('throttle:30,1');

// Route test untuk memastikan API jalan (akses http://127.0.0.1:8000/api/test)
Route::get('/test', function() {
    return response()->json(['message' => 'API SIMS Aktif!']);
});