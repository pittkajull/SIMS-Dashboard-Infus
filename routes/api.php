<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\InfusionController;
use App\Http\Controllers\ChatController;
use App\Models\Infusion;

// Route untuk menerima data dari ESP32 (device_id dikirim di body JSON)
// Rate limit: max 30 request per menit per IP (ESP32 kirim tiap 5 detik = 12/menit)
Route::post('/update-infusion', [InfusionController::class, 'updateStatus'])
    ->middleware('throttle:30,1');

// Route test untuk memastikan API jalan (akses http://127.0.0.1:8000/api/test)
Route::get('/test', function() {
    return response()->json(['message' => 'API SIMS Aktif!']);
});

// ==========================================
// PUBLIC API (Tanpa Auth, Tanpa CSRF)
// ==========================================

// Infusions by room (public dashboard)
Route::get('/public/infusions/{room}', function (string $roomNumber) {
    $infusions = Infusion::where('room_number', $roomNumber)
        ->whereNull('finished_at')
        ->latest('start_time')
        ->get();

    return response()->json($infusions);
});

// Chat - guest message
Route::post('/chat/guest', [ChatController::class, 'storeGuest']);

// Chat - get messages for room
Route::get('/chat/{room}', [ChatController::class, 'messages']);