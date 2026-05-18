<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Infusion;
use App\Models\InfusionLog;
use Illuminate\Http\Request;

class InfusionController extends Controller
{
    public function updateStatus(Request $request, $id)
    {
        $infusion = Infusion::find($id);
        if (!$infusion) return response()->json(['status' => 'error'], 404);

        $infusion->current_remaining = $request->remaining;
        // REQ-005: Pemicu Alert jika < 10%
        $infusion->status = ($request->remaining < ($infusion->total_volume * 0.1)) ? 'warning' : 'monitoring';
        $infusion->save();

        // REQ-006: Digital Charting (Log tiap data masuk)
        InfusionLog::create([
            'infusion_id' => $id,
            'volume_recorded' => $request->remaining,
        ]);

        return response()->json(['status' => 'success']);
    }
}