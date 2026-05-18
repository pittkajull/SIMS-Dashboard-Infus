<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\InfusionController;

// Route untuk simulator update data infus
Route::post('/update-infusion/{id}', [InfusionController::class, 'updateStatus']);

// Route test untuk memastikan API jalan (akses http://127.0.0.1:8000/api/test)
Route::get('/test', function() {
    return response()->json(['message' => 'API SIMS Aktif!']);
});