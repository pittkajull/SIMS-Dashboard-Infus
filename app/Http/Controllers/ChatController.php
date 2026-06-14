<?php

namespace App\Http\Controllers;

use App\Models\Message;
use App\Events\NewMessage;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;

class ChatController extends Controller
{
    /**
     * Show chat page for nurse (authenticated).
     */
    public function index()
    {
        $rooms = Message::select('room_number')
            ->selectRaw('MAX(created_at) as last_message_at')
            ->selectRaw('SUM(CASE WHEN is_from_nurse = 0 AND read_at IS NULL THEN 1 ELSE 0 END) as unread_count')
            ->groupBy('room_number')
            ->orderByDesc('last_message_at')
            ->get();

        return Inertia::render('Chat', [
            'rooms' => $rooms,
            'user' => Auth::user(),
        ]);
    }

    /**
     * Get messages for a specific room.
     */
    public function messages(Request $request, string $roomNumber)
    {
        $messages = Message::where('room_number', $roomNumber)
            ->orderBy('created_at', 'asc')
            ->get();

        return response()->json($messages);
    }

    /**
     * Send message as nurse.
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'room_number' => 'required|string',
            'message' => 'required|string|max:1000',
        ]);

        $message = Message::create([
            'sender_id' => Auth::id(),
            'sender_name' => Auth::user()->name,
            'room_number' => $validated['room_number'],
            'message' => $validated['message'],
            'is_from_nurse' => true,
        ]);

        broadcast(new NewMessage($message));

        return response()->json($message, 201);
    }

    /**
     * Send message as guest (public user).
     */
    public function storeGuest(Request $request)
    {
        $validated = $request->validate([
            'room_number' => 'required|string',
            'sender_name' => 'required|string|max:100',
            'message' => 'required|string|max:1000',
        ]);

        $message = Message::create([
            'sender_id' => null,
            'sender_name' => $validated['sender_name'],
            'room_number' => $validated['room_number'],
            'message' => $validated['message'],
            'is_from_nurse' => false,
        ]);

        broadcast(new NewMessage($message));

        return response()->json($message, 201);
    }

    /**
     * Mark messages in a room as read by nurse.
     */
    public function markRead(string $roomNumber)
    {
        Message::where('room_number', $roomNumber)
            ->where('is_from_nurse', false)
            ->whereNull('read_at')
            ->update(['read_at' => now()]);

        return response()->json(['status' => 'ok']);
    }
}
