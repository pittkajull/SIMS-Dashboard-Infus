import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, router, useForm, Link } from '@inertiajs/react';
import { useEffect, useState, useRef } from 'react';
import { Activity, Droplet, AlertCircle, Users, Clock, Plus, X, FileText, Trash2, LogOut, HeartPulse, Stethoscope, Bell, XCircle } from 'lucide-react';

export default function Dashboard({ auth, infusions = [] }) {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [currentTime, setCurrentTime] = useState(new Date());
    const [activeNotifications, setActiveNotifications] = useState([]);
    const previousInfusionsRef = useRef([]);

    // 1. Refresh data otomatis tiap 2 detik
    useEffect(() => {
        const interval = setInterval(() => {
            router.reload({ only: ['infusions'], preserveScroll: true });
        }, 2000);
        return () => clearInterval(interval);
    }, []);

    // 2. Jam Real-time
    useEffect(() => {
        const timer = setInterval(() => {
            setCurrentTime(new Date());
        }, 1000);
        return () => clearInterval(timer);
    }, []);

    // 3. Logika Notifikasi Kritis
    useEffect(() => {
        const previousIds = previousInfusionsRef.current.map(i => i.id);
        const currentCritical = infusions.filter(i => i.status === 'warning');
        const newCritical = currentCritical.filter(i => !previousIds.includes(i.id));

        if (newCritical.length > 0) {
            const audio = new Audio('https://www.soundjay.com/misc/sounds/bell-ringing-05.mp3');
            audio.play().catch(e => console.log('Audio play failed:', e));

            const notifs = newCritical.map(item => ({
                id: item.id,
                message: `Peringatan: Cairan Infus Bed ${item.room_number} (${item.patient_name}) Hampir Habis!`,
                timestamp: new Date(),
            }));
            setActiveNotifications(prev => [...prev, ...notifs]);
        }
        previousInfusionsRef.current = infusions;
    }, [infusions]);

    const dismissNotification = (id) => {
        setActiveNotifications(prev => prev.filter(n => n.id !== id));
    };

    // 4. Form Management
    const { data, setData, post, processing, reset, errors } = useForm({
        patient_name: '', 
        room_number: '', 
        fluid_type: 'RL',
        total_volume: 500, 
        flowrate: 60, 
        drip_type: 'Makro',
    });

    const submit = (e) => {
        e.preventDefault();
        post(route('infusions.store'), { 
            onSuccess: () => { 
                setIsModalOpen(false); 
                reset();
                // Paksa refresh data agar langsung muncul di grid
                router.reload({ only: ['infusions'] });
            },
            preserveScroll: true
        });
    };

    const totalPatients = infusions.length;
    const criticalCount = infusions.filter(i => i.status === 'warning').length;
    const formattedTime = currentTime.toLocaleTimeString('id-ID', { hour12: false });
    const formattedDate = currentTime.toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

    return (
        <AuthenticatedLayout
            user={auth.user}
            header={
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center w-full gap-5 relative z-20">
                    <div className="flex items-center gap-5">
                        <div className="relative group">
                            <div className="absolute inset-0 bg-emerald-400 blur-lg opacity-20 group-hover:opacity-40 transition-opacity duration-500 rounded-2xl"></div>
                            <div className="relative bg-white p-3.5 rounded-2xl shadow-sm border border-slate-200">
                                <Activity className="text-emerald-500 animate-pulse" size={28} strokeWidth={2.5} />
                            </div>
                        </div>
                        <div>
                            <div className="flex items-center gap-3">
                                <h2 className="font-black text-3xl tracking-tighter text-slate-800 leading-none">RSUD BANTEN</h2>
                                <span className="px-2.5 py-1 rounded-md bg-emerald-50 text-emerald-600 text-[9px] font-black tracking-widest uppercase border border-emerald-100">Live</span>
                            </div>
                            <p className="text-[11px] text-slate-500 font-bold uppercase tracking-[0.3em] mt-2 flex items-center gap-2">
                                <Stethoscope size={12} className="text-emerald-500" /> Smart Infusion Monitoring System
                            </p>
                        </div>
                    </div>
                    
                    <div className="flex items-center gap-3 sm:gap-5 w-full md:w-auto justify-between md:justify-end">
                        <div className="flex items-center gap-3 bg-white/80 backdrop-blur-md px-4 py-2.5 rounded-2xl border border-slate-200 shadow-sm">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white font-bold text-xs shadow-sm border-2 border-white">
                                {auth.user.name.charAt(0)}
                            </div>
                            <div className="hidden sm:block">
                                <p className="text-sm font-bold text-slate-700 leading-none">{auth.user.name}</p>
                                <p className="text-[10px] text-emerald-600 font-bold uppercase tracking-wider mt-1">Nursing Staff</p>
                            </div>
                        </div>
                        
                        <button onClick={() => setIsModalOpen(true)} className="relative group overflow-hidden bg-white text-emerald-600 px-5 py-3 rounded-2xl font-bold text-xs uppercase tracking-widest transition-all shadow-sm hover:shadow-md active:scale-95 flex items-center gap-2 border border-slate-200 hover:border-emerald-200 hover:bg-emerald-50">
                            <Plus size={16} strokeWidth={2.5} className="text-emerald-500 group-hover:rotate-90 transition-transform duration-300" />
                            <span className="hidden sm:inline relative z-10">Pasien Baru</span>
                        </button>
                        
                        <Link href={route('logout')} method="post" as="button" className="p-3 bg-white/80 backdrop-blur-md text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-2xl transition-all border border-slate-200 shadow-sm hover:border-rose-100 group">
                            <LogOut size={18} className="group-hover:-translate-x-0.5 transition-transform" />
                        </Link>
                    </div>
                </div>
            }
        >
            <Head title="Monitoring Center | RSUD BANTEN" />

            <div className="py-8 px-4 sm:px-6 lg:px-8">
                
                {/* Header Section */}
                <div className="flex flex-col sm:flex-row justify-between items-end mb-8 gap-4">
                    <div>
                        <h1 className="text-2xl font-black text-slate-800 tracking-tight">Monitoring Dashboard</h1>
                        <p className="text-slate-500 text-sm font-medium mt-1">Pantau status cairan infus pasien secara real-time</p>
                    </div>
                    <div className="bg-white/80 backdrop-blur-xl rounded-full px-4 py-1.5 border border-slate-200 shadow-sm flex items-center justify-center">
                        <div className="hidden sm:flex items-center border-r border-slate-200 pr-3 mr-3 h-4">
                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest leading-none">{formattedDate}</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <Clock size={13} className="text-emerald-500 animate-pulse" />
                            <span className="text-sm font-mono font-black text-slate-700 tracking-wider leading-none">{formattedTime}</span>
                            <span className="text-[10px] text-slate-500 font-bold tracking-widest leading-none">WIB</span>
                        </div>
                    </div>
                </div>

                {/* STATS AREA */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
                    <div className="bg-white rounded-[24px] border border-slate-200 p-6 flex flex-col justify-between h-40 shadow-sm">
                        <div className="flex justify-between items-start">
                            <div>
                                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Total Pasien</p>
                                <p className="text-5xl font-black text-slate-800 tracking-tighter">{totalPatients}</p>
                            </div>
                            <div className="bg-emerald-50 p-3.5 rounded-2xl text-emerald-600 border border-emerald-100">
                                <Users size={24} />
                            </div>
                        </div>
                        <div className="text-xs font-bold text-emerald-600 bg-emerald-50 w-max px-3 py-1.5 rounded-lg border border-emerald-100">
                             Active Monitoring
                        </div>
                    </div>

                    <div className="bg-white rounded-[24px] border border-slate-200 p-6 flex flex-col justify-between h-40 shadow-sm">
                        <div className="flex justify-between items-start">
                            <div>
                                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Status Kritis</p>
                                <p className={`text-5xl font-black tracking-tighter ${criticalCount > 0 ? 'text-rose-600' : 'text-slate-800'}`}>{criticalCount}</p>
                            </div>
                            <div className={`p-3.5 rounded-2xl border ${criticalCount > 0 ? 'bg-rose-50 text-rose-600 border-rose-100 animate-pulse' : 'bg-slate-50 text-slate-400'}`}>
                                <AlertCircle size={24} />
                            </div>
                        </div>
                        <div className="text-xs font-bold">
                            {criticalCount > 0 ? <span className="text-rose-600">Butuh Perhatian!</span> : <span className="text-slate-500">Normal</span>}
                        </div>
                    </div>
                </div>

                {/* PATIENT GRID */}
                {infusions.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-24 bg-white rounded-[32px] border border-slate-200 shadow-sm border-dashed">
                        <HeartPulse size={40} className="text-emerald-500 mb-4" />
                        <h3 className="text-xl font-black text-slate-800 mb-2">Belum Ada Pasien</h3>
                        <p className="text-slate-500 text-sm mb-8">Tambahkan pasien baru untuk mulai memantau.</p>
                        <button onClick={() => setIsModalOpen(true)} className="bg-emerald-500 text-white px-8 py-3.5 rounded-2xl font-bold uppercase text-xs tracking-widest">
                            Tambah Pasien Baru
                        </button>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {infusions.map((item) => (
                            <div key={item.id} className={`rounded-[32px] p-6 border transition-all ${item.status === 'warning' ? 'bg-rose-50 border-rose-200 shadow-md' : 'bg-white border-slate-200 shadow-sm'}`}>
                                <div className="flex justify-between items-start mb-6">
                                    <div className="flex items-start gap-4">
                                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-black text-lg ${item.status === 'warning' ? 'bg-rose-500 text-white' : 'bg-slate-100 text-slate-700'}`}>
                                            {item.room_number}
                                        </div>
                                        <div>
                                            <h3 className="text-lg font-bold text-slate-800 line-clamp-1">{item.patient_name}</h3>
                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                                {item.fluid_type} • {item.drip_type}
                                            </p>
                                        </div>
                                    </div>
                                    <button onClick={() => confirm(`Selesaikan monitoring?`) && router.delete(route('infusions.destroy', item.id))} className="p-2 text-slate-300 hover:text-rose-500 transition-colors">
                                        <X size={18} />
                                    </button>
                                </div>

                                <div className={`p-5 rounded-2xl border ${item.status === 'warning' ? 'bg-white border-rose-100' : 'bg-slate-50 border-slate-100'}`}>
                                    <div className="flex justify-between items-end mb-4">
                                        <div>
                                            <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Volume Sisa</p>
                                            <p className={`text-3xl font-black ${item.status === 'warning' ? 'text-rose-600' : 'text-slate-800'}`}>{item.current_remaining} <span className="text-xs">ml</span></p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Rate</p>
                                            <p className="text-2xl font-black text-slate-800">{item.tpm_calculated} <span className="text-xs">tpm</span></p>
                                        </div>
                                    </div>
                                    <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                                        <div className={`h-full transition-all duration-1000 ${item.status === 'warning' ? 'bg-rose-500' : 'bg-emerald-500'}`} style={{ width: `${item.percentage_remaining}%` }}></div>
                                    </div>
                                    <div className="flex justify-between mt-3 text-[10px] font-bold text-slate-500">
                                        <span className="flex items-center gap-1"><Clock size={10}/> {item.estimated_time_remaining}</span>
                                        <span>{item.flowrate} ml/h</span>
                                    </div>
                                </div>

                                <Link href={route('infusions.recap', item.id)} className="w-full mt-4 py-3 rounded-xl border border-slate-200 flex items-center justify-center gap-2 text-[10px] font-bold uppercase tracking-widest hover:bg-slate-50 transition-colors">
                                    <FileText size={14} /> Lihat Charting
                                </Link>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* MODAL INPUT (FIXED SCROLL) */}
            {isModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-md" onClick={() => setIsModalOpen(false)}></div>
                    
                    <div className="bg-white rounded-[32px] shadow-2xl w-full max-w-xl relative z-10 flex flex-col max-h-[90vh] overflow-hidden animate-[popIn_0.3s_ease-out]">
                        
                        {/* Header Modal */}
                        <div className="bg-slate-50 border-b border-slate-200 p-6 text-center shrink-0">
                            <button onClick={() => setIsModalOpen(false)} className="absolute top-4 right-4 p-2 bg-white rounded-full text-slate-400 hover:text-rose-500 border border-slate-200 transition-colors">
                                <X size={20} />
                            </button>
                            <h3 className="text-xl font-black text-slate-800">Setup Pasien Baru</h3>
                            <p className="text-slate-500 text-xs mt-1">Lengkapi data untuk memulai monitoring</p>
                        </div>
                        
                        {/* Body Modal (SCROLLABLE) */}
                        <div className="p-8 overflow-y-auto">
                            <form onSubmit={submit} className="space-y-6">
                                <div className="grid grid-cols-2 gap-6">
                                    <div>
                                        <label className="text-[10px] font-bold text-slate-500 uppercase block mb-2 tracking-widest">Nama Lengkap</label>
                                        <input required type="text" value={data.patient_name} onChange={e => setData('patient_name', e.target.value)} className="w-full bg-slate-50 border-slate-200 rounded-2xl px-5 py-4 text-sm font-bold text-slate-800 outline-none focus:bg-white focus:border-emerald-400" placeholder="Nama pasien..." />
                                        {errors.patient_name && <p className="text-rose-500 text-[10px] mt-1">{errors.patient_name}</p>}
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-bold text-slate-500 uppercase block mb-2 tracking-widest">Nomor Bed</label>
                                        <input required type="text" value={data.room_number} onChange={e => setData('room_number', e.target.value)} className="w-full bg-slate-50 border-slate-200 rounded-2xl px-5 py-4 text-sm font-bold text-slate-800 outline-none focus:bg-white focus:border-emerald-400" placeholder="204A" />
                                        {errors.room_number && <p className="text-rose-500 text-[10px] mt-1">{errors.room_number}</p>}
                                    </div>
                                </div>
                                
                                <div className="grid grid-cols-2 gap-6">
                                    <div>
                                        <label className="text-[10px] font-bold text-slate-500 uppercase block mb-2 tracking-widest">Jenis Cairan</label>
                                        <select value={data.fluid_type} onChange={e => setData('fluid_type', e.target.value)} className="w-full bg-slate-50 border-slate-200 rounded-2xl px-5 py-4 text-sm font-bold text-slate-800 outline-none focus:bg-white focus:border-emerald-400">
                                            <option value="RL">RL (Ringer Laktat)</option>
                                            <option value="NaCl">NaCl 0.9%</option>
                                            <option value="Dextrose">Dextrose 5%</option>
                                            <option value="Asering">Asering</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-bold text-slate-500 uppercase block mb-2 tracking-widest">Flow Rate (ml/h)</label>
                                        <input required type="number" value={data.flowrate} onChange={e => setData('flowrate', e.target.value)} className="w-full bg-slate-50 border-slate-200 rounded-2xl px-5 py-4 text-sm font-bold text-slate-800 outline-none focus:bg-white focus:border-emerald-400" />
                                    </div>
                                </div>
                                
                                <div className="bg-slate-50 p-5 rounded-[24px] border border-slate-200">
                                    <label className="text-[10px] font-bold text-slate-500 uppercase block mb-3 text-center tracking-widest">Volume Total (ml)</label>
                                    <div className="flex gap-2 mb-3">
                                        {[100, 250, 500].map(v => (
                                            <button key={v} type="button" onClick={() => setData('total_volume', v)} className={`flex-1 py-2 rounded-xl border-2 font-bold text-xs transition-all ${data.total_volume == v ? 'border-emerald-400 bg-emerald-50 text-emerald-600 shadow-sm' : 'border-slate-200 text-slate-500 bg-white hover:border-slate-300'}`}>{v}</button>
                                        ))}
                                    </div>
                                    <div className="relative">
                                        <input required type="number" value={data.total_volume} onChange={e => setData('total_volume', e.target.value)} className="w-full bg-white border-slate-200 rounded-xl px-5 py-3 text-center text-xl font-black text-slate-800 focus:border-emerald-400 outline-none" />
                                        <span className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">ML</span>
                                    </div>
                                </div>
                                
                                <div className="bg-slate-50 p-5 rounded-[24px] border border-slate-200">
                                    <label className="text-[10px] font-bold text-slate-500 uppercase block mb-3 text-center tracking-widest">Tipe Infus Set</label>
                                    <div className="flex gap-4">
                                        {['Makro', 'Mikro'].map(t => (
                                            <button key={t} type="button" onClick={() => setData('drip_type', t)} className={`flex-1 py-4 rounded-xl font-black text-xs uppercase tracking-widest transition-all border-2 ${data.drip_type === t ? 'bg-white border-emerald-500 text-emerald-600 shadow-sm' : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300'}`}>{t} Set</button>
                                        ))}
                                    </div>
                                </div>
                                
                                <button disabled={processing} className="w-full bg-gradient-to-r from-emerald-500 to-teal-600 text-white py-5 rounded-[20px] font-black text-sm uppercase tracking-widest shadow-lg active:scale-[0.98] transition-all disabled:opacity-70 flex items-center justify-center gap-3">
                                    {processing ? 'Memproses Data...' : 'Mulai Monitoring'}
                                </button>
                            </form>
                        </div>
                    </div>
                </div>
            )}

            {/* NOTIFIKASI KRITIS AREA */}
            <div className="fixed bottom-6 right-6 z-50 space-y-4">
                {activeNotifications.map(notif => (
                    <div key={notif.id} className="bg-white border-rose-200 border rounded-2xl shadow-xl p-5 flex items-start gap-4 max-w-sm animate-bounce">
                        <Bell className="text-rose-500 shrink-0" />
                        <div>
                            <p className="text-xs font-bold text-rose-600">Peringatan Kritis!</p>
                            <p className="text-sm font-bold text-slate-800">{notif.message}</p>
                            <button onClick={() => dismissNotification(notif.id)} className="text-[10px] font-bold text-slate-400 mt-2 hover:text-slate-600">Dismiss</button>
                        </div>
                    </div>
                ))}
            </div>

            <style jsx global>{`
                @keyframes popIn {
                    0% { opacity: 0; transform: scale(0.9) translateY(20px); }
                    100% { opacity: 1; transform: scale(1) translateY(0); }
                }
            `}</style>
        </AuthenticatedLayout>
    );
}