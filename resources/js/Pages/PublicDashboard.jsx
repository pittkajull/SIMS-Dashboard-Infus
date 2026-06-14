import GuestLayout from '@/Layouts/GuestLayout';
import { Head, router } from '@inertiajs/react';
import { useEffect, useState, useRef, useCallback } from 'react';
import { Clock, Users, AlertCircle, Stethoscope, Search, MessageCircle, Send, X, Bell } from 'lucide-react';
import InfusionBag from '@/Components/InfusionBag';

// Notification sound for guest
const playNotificationSound = () => {
    try {
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        [0, 0.15].forEach(delay => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.type = 'sine';
            osc.frequency.value = 660;
            gain.gain.setValueAtTime(0.3, ctx.currentTime + delay);
            gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + delay + 0.12);
            osc.start(ctx.currentTime + delay);
            osc.stop(ctx.currentTime + delay + 0.12);
        });
    } catch (e) {}
};

export default function PublicDashboard() {
    const [roomNumber, setRoomNumber] = useState('');
    const [searchedRoom, setSearchedRoom] = useState('');
    const [infusions, setInfusions] = useState([]);
    const [loading, setLoading] = useState(false);
    const [currentTime, setCurrentTime] = useState(new Date());

    // Chat state
    const [isChatOpen, setIsChatOpen] = useState(false);
    const [chatRoom, setChatRoom] = useState('');
    const [chatMessages, setChatMessages] = useState([]);
    const [chatInput, setChatInput] = useState('');
    const [senderName, setSenderName] = useState('');
    const [chatLoading, setChatLoading] = useState(false);
    const [chatNotifications, setChatNotifications] = useState([]);
    const chatEndRef = useRef(null);
    const prevMsgCountRef = useRef(0);

    // Fetch infusions for a room
    const searchRoom = async () => {
        if (!roomNumber.trim()) return;
        setLoading(true);
        setSearchedRoom(roomNumber.trim());
        try {
            const res = await fetch(`/api/public/infusions/${roomNumber.trim()}`);
            const data = await res.json();
            setInfusions(data);
        } catch (e) {
            setInfusions([]);
        }
        setLoading(false);
    };

    // Auto-refresh infusions
    useEffect(() => {
        if (!searchedRoom) return;
        const interval = setInterval(async () => {
            try {
                const res = await fetch(`/api/public/infusions/${searchedRoom}`);
                const data = await res.json();
                setInfusions(data);
            } catch (e) {}
        }, 3000);
        return () => clearInterval(interval);
    }, [searchedRoom]);

    // Clock
    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    // Fetch chat messages with notification detection
    const fetchMessages = useCallback(async (room) => {
        try {
            const res = await fetch(`/api/chat/${room}`);
            const data = await res.json();

            // Detect new nurse messages
            if (data.length > prevMsgCountRef.current && prevMsgCountRef.current > 0) {
                const lastMsg = data[data.length - 1];
                if (lastMsg.is_from_nurse) {
                    playNotificationSound();
                    const notif = {
                        id: Date.now(),
                        message: lastMsg.message,
                        sender: lastMsg.sender_name,
                    };
                    setChatNotifications(prev => [...prev, notif]);
                    setTimeout(() => {
                        setChatNotifications(prev => prev.filter(n => n.id !== notif.id));
                    }, 5000);
                }
            }
            prevMsgCountRef.current = data.length;
            setChatMessages(data);
        } catch (e) {}
    }, []);

    // Open chat for a room
    const openChat = (room) => {
        setChatRoom(room);
        setIsChatOpen(true);
        prevMsgCountRef.current = 0;
        fetchMessages(room);
    };

    // Close chat
    const closeChat = () => {
        setIsChatOpen(false);
        setChatRoom('');
        setChatMessages([]);
        setChatInput('');
        prevMsgCountRef.current = 0;
    };

    // Auto-refresh chat
    useEffect(() => {
        if (!isChatOpen || !chatRoom) return;
        const interval = setInterval(() => fetchMessages(chatRoom), 3000);
        return () => clearInterval(interval);
    }, [isChatOpen, chatRoom, fetchMessages]);

    // Scroll chat to bottom
    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [chatMessages]);

    // Send message
    const sendMessage = async (e) => {
        e.preventDefault();
        if (!chatInput.trim() || !senderName.trim()) return;
        setChatLoading(true);
        try {
            await fetch('/api/chat/guest', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
                body: JSON.stringify({
                    room_number: chatRoom,
                    sender_name: senderName,
                    message: chatInput,
                }),
            });
            setChatInput('');
            fetchMessages(chatRoom);
        } catch (e) {}
        setChatLoading(false);
    };

    // Dismiss notification
    const dismissNotification = (id) => {
        setChatNotifications(prev => prev.filter(n => n.id !== id));
    };

    const criticalCount = infusions.filter(i => i.status === 'warning').length;
    const formattedTime = currentTime.toLocaleTimeString('id-ID', { hour12: false });

    return (
        <GuestLayout fullWidth>
            <Head title="Dashboard Publik | Mayapada Hospital" />

            <div className="min-h-screen">
                {/* Header */}
                <div className="bg-white/90 backdrop-blur-2xl border-b border-slate-200 sticky top-0 z-30">
                    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                        <div className="flex items-center gap-4">
                            <div className="bg-white p-2 rounded-xl shadow-sm border border-slate-200">
                                <img src="/mayapada_logo.png" alt="Mayapada Hospital" className="h-8 object-contain" />
                            </div>
                            <div>
                                <div className="flex items-center gap-2">
                                    <h2 className="font-black text-lg tracking-tighter text-slate-800">MAYAPADA HOSPITAL</h2>
                                    <span className="px-2 py-0.5 rounded-md bg-blue-50 text-blue-600 text-[8px] font-black tracking-widest border border-blue-100 uppercase">Public</span>
                                </div>
                                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.2em] flex items-center gap-1.5 mt-1">
                                    <Stethoscope size={10} className="text-emerald-500" /> Smart Infusion Monitoring
                                </p>
                            </div>
                        </div>
                        <div className="bg-white px-3 py-1.5 rounded-full border border-slate-200 flex items-center gap-2 text-xs font-mono font-bold text-slate-700 shadow-sm">
                            <Clock size={12} className="text-emerald-500" /> {formattedTime} <span className="text-[9px] text-slate-400">WIB</span>
                        </div>
                    </div>
                </div>

                {/* Chat Notifications Toast (outside chat modal) */}
                <div className="fixed top-20 right-4 z-[110] flex flex-col gap-2 max-w-xs">
                    {chatNotifications.map(notif => (
                        <div key={notif.id} className="bg-white border border-emerald-200 rounded-2xl shadow-xl p-3 flex items-start gap-3 animate-[slideIn_0.3s_ease-out]">
                            <div className="bg-emerald-100 p-1.5 rounded-lg shrink-0">
                                <Bell size={14} className="text-emerald-600" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-[9px] font-black text-emerald-600 uppercase tracking-widest">Balasan Suster</p>
                                <p className="text-[11px] text-slate-600 mt-0.5 truncate">{notif.message}</p>
                            </div>
                            <button onClick={() => dismissNotification(notif.id)} className="p-0.5 hover:bg-slate-100 rounded transition-colors shrink-0">
                                <X size={12} className="text-slate-400" />
                            </button>
                        </div>
                    ))}
                </div>

                <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
                    {/* Room Search */}
                    {!searchedRoom && (
                        <div className="flex flex-col items-center justify-center py-16 sm:py-24">
                            <div className="bg-emerald-50 p-4 sm:p-5 rounded-2xl text-emerald-600 mb-5 border border-emerald-100">
                                <Search size={28} />
                            </div>
                            <h1 className="text-xl sm:text-2xl font-black text-slate-800 tracking-tight mb-2">Cari Status Infus</h1>
                            <p className="text-slate-500 text-xs sm:text-sm font-medium mb-6 text-center max-w-sm">
                                Masukkan nomor kamar/bed untuk melihat status cairan infus pasien
                            </p>
                            <form onSubmit={(e) => { e.preventDefault(); searchRoom(); }} className="flex gap-2 w-full max-w-md">
                                <input
                                    type="text"
                                    value={roomNumber}
                                    onChange={(e) => setRoomNumber(e.target.value)}
                                    placeholder="Contoh: 101, A2, dll"
                                    className="flex-1 bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold outline-none focus:border-emerald-400 transition-colors"
                                    autoFocus
                                />
                                <button type="submit" className="bg-emerald-500 text-white px-6 py-3 rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-emerald-600 transition-colors active:scale-95 flex items-center gap-2">
                                    <Search size={14} /> Cari
                                </button>
                            </form>
                        </div>
                    )}

                    {/* Results */}
                    {searchedRoom && (
                        <>
                            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-3">
                                <div>
                                    <div className="flex items-center gap-2 mb-1">
                                        <h1 className="text-xl sm:text-2xl font-black text-slate-800 tracking-tight">Kamar {searchedRoom}</h1>
                                        <button onClick={() => { setSearchedRoom(''); setInfusions([]); setRoomNumber(''); }} className="text-[10px] font-bold text-slate-400 hover:text-slate-600 underline">Ganti Kamar</button>
                                    </div>
                                    <p className="text-slate-500 text-xs sm:text-sm font-medium">Status infus pasien di kamar ini</p>
                                </div>
                                <div className="flex items-center gap-3">
                                    <div className="bg-white px-3 py-1.5 rounded-full border border-slate-200 flex items-center gap-2 text-xs font-bold text-slate-700 shadow-sm">
                                        <Users size={12} className="text-emerald-500" /> {infusions.length} Pasien
                                    </div>
                                    {criticalCount > 0 && (
                                        <div className="bg-rose-50 px-3 py-1.5 rounded-full border border-rose-200 flex items-center gap-2 text-xs font-bold text-rose-600 shadow-sm animate-pulse">
                                            <AlertCircle size={12} /> {criticalCount} Kritis
                                        </div>
                                    )}
                                </div>
                            </div>

                            {infusions.length === 0 && !loading && (
                                <div className="text-center py-16">
                                    <p className="text-slate-400 font-bold text-sm">Tidak ada pasien aktif di kamar {searchedRoom}</p>
                                </div>
                            )}

                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                                {infusions.map((item) => (
                                    <div key={item.id} className={`rounded-2xl sm:rounded-[32px] p-4 sm:p-6 border transition-all ${item.status === 'warning' ? 'bg-rose-50 border-rose-200 shadow-md' : item.device_status === 'offline' ? 'bg-orange-50/50 border-orange-200 shadow-sm' : 'bg-white border-slate-200 shadow-sm hover:shadow-lg'}`}>
                                        <div className="flex justify-between items-start mb-4 sm:mb-6">
                                            <div className="flex items-start gap-3 sm:gap-4">
                                                <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-lg sm:rounded-xl flex items-center justify-center font-black text-base sm:text-lg ${item.status === 'warning' ? 'bg-rose-500 text-white' : 'bg-slate-100 text-slate-700'}`}>{item.room_number}</div>
                                                <div>
                                                    <h3 className="text-base sm:text-lg font-bold text-slate-800 line-clamp-1">{item.patient_name}</h3>
                                                    <p className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-widest">{item.fluid_type} • {item.drip_type}</p>
                                                    <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                                                        {item.infusion_number > 1 && (
                                                            <span className="px-2 py-0.5 rounded-md bg-amber-50 text-amber-600 text-[8px] sm:text-[9px] font-black tracking-widest border border-amber-100 uppercase">
                                                                Infus ke-{item.infusion_number}
                                                            </span>
                                                        )}
                                                        {item.device_status === 'online' && (
                                                            <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-600 text-[8px] sm:text-[9px] font-black tracking-widest border border-emerald-100 uppercase flex items-center gap-1">
                                                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span> Online
                                                            </span>
                                                        )}
                                                        {item.device_status === 'offline' && (
                                                            <span className="px-2 py-0.5 rounded-md bg-orange-50 text-orange-600 text-[8px] sm:text-[9px] font-black tracking-widest border border-orange-100 uppercase">
                                                                Offline
                                                            </span>
                                                        )}
                                                        {item.status === 'warning' && (
                                                            <span className="px-2 py-0.5 rounded-md bg-rose-50 text-rose-600 text-[8px] sm:text-[9px] font-black tracking-widest border border-rose-100 uppercase animate-pulse">
                                                                ⚠ Kritis
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        <div className={`p-3 sm:p-5 rounded-xl sm:rounded-2xl border ${item.status === 'warning' ? 'bg-white border-rose-100' : item.device_status === 'offline' ? 'bg-orange-50/30 border-orange-100' : 'bg-slate-50 border-slate-100'}`}>
                                            <div className="flex items-center gap-3 sm:gap-4">
                                                <div className="shrink-0">
                                                    <InfusionBag percentage={item.percentage_remaining} status={item.device_status === 'offline' ? 'offline' : item.status} size={60} />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    {(item.device_status === 'no_device' || item.device_status === 'no_data') ? (
                                                        <div className="py-2 text-center">
                                                            <p className="text-xs font-bold text-slate-400">
                                                                {item.device_status === 'no_device' ? '⚠ Belum Terkoneksi Device' : '📡 Menunggu Data dari Sensor...'}
                                                            </p>
                                                        </div>
                                                    ) : (
                                                        <>
                                                            <div className="flex justify-between items-end mb-2 sm:mb-3">
                                                                <div><p className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase mb-0.5">Volume Sisa</p><p className={`text-xl sm:text-2xl font-black ${item.status === 'warning' ? 'text-rose-600' : item.device_status === 'offline' ? 'text-orange-600' : 'text-slate-800'}`}>{item.current_remaining} <span className="text-[10px] sm:text-xs">ml</span></p></div>
                                                                <div className="text-right"><p className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase mb-0.5">TPM</p><p className={`text-lg sm:text-xl font-black ${item.tpm_actual <= 0 ? 'text-rose-500' : 'text-slate-800'}`}>{item.tpm_actual} <span className="text-[10px] sm:text-xs">tpm</span></p></div>
                                                            </div>
                                                            <div className="h-1.5 sm:h-2 bg-slate-200 rounded-full overflow-hidden">
                                                                <div className={`h-full transition-all duration-1000 ${item.status === 'warning' ? 'bg-rose-500' : item.device_status === 'offline' ? 'bg-orange-400' : 'bg-emerald-500'}`} style={{ width: `${item.percentage_remaining}%` }}></div>
                                                            </div>
                                                            <div className="flex justify-between mt-1.5 sm:mt-2 text-[9px] sm:text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                                                                <span><Clock size={10} className="inline mr-1" /> {item.estimated_time_remaining}</span>
                                                                <span>{item.flowrate} ml/h</span>
                                                            </div>
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Chat Button */}
                                        <button onClick={() => openChat(item.room_number)} className="w-full mt-3 py-2.5 sm:py-3.5 rounded-lg sm:rounded-xl border border-emerald-200 flex items-center justify-center gap-2 text-[9px] sm:text-[10px] font-bold uppercase tracking-widest hover:bg-emerald-50 hover:text-emerald-600 hover:border-emerald-300 transition-all bg-white shadow-sm">
                                            <MessageCircle size={14} /> Chat Suster
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </>
                    )}
                </div>

                {/* Chat Modal */}
                {isChatOpen && (
                    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4">
                        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md" onClick={closeChat}></div>
                        <div className="bg-white sm:rounded-2xl shadow-2xl w-full sm:max-w-md h-[85vh] sm:h-[600px] relative z-10 flex flex-col animate-[slideUp_0.3s_ease-out]">
                            {/* Chat Header */}
                            <div className="bg-emerald-500 text-white p-4 flex items-center gap-3 shrink-0 sm:rounded-t-2xl">
                                <div className="bg-white/20 p-2 rounded-xl">
                                    <MessageCircle size={18} />
                                </div>
                                <div className="flex-1">
                                    <h3 className="font-bold text-sm">Chat Suster</h3>
                                    <p className="text-emerald-100 text-[10px]">Kamar {chatRoom}</p>
                                </div>
                                <button onClick={closeChat} className="p-1.5 hover:bg-white/20 rounded-lg transition-colors" title="Tutup Chat">
                                    <X size={18} />
                                </button>
                            </div>

                            {/* Name Input (if not set) */}
                            {!senderName && (
                                <div className="p-4 border-b border-slate-200 bg-slate-50">
                                    <label className="text-[10px] font-bold text-slate-500 mb-1.5 block uppercase tracking-widest">Nama Anda</label>
                                    <input
                                        type="text"
                                        value={senderName}
                                        onChange={(e) => setSenderName(e.target.value)}
                                        placeholder="Masukkan nama Anda"
                                        className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold outline-none focus:border-emerald-400"
                                        autoFocus
                                    />
                                </div>
                            )}

                            {/* Messages */}
                            <div className="flex-1 overflow-y-auto p-4 space-y-3">
                                {chatMessages.length === 0 && (
                                    <div className="text-center py-8">
                                        <MessageCircle size={32} className="mx-auto text-slate-300 mb-2" />
                                        <p className="text-slate-400 text-xs font-bold">Belum ada pesan</p>
                                        <p className="text-slate-400 text-[10px]">Kirim pesan untuk memberi tahu suster</p>
                                    </div>
                                )}
                                {chatMessages.map((msg) => (
                                    <div key={msg.id} className={`flex ${msg.is_from_nurse ? 'justify-start' : 'justify-end'}`}>
                                        <div className={`max-w-[80%] ${msg.is_from_nurse ? '' : ''}`}>
                                            <p className={`text-[9px] font-bold mb-0.5 ${msg.is_from_nurse ? 'text-emerald-600' : 'text-slate-500 text-right'}`}>
                                                {msg.is_from_nurse ? '👩‍⚕️ ' + msg.sender_name : msg.sender_name}
                                            </p>
                                            <div className={`px-3 py-2 rounded-2xl text-xs font-medium ${msg.is_from_nurse ? 'bg-slate-100 text-slate-800 rounded-tl-sm' : 'bg-emerald-500 text-white rounded-tr-sm'}`}>
                                                {msg.message}
                                            </div>
                                            <p className={`text-[8px] text-slate-400 mt-0.5 ${msg.is_from_nurse ? '' : 'text-right'}`}>
                                                {new Date(msg.created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                                <div ref={chatEndRef} />
                            </div>

                            {/* Input */}
                            {senderName && (
                                <form onSubmit={sendMessage} className="p-3 border-t border-slate-200 flex gap-2 shrink-0">
                                    <input
                                        type="text"
                                        value={chatInput}
                                        onChange={(e) => setChatInput(e.target.value)}
                                        placeholder="Ketik pesan..."
                                        className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-medium outline-none focus:border-emerald-400"
                                        disabled={chatLoading}
                                    />
                                    <button type="submit" disabled={chatLoading || !chatInput.trim()} className="bg-emerald-500 text-white p-2.5 rounded-xl hover:bg-emerald-600 transition-colors disabled:opacity-50 active:scale-95">
                                        <Send size={16} />
                                    </button>
                                </form>
                            )}
                        </div>
                    </div>
                )}

                <style dangerouslySetInnerHTML={{ __html: `
                    @keyframes slideUp { 0% { opacity: 0; transform: translateY(100%); } 100% { opacity: 1; transform: translateY(0); } }
                    @keyframes slideIn { 0% { opacity: 0; transform: translateX(100px); } 100% { opacity: 1; transform: translateX(0); } }
                ` }} />
            </div>
        </GuestLayout>
    );
}
