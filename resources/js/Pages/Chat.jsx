import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, router } from '@inertiajs/react';
import { useEffect, useState, useRef, useCallback } from 'react';
import { MessageCircle, Send, ArrowLeft, Clock, User, X, Bell } from 'lucide-react';

// Notification sound
const playNotificationSound = () => {
    try {
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        // Two short beeps
        [0, 0.15].forEach(delay => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.type = 'sine';
            osc.frequency.value = 800;
            gain.gain.setValueAtTime(0.3, ctx.currentTime + delay);
            gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + delay + 0.12);
            osc.start(ctx.currentTime + delay);
            osc.stop(ctx.currentTime + delay + 0.12);
        });
    } catch (e) {}
};

export default function Chat({ rooms = [], user }) {
    const [selectedRoom, setSelectedRoom] = useState(null);
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [notifications, setNotifications] = useState([]);
    const [totalUnread, setTotalUnread] = useState(0);
    const prevMsgCountRef = useRef(0);
    const chatEndRef = useRef(null);

    // Fetch messages for a room
    const fetchMessages = async (room) => {
        try {
            const res = await fetch(`/api/chat/${room}`);
            const data = await res.json();
            return data;
        } catch (e) {
            return [];
        }
    };

    // Detect new messages and show notification
    const checkNewMessages = useCallback(async (room) => {
        const newMessages = await fetchMessages(room);
        if (newMessages.length > prevMsgCountRef.current && prevMsgCountRef.current > 0) {
            // New message arrived
            const lastMsg = newMessages[newMessages.length - 1];
            if (!lastMsg.is_from_nurse) {
                // Notification from guest
                playNotificationSound();
                const notif = {
                    id: Date.now(),
                    room: room,
                    sender: lastMsg.sender_name,
                    message: lastMsg.message,
                };
                setNotifications(prev => [...prev, notif]);
                // Auto-remove after 5 seconds
                setTimeout(() => {
                    setNotifications(prev => prev.filter(n => n.id !== notif.id));
                }, 5000);

                // Browser notification
                if (Notification.permission === 'granted') {
                    new Notification(`Pesan dari Kamar ${room}`, {
                        body: `${lastMsg.sender_name}: ${lastMsg.message}`,
                        icon: '/mayapada_logo.png',
                    });
                }
            }
        }
        prevMsgCountRef.current = newMessages.length;
        setMessages(newMessages);
    }, []);

    // Select a room
    const selectRoom = async (room) => {
        setSelectedRoom(room);
        const msgs = await fetchMessages(room);
        setMessages(msgs);
        prevMsgCountRef.current = msgs.length;
        // Mark as read
        try {
            await fetch(`/chat/read/${room}`, { method: 'POST', headers: { 'X-Requested-With': 'XMLHttpRequest' } });
        } catch (e) {}
    };

    // Auto-refresh messages
    useEffect(() => {
        if (!selectedRoom) return;
        const interval = setInterval(() => checkNewMessages(selectedRoom), 3000);
        return () => clearInterval(interval);
    }, [selectedRoom, checkNewMessages]);

    // Scroll to bottom
    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    // Request browser notification permission
    useEffect(() => {
        if ('Notification' in window && Notification.permission === 'default') {
            Notification.requestPermission();
        }
    }, []);

    // Send message
    const sendMessage = async (e) => {
        e.preventDefault();
        if (!input.trim() || !selectedRoom) return;
        setLoading(true);
        try {
            await fetch('/chat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.content || '',
                    'X-Requested-With': 'XMLHttpRequest',
                },
                body: JSON.stringify({
                    room_number: selectedRoom,
                    message: input,
                }),
            });
            setInput('');
            fetchMessages(selectedRoom);
        } catch (e) {}
        setLoading(false);
    };

    // Dismiss notification
    const dismissNotification = (id) => {
        setNotifications(prev => prev.filter(n => n.id !== id));
    };

    // Close chat (back to room list)
    const closeChat = () => {
        setSelectedRoom(null);
        setMessages([]);
        prevMsgCountRef.current = 0;
    };

    // Group rooms by room_number with latest message
    const roomList = rooms.map(r => ({
        room_number: r.room_number,
        last_message_at: r.last_message_at,
        unread_count: parseInt(r.unread_count) || 0,
    }));

    return (
        <AuthenticatedLayout
            header={
                <div className="flex items-center gap-3">
                    <MessageCircle size={20} className="text-emerald-600" />
                    <h2 className="text-lg font-bold text-slate-800">Chat dengan Keluarga Pasien</h2>
                </div>
            }
        >
            <Head title="Chat | Mayapada Hospital" />

            {/* Notification Toast */}
            <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 max-w-sm">
                {notifications.map(notif => (
                    <div key={notif.id} className="bg-white border border-emerald-200 rounded-2xl shadow-xl p-4 flex items-start gap-3 animate-[slideIn_0.3s_ease-out]">
                        <div className="bg-emerald-100 p-2 rounded-xl shrink-0">
                            <Bell size={16} className="text-emerald-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Pesan Baru</p>
                            <p className="text-xs font-bold text-slate-800 mt-0.5">Kamar {notif.room} — {notif.sender}</p>
                            <p className="text-[11px] text-slate-500 mt-0.5 truncate">{notif.message}</p>
                        </div>
                        <button onClick={() => dismissNotification(notif.id)} className="p-1 hover:bg-slate-100 rounded-lg transition-colors shrink-0">
                            <X size={14} className="text-slate-400" />
                        </button>
                    </div>
                ))}
            </div>

            <div className="py-4 sm:py-8 px-3 sm:px-6 lg:px-8">
                <div className="max-w-4xl mx-auto">
                    <div className="bg-white rounded-2xl sm:rounded-[24px] border border-slate-200 shadow-sm overflow-hidden" style={{ height: 'calc(100vh - 220px)', minHeight: '500px' }}>
                        <div className="flex h-full">
                            {/* Room List */}
                            <div className={`${selectedRoom ? 'hidden sm:flex' : 'flex'} flex-col w-full sm:w-80 border-r border-slate-200`}>
                                <div className="p-4 border-b border-slate-200 bg-slate-50">
                                    <h3 className="font-bold text-sm text-slate-800">Kamar</h3>
                                    <p className="text-[10px] text-slate-500 font-medium">{roomList.length} percakapan aktif</p>
                                </div>
                                <div className="flex-1 overflow-y-auto">
                                    {roomList.length === 0 && (
                                        <div className="p-6 text-center">
                                            <MessageCircle size={32} className="mx-auto text-slate-300 mb-2" />
                                            <p className="text-slate-400 text-xs font-bold">Belum ada pesan</p>
                                            <p className="text-slate-400 text-[10px] mt-1">Keluarga pasien akan chat Anda di sini</p>
                                        </div>
                                    )}
                                    {roomList.map((room) => (
                                        <button
                                            key={room.room_number}
                                            onClick={() => selectRoom(room.room_number)}
                                            className={`w-full p-4 flex items-center gap-3 hover:bg-slate-50 transition-colors border-b border-slate-100 ${selectedRoom === room.room_number ? 'bg-emerald-50 border-l-4 border-l-emerald-500' : ''}`}
                                        >
                                            <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-700 font-black text-sm shrink-0">
                                                {room.room_number}
                                            </div>
                                            <div className="flex-1 min-w-0 text-left">
                                                <div className="flex justify-between items-center">
                                                    <p className="font-bold text-sm text-slate-800">Kamar {room.room_number}</p>
                                                    {room.unread_count > 0 && (
                                                        <span className="bg-rose-500 text-white text-[9px] font-black px-1.5 py-0.5 rounded-full min-w-[18px] text-center animate-pulse">
                                                            {room.unread_count}
                                                        </span>
                                                    )}
                                                </div>
                                                <p className="text-[10px] text-slate-400 font-medium">
                                                    {new Date(room.last_message_at).toLocaleString('id-ID', { hour: '2-digit', minute: '2-digit', day: 'numeric', month: 'short' })}
                                                </p>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Chat Area */}
                            <div className={`${selectedRoom ? 'flex' : 'hidden sm:flex'} flex-col flex-1`}>
                                {selectedRoom ? (
                                    <>
                                        {/* Chat Header */}
                                        <div className="p-4 border-b border-slate-200 flex items-center gap-3 bg-white">
                                            <button onClick={closeChat} className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors">
                                                <ArrowLeft size={18} />
                                            </button>
                                            <div className="w-9 h-9 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-700 font-black text-sm">
                                                {selectedRoom}
                                            </div>
                                            <div className="flex-1">
                                                <p className="font-bold text-sm text-slate-800">Kamar {selectedRoom}</p>
                                                <p className="text-[10px] text-slate-400 font-medium">Keluarga Pasien</p>
                                            </div>
                                            <button onClick={closeChat} className="p-2 hover:bg-slate-100 rounded-xl transition-colors" title="Tutup Chat">
                                                <X size={18} className="text-slate-400" />
                                            </button>
                                        </div>

                                        {/* Messages */}
                                        <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50">
                                            {messages.length === 0 && (
                                                <div className="text-center py-12">
                                                    <MessageCircle size={40} className="mx-auto text-slate-300 mb-2" />
                                                    <p className="text-slate-400 text-xs font-bold">Belum ada pesan</p>
                                                </div>
                                            )}
                                            {messages.map((msg) => (
                                                <div key={msg.id} className={`flex ${msg.is_from_nurse ? 'justify-end' : 'justify-start'}`}>
                                                    <div className="max-w-[75%]">
                                                        <p className={`text-[9px] font-bold mb-0.5 ${msg.is_from_nurse ? 'text-slate-500 text-right' : 'text-emerald-600'}`}>
                                                            {msg.is_from_nurse ? '👩‍⚕️ Anda' : '👤 ' + msg.sender_name}
                                                        </p>
                                                        <div className={`px-3 py-2 rounded-2xl text-xs font-medium ${msg.is_from_nurse ? 'bg-emerald-500 text-white rounded-tr-sm' : 'bg-white text-slate-800 rounded-tl-sm border border-slate-200'}`}>
                                                            {msg.message}
                                                        </div>
                                                        <p className={`text-[8px] text-slate-400 mt-0.5 ${msg.is_from_nurse ? 'text-right' : ''}`}>
                                                            {new Date(msg.created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                                                        </p>
                                                    </div>
                                                </div>
                                            ))}
                                            <div ref={chatEndRef} />
                                        </div>

                                        {/* Input */}
                                        <form onSubmit={sendMessage} className="p-4 border-t border-slate-200 flex gap-2 bg-white">
                                            <input
                                                type="text"
                                                value={input}
                                                onChange={(e) => setInput(e.target.value)}
                                                placeholder="Balas pesan..."
                                                className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-medium outline-none focus:border-emerald-400 transition-colors"
                                                disabled={loading}
                                            />
                                            <button type="submit" disabled={loading || !input.trim()} className="bg-emerald-500 text-white px-4 py-2.5 rounded-xl hover:bg-emerald-600 transition-colors disabled:opacity-50 active:scale-95 flex items-center gap-2 font-bold text-xs uppercase tracking-widest">
                                                <Send size={14} /> Kirim
                                            </button>
                                        </form>
                                    </>
                                ) : (
                                    <div className="flex-1 flex items-center justify-center">
                                        <div className="text-center">
                                            <MessageCircle size={48} className="mx-auto text-slate-300 mb-3" />
                                            <p className="text-slate-400 font-bold text-sm">Pilih kamar untuk mulai chat</p>
                                            <p className="text-slate-400 text-[10px] mt-1">Pesan dari keluarga pasien akan muncul di sini</p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <style dangerouslySetInnerHTML={{ __html: `
                @keyframes slideIn { 0% { opacity: 0; transform: translateX(100px); } 100% { opacity: 1; transform: translateX(0); } }
            ` }} />
        </AuthenticatedLayout>
    );
}
