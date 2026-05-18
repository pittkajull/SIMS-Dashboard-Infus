import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link } from '@inertiajs/react';
import { useState } from 'react';
import { ChevronLeft, Clock, Activity, Droplet, FileText, Calendar, TrendingDown, Download, Filter, CheckCircle2 } from 'lucide-react';

export default function Recap({ auth, infusion, logs }) {
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');

    // Filter logs berdasarkan tanggal
    const filteredLogs = logs.filter(log => {
        const logDate = new Date(log.created_at).toISOString().split('T')[0];
        if (startDate && logDate < startDate) return false;
        if (endDate && logDate > endDate) return false;
        return true;
    });

    // Hitung total volume dari logs yang difilter
    const totalVolumeAdministered = filteredLogs.reduce((sum, log) => sum + (log.volume_recorded || 0), 0);

    // Hitung durasi antar log dan akumulasi
    const enrichedLogs = filteredLogs.map((log, idx, arr) => {
        let duration = '-';
        let accumulated = 0;
        if (idx === 0) {
            accumulated = log.volume_recorded || 0;
        } else {
            const prevTime = new Date(arr[idx-1].created_at);
            const currTime = new Date(log.created_at);
            const diffMs = currTime - prevTime;
            const diffMinutes = Math.floor(diffMs / 60000);
            duration = diffMinutes > 0 ? `${diffMinutes} menit` : '< 1 menit';
            accumulated = (arr[idx-1].accumulated || 0) + (log.volume_recorded || 0);
        }
        return { ...log, duration, accumulated };
    });

    // Ekspor ke CSV
    const exportToCSV = () => {
        if (enrichedLogs.length === 0) {
            alert('Tidak ada data untuk diekspor.');
            return;
        }
        const headers = ['Waktu', 'Volume (ml)', 'Durasi', 'Akumulasi (ml)'];
        const rows = enrichedLogs.map(log => [
            new Date(log.created_at).toLocaleString('id-ID'),
            log.volume_recorded,
            log.duration,
            log.accumulated
        ]);
        const csvContent = [headers, ...rows].map(row => row.join(',')).join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.href = url;
        link.setAttribute('download', `rekapitulasi_${infusion.patient_name}_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    // Header untuk halaman Recap
    const recapHeader = (
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center w-full gap-5 relative z-20">
            <div className="flex items-center gap-5">
                <div className="relative group">
                    <div className="absolute inset-0 bg-emerald-400 blur-lg opacity-40 group-hover:opacity-60 transition-opacity duration-500 rounded-2xl"></div>
                    <div className="relative bg-gradient-to-br from-emerald-50 to-teal-50 p-3.5 rounded-2xl shadow-xl border border-emerald-100">
                        <FileText className="text-emerald-500" size={28} strokeWidth={2.5} />
                    </div>
                </div>
                <div>
                    <div className="flex items-center gap-3">
                        <h2 className="font-black text-3xl tracking-tighter text-slate-800 leading-none">DIGITAL CHARTING</h2>
                        <span className="px-2.5 py-1 rounded-md bg-emerald-100 text-emerald-800 text-[9px] font-black tracking-widest uppercase border border-emerald-200">Log</span>
                    </div>
                    <p className="text-[11px] text-slate-500 font-bold uppercase tracking-[0.3em] mt-2 flex items-center gap-2">
                        <Activity size={12} className="text-emerald-500" /> Rekapitulasi Infus Pasien
                    </p>
                </div>
            </div>
            
            <div className="flex items-center gap-3 sm:gap-5 w-full md:w-auto justify-between md:justify-end">
                <div className="flex items-center gap-3 bg-white/60 backdrop-blur-md px-4 py-2.5 rounded-2xl border border-slate-200 shadow-sm hidden sm:flex">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-slate-800 font-bold text-xs shadow-md border-2 border-white">
                        {auth.user.name.charAt(0)}
                    </div>
                    <div>
                        <p className="text-sm font-bold text-slate-700 leading-none">{auth.user.name}</p>
                        <p className="text-[10px] text-emerald-600 font-bold uppercase tracking-wider mt-1">Nursing Staff</p>
                    </div>
                </div>
                
                <Link href="/dashboard" className="bg-white/60 hover:bg-white backdrop-blur-md text-slate-600 hover:text-emerald-600 px-5 py-3 rounded-2xl text-xs font-bold transition-all flex items-center gap-2 border border-slate-200 shadow-sm hover:shadow-emerald-500/10 hover:border-emerald-200 group">
                    <ChevronLeft size={16} className="group-hover:-translate-x-1 transition-transform" /> <span className="hidden sm:inline">Kembali ke Dashboard</span>
                </Link>
            </div>
        </div>
    );

    return (
        <AuthenticatedLayout user={auth.user} header={recapHeader}>
            <Head title={`Digital Charting - ${infusion.patient_name}`} />

            <div className="py-8 px-4 sm:px-6 lg:px-8 max-w-[1000px] mx-auto">
                {/* Kartu Detail Pasien */}
                <div className="bg-white rounded-[32px] shadow-[0_10px_40px_rgba(0,0,0,0.04)] border border-slate-100 overflow-hidden animate-fadeInUp">
                    {/* Header Kartu */}
                    <div className="relative bg-gradient-to-r from-emerald-50 to-teal-50 p-8 md:p-10 text-slate-800 overflow-hidden">
                        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0IiBoZWlnaHQ9IjQiPgo8cmVjdCB3aWR0aD0iNCIgaGVpZ2h0PSIxIiBmaWxsPSJyZ2JhKDI1NSwyNTUsMjU1LDAuMDUpIi8+Cjwvc3ZnPg==')] pointer-events-none opacity-30"></div>
                        <div className="absolute right-0 top-0 w-64 h-64 bg-emerald-500/20 rounded-full blur-[80px] -mr-20 -mt-20"></div>
                        
                        <div className="flex items-center justify-between flex-wrap gap-6 relative z-10">
                            <div>
                                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-emerald-500 mb-3 flex items-center gap-2">
                                    <CheckCircle2 size={14} /> Monitoring Aktif
                                </p>
                                <h1 className="text-4xl md:text-5xl font-black mb-2 tracking-tighter text-white">{infusion.patient_name}</h1>
                                <p className="font-medium text-slate-400 text-sm flex items-center gap-2 uppercase tracking-wider">
                                    <span className="bg-white0 px-3 py-1 rounded-lg text-slate-800">Bed {infusion.room_number}</span>
                                    <span>•</span>
                                    <span className="text-emerald-600">{infusion.fluid_type}</span>
                                    <span>•</span>
                                    <span className="text-slate-100">{infusion.drip_type} Set</span>
                                </p>
                            </div>
                            <div className="bg-white backdrop-blur-xl rounded-[24px] px-8 py-5 text-center border border-emerald-100 shadow-inner">
                                <p className="text-[9px] font-bold uppercase tracking-[0.25em] text-slate-400 mb-1">Total Cairan Masuk</p>
                                <p className="text-4xl font-black text-white flex items-baseline gap-1 justify-center">
                                    {totalVolumeAdministered} <span className="text-base text-emerald-500 font-bold uppercase">ml</span>
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Body */}
                    <div className="p-8 md:p-10">
                        {/* Ringkasan Infus */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-10">
                            <div className="bg-slate-50 rounded-[20px] p-5 border border-slate-100 flex items-center gap-4 group hover:border-emerald-200 hover:shadow-md transition-all">
                                <div className="p-3.5 bg-white shadow-sm border border-slate-100 rounded-[16px] text-emerald-500 group-hover:scale-110 transition-transform"><Droplet size={24} /></div>
                                <div><p className="text-[10px] font-bold uppercase text-slate-400 tracking-wider mb-0.5">Sisa Volume</p><p className="text-2xl font-black text-slate-800">{infusion.current_remaining} <span className="text-xs text-slate-500 uppercase">ml</span></p></div>
                            </div>
                            <div className="bg-slate-50 rounded-[20px] p-5 border border-slate-100 flex items-center gap-4 group hover:border-emerald-200 hover:shadow-md transition-all">
                                <div className="p-3.5 bg-white shadow-sm border border-slate-100 rounded-[16px] text-emerald-500 group-hover:scale-110 transition-transform"><TrendingDown size={24} /></div>
                                <div><p className="text-[10px] font-bold uppercase text-slate-400 tracking-wider mb-0.5">Flow Rate</p><p className="text-2xl font-black text-slate-800">{infusion.flowrate} <span className="text-xs text-slate-500 uppercase">ml/h</span></p></div>
                            </div>
                            <div className="bg-slate-50 rounded-[20px] p-5 border border-slate-100 flex items-center gap-4 group hover:border-teal-200 hover:shadow-md transition-all">
                                <div className="p-3.5 bg-white shadow-sm border border-slate-100 rounded-[16px] text-teal-500 group-hover:scale-110 transition-transform"><Clock size={24} /></div>
                                <div><p className="text-[10px] font-bold uppercase text-slate-400 tracking-wider mb-0.5">Estimasi Habis</p><p className="text-xl font-black text-slate-800">{infusion.estimated_time_remaining}</p></div>
                            </div>
                        </div>

                        {/* Filter Tanggal & Export */}
                        <div className="mb-10 flex flex-col sm:flex-row gap-5 items-end justify-between bg-slate-50/50 p-5 rounded-[24px] border border-slate-100">
                            <div className="flex flex-wrap gap-4 items-end w-full sm:w-auto">
                                <div>
                                    <label className="text-[10px] font-bold text-slate-500 uppercase block mb-2 ml-1 tracking-widest">Dari Tanggal</label>
                                    <input
                                        type="date"
                                        value={startDate}
                                        onChange={(e) => setStartDate(e.target.value)}
                                        className="bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-700 focus:border-emerald-400 focus:ring-4 focus:ring-emerald-50 outline-none transition-all shadow-sm"
                                    />
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold text-slate-500 uppercase block mb-2 ml-1 tracking-widest">Sampai Tanggal</label>
                                    <input
                                        type="date"
                                        value={endDate}
                                        onChange={(e) => setEndDate(e.target.value)}
                                        className="bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-700 focus:border-emerald-400 focus:ring-4 focus:ring-emerald-50 outline-none transition-all shadow-sm"
                                    />
                                </div>
                                <button
                                    onClick={() => { setStartDate(''); setEndDate(''); }}
                                    className="bg-white hover:bg-slate-100 text-slate-600 border border-slate-200 px-5 py-3 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shadow-sm"
                                >
                                    <Filter size={16} /> Reset
                                </button>
                            </div>
                            <button
                                onClick={exportToCSV}
                                className="bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-800 px-6 py-3 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shadow-[0_8px_20px_rgba(16,185,129,0.3)] hover:shadow-[0_8px_25px_rgba(16,185,129,0.4)] active:scale-95 w-full sm:w-auto justify-center"
                            >
                                <Download size={16} /> Ekspor Data CSV
                            </button>
                        </div>

                        {/* TIMELINE RIWAYAT TETESAN */}
                        <div className="mb-6">
                            <div className="flex items-center justify-between mb-8 pb-4 border-b border-slate-100">
                                <h3 className="text-xl font-black text-slate-800 flex items-center gap-3">
                                    <div className="p-2 bg-emerald-50 rounded-xl text-emerald-500"><Calendar size={20} /></div>
                                    Timeline Tetesan
                                </h3>
                                <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-600 bg-emerald-50 px-4 py-2 rounded-full border border-emerald-100">
                                    {enrichedLogs.length} Catatan Terekam
                                </span>
                            </div>

                            {enrichedLogs.length === 0 ? (
                                <div className="text-center py-16 bg-slate-50 rounded-[24px] border border-slate-100 border-dashed">
                                    <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm">
                                        <Droplet size={32} className="text-slate-500" />
                                    </div>
                                    <h4 className="text-lg font-bold text-slate-700 mb-1">Belum Ada Riwayat</h4>
                                    <p className="text-slate-400 font-medium text-sm">Data rekapitulasi tetesan tidak tersedia untuk rentang waktu ini.</p>
                                </div>
                            ) : (
                                <div className="relative border-l-2 border-slate-100 ml-4 md:ml-8 space-y-6 pb-4 mt-8">
                                    {/* Indikator Atas Timeline */}
                                    <div className="absolute -top-6 -left-[11px] w-5 h-5 bg-slate-100 rounded-full border-4 border-white shadow-sm z-10"></div>
                                    
                                    {enrichedLogs.map((log, idx) => {
                                        const logDate = new Date(log.created_at);
                                        const timeString = logDate.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
                                        const dateString = logDate.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
                                        
                                        return (
                                            <div key={log.id} className="relative pl-8 md:pl-12 group animate-fadeInUp" style={{animationDelay: `${idx * 60}ms`, animationFillMode: 'both'}}>
                                                {/* Titik Tetesan / Droplet Node */}
                                                <div className="absolute -left-[17px] top-1/2 -translate-y-1/2 w-8 h-8 bg-white border-[3px] border-slate-100 rounded-full flex items-center justify-center shadow-sm group-hover:border-emerald-300 group-hover:scale-110 group-hover:shadow-[0_0_15px_rgba(16,185,129,0.3)] transition-all duration-300 z-10">
                                                    <Droplet size={12} className="text-emerald-500 group-hover:text-emerald-600 animate-pulse-slow" fill="currentColor" />
                                                </div>
                                                
                                                {/* Line connection active state */}
                                                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-8 h-0.5 bg-slate-100 group-hover:bg-emerald-100 transition-colors duration-300 -z-10"></div>

                                                {/* Card Detail Tetesan */}
                                                <div className="bg-white rounded-[20px] p-5 md:p-6 border border-slate-100 shadow-[0_4px_20px_rgba(0,0,0,0.02)] group-hover:shadow-[0_8px_30px_rgba(16,185,129,0.08)] group-hover:border-emerald-100 transition-all duration-300 relative overflow-hidden">
                                                    {/* Glow Background di dalam Card */}
                                                    <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-50 rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity -mr-10 -mt-10 pointer-events-none"></div>
                                                    
                                                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-5 relative z-10">
                                                        <div className="flex items-center gap-5">
                                                            <div className="bg-slate-50 text-slate-700 px-4 py-2.5 rounded-xl border border-slate-200 text-center min-w-[80px]">
                                                                <p className="text-sm font-black tracking-tight">{timeString}</p>
                                                                <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400 mt-1">{dateString}</p>
                                                            </div>
                                                            <div>
                                                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 flex items-center gap-1.5"><Activity size={12} className="text-emerald-500"/> Volume Tercatat</p>
                                                                <p className="text-3xl font-black text-slate-800 leading-none tracking-tighter">
                                                                    +{log.volume_recorded} <span className="text-sm text-slate-500 font-bold uppercase ml-0.5">ml</span>
                                                                </p>
                                                            </div>
                                                        </div>
                                                        
                                                        <div className="flex items-center gap-6 bg-slate-50 md:bg-transparent p-4 md:p-0 rounded-2xl border md:border-none border-slate-100">
                                                            <div>
                                                                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 flex items-center gap-1.5"><Clock size={12}/> Jeda Waktu</p>
                                                                <p className="text-sm font-bold text-slate-700 bg-white md:bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-100">{log.duration}</p>
                                                            </div>
                                                            <div className="w-px h-10 bg-slate-200 hidden md:block"></div>
                                                            <div className="text-right">
                                                                <p className="text-[9px] font-bold text-emerald-600 uppercase tracking-widest mb-1.5 flex items-center gap-1.5 justify-end"><Droplet size={12} className="text-emerald-500"/> Akumulasi Cairan</p>
                                                                <p className="text-xl font-black text-emerald-600 bg-emerald-50 px-4 py-1.5 rounded-xl border border-emerald-100 tracking-tight">
                                                                    {log.accumulated} <span className="text-[10px] uppercase font-bold">ml</span>
                                                                </p>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                    
                                    {/* Indikator Bawah Timeline */}
                                    <div className="absolute -bottom-2 -left-[11px] w-5 h-5 bg-slate-100 rounded-full border-4 border-white shadow-sm z-10"></div>
                                </div>
                            )}
                        </div>

                        {/* Footer medis */}
                        <div className="mt-12 p-6 bg-slate-50 rounded-[24px] border border-slate-100 text-center relative overflow-hidden">
                            <div className="absolute inset-0 bg-[radial-gradient(#e2e8f0_1px,transparent_1px)] [background-size:16px_16px] opacity-50 pointer-events-none"></div>
                            <p className="text-[10px] text-slate-600 font-black uppercase tracking-[0.2em] relative z-10">Dokumentasi Medis Digital • RSUD Banten</p>
                            <p className="text-xs font-medium text-slate-400 mt-2 relative z-10">Laporan rekapitulasi ini dicatat secara otomatis untuk pemantauan cairan infus pasien dalam 24 jam.</p>
                        </div>
                    </div>
                </div>
            </div>

            <style jsx global>{`
                @keyframes fadeInUp { 
                    from { opacity:0; transform:translateY(30px) scale(0.98); } 
                    to { opacity:1; transform:translateY(0) scale(1); } 
                }
                @keyframes pulse-slow {
                    0%, 100% { opacity: 1; transform: scale(1); }
                    50% { opacity: 0.7; transform: scale(0.9); }
                }
                .animate-fadeInUp { animation: fadeInUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
                .animate-pulse-slow { animation: pulse-slow 3s ease-in-out infinite; }
            `}</style>
        </AuthenticatedLayout>
    );
}