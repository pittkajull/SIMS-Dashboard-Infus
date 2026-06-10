import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, router } from '@inertiajs/react';
import { useState, useEffect } from 'react';
import { Terminal, RefreshCw, ChevronDown, Mail, Monitor } from 'lucide-react';

export default function LogViewer({ auth, logs = '', infusions = [], selectedDevice = null }) {
    const [autoRefresh, setAutoRefresh] = useState(true);
    const [device, setDevice] = useState(selectedDevice || '');
    const [tailLines, setTailLines] = useState(5);

    useEffect(() => {
        if (!autoRefresh) return;
        const interval = setInterval(() => {
            const params = device ? { device } : {};
            router.reload({ only: ['logs', 'selectedDevice'], data: params, preserveScroll: true });
        }, 3000);
        return () => clearInterval(interval);
    }, [autoRefresh, device]);

    const handleDeviceChange = (newDevice) => {
        setDevice(newDevice);
        const params = newDevice ? { device: newDevice } : {};
        router.get('/logs', params, { preserveScroll: true, replace: true });
    };

    const allLogLines = logs.split('\n').filter(line => line.trim());
    const logLines = tailLines > 0 ? allLogLines.slice(-tailLines) : allLogLines;

    // Ambil daftar device unik
    const devices = infusions.reduce((acc, inf) => {
        if (inf.device_id && !acc.find(d => d.id === inf.device_id)) {
            acc.push({ id: inf.device_id, label: `${inf.device_id} — ${inf.patient_name} (BED ${inf.room_number})` });
        }
        return acc;
    }, []);

    const selectedInfusion = infusions.find(i => i.device_id === device);

    return (
        <AuthenticatedLayout user={auth.user}>
            <Head title="Log Viewer - SIMS Debug" />

            <div className="py-4 sm:py-8 px-3 sm:px-6 lg:px-8 max-w-[1400px] mx-auto">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-3">
                    <div className="flex items-center gap-3">
                        <div className="bg-emerald-500 p-2 rounded-lg">
                            <Terminal className="text-white" size={20} />
                        </div>
                        <div>
                            <h1 className="text-xl font-black text-slate-800">Log Viewer</h1>
                            <p className="text-xs text-slate-500 font-bold">
                                {device ? `Device ${device} — ${selectedInfusion?.patient_name || ''}` : 'Semua Device'}
                            </p>
                        </div>
                    </div>
                    <div className="flex flex-wrap gap-2 items-center">
                        {/* Device Selector */}
                        <div className="relative">
                            <select
                                value={device}
                                onChange={(e) => handleDeviceChange(e.target.value)}
                                className="appearance-none bg-white border border-slate-200 rounded-lg px-3 py-2 pr-8 text-xs font-bold text-slate-700 outline-none hover:border-emerald-400 transition-all cursor-pointer"
                            >
                                <option value="">Semua Device</option>
                                {devices.map((d) => (
                                    <option key={d.id} value={d.id}>{d.label}</option>
                                ))}
                            </select>
                            <ChevronDown size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                        </div>

                        {/* Tail Lines Selector */}
                        <div className="relative">
                            <select
                                value={tailLines}
                                onChange={(e) => setTailLines(Number(e.target.value))}
                                className="appearance-none bg-white border border-slate-200 rounded-lg px-3 py-2 pr-8 text-xs font-bold text-slate-700 outline-none hover:border-emerald-400 transition-all cursor-pointer"
                            >
                                <option value={5}>Tail 5</option>
                                <option value={10}>Tail 10</option>
                                <option value={15}>Tail 15</option>
                                <option value={25}>Tail 25</option>
                                <option value={0}>Semua</option>
                            </select>
                            <ChevronDown size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                        </div>

                        <button
                            onClick={() => setAutoRefresh(!autoRefresh)}
                            className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-widest border transition-all ${
                                autoRefresh
                                    ? 'bg-emerald-50 text-emerald-600 border-emerald-200'
                                    : 'bg-slate-50 text-slate-500 border-slate-200'
                            }`}
                        >
                            <RefreshCw size={12} className={`inline mr-1 ${autoRefresh ? 'animate-spin' : ''}`} />
                            Auto Refresh: {autoRefresh ? 'ON' : 'OFF'}
                        </button>
                        <button
                            onClick={() => {
                                const params = device ? { device } : {};
                                router.reload({ only: ['logs', 'selectedDevice'], data: params, preserveScroll: true });
                            }}
                            className="px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-widest border border-slate-200 bg-white hover:bg-slate-50 transition-all"
                        >
                            <RefreshCw size={12} className="inline mr-1" /> Refresh
                        </button>
                    </div>
                </div>

                {/* Device Info Banner */}
                {selectedInfusion && (
                    <div className={`mb-4 px-4 py-3 rounded-xl border flex items-center gap-3 ${
                        selectedInfusion.finished_at
                            ? 'bg-slate-50 border-slate-200'
                            : 'bg-emerald-50 border-emerald-200'
                    }`}>
                        <Monitor size={16} className={selectedInfusion.finished_at ? 'text-slate-400' : 'text-emerald-500'} />
                        <div>
                            <p className="text-xs font-black text-slate-800">
                                Device {selectedInfusion.device_id} — {selectedInfusion.patient_name}
                                <span className="ml-2 text-slate-400 font-bold">BED {selectedInfusion.room_number}</span>
                            </p>
                            <p className="text-[10px] text-slate-500 font-bold">
                                {selectedInfusion.finished_at
                                    ? `Selesai pada ${new Date(selectedInfusion.finished_at).toLocaleString('id-ID')}`
                                    : '🔴 Monitoring Aktif'
                                }
                            </p>
                        </div>
                    </div>
                )}

                <div className="bg-slate-900 rounded-2xl overflow-hidden shadow-xl border border-slate-700">
                    <div className="bg-slate-800 px-4 py-2 flex items-center gap-2 border-b border-slate-700">
                        <div className="w-3 h-3 rounded-full bg-red-500"></div>
                        <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                        <div className="w-3 h-3 rounded-full bg-green-500"></div>
                        <span className="ml-2 text-xs font-mono text-slate-400">
                            {device ? `infusion.log → device:${device}` : 'infusion.log → semua'}
                        </span>
                        <span className="ml-auto text-[10px] font-mono text-slate-500">
                            {logLines.length}/{allLogLines.length} baris
                        </span>
                    </div>
                    <div className="p-4 overflow-auto max-h-[70vh] font-mono text-xs leading-relaxed">
                        {logLines.length === 0 ? (
                            <div className="text-slate-500 text-center py-10">
                                <p className="text-sm">
                                    {device ? `Belum ada log untuk device ${device}.` : 'Belum ada log.'}
                                </p>
                                <p className="mt-1 text-xs">Kirim data dari ESP32 untuk melihat log di sini.</p>
                            </div>
                        ) : (
                            logLines.map((line, idx) => {
                                let color = 'text-slate-300';
                                if (line.includes('ERROR') || line.includes('TIDAK DITEMUKAN')) color = 'text-red-400';
                                else if (line.includes('TARE')) color = 'text-purple-400 font-bold';
                                else if (line.includes('=== DATA MASUK')) color = 'text-emerald-400 font-bold';
                                else if (line.includes('=== DATA TERSIMPAN')) color = 'text-cyan-400 font-bold';
                                else if (line.includes('UPDATE DARI SENSOR')) color = 'text-blue-400';
                                else if (line.includes('HITUNG VOLUME') || line.includes('HITUNG DARI TPM')) color = 'text-yellow-400';
                                else if (line.includes('WARNING')) color = 'text-orange-400 font-bold';
                                else if (line.includes('LOG PERTAMA')) color = 'text-blue-400';
                                else if (line.includes('INFO')) color = 'text-slate-300';

                                return (
                                    <div key={idx} className={`${color} hover:bg-slate-800/50 px-2 py-0.5 rounded`}>
                                        {line}
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>

                <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="bg-white rounded-xl p-4 border border-slate-200">
                        <p className="text-[10px] font-bold uppercase text-slate-400 mb-1">Warna Legend</p>
                        <div className="space-y-1 text-xs">
                            <p><span className="text-emerald-500 font-bold">■ Hijau</span> = Data masuk dari ESP32</p>
                            <p><span className="text-yellow-500 font-bold">■ Kuning</span> = Proses hitung volume</p>
                            <p><span className="text-cyan-500 font-bold">■ Biru Muda</span> = Data tersimpan</p>
                            <p><span className="text-orange-500 font-bold">■ Oranye</span> = Warning alert</p>
                            <p><span className="text-purple-500 font-bold">■ Ungu</span> = Tare command</p>
                            <p><span className="text-red-500 font-bold">■ Merah</span> = Error</p>
                        </div>
                    </div>
                    <div className="bg-white rounded-xl p-4 border border-slate-200">
                        <p className="text-[10px] font-bold uppercase text-slate-400 mb-1">Tips Debug</p>
                        <div className="space-y-1 text-xs text-slate-600">
                            <p>• Pastikan Laravel jalan di <code className="bg-slate-100 px-1 rounded">0.0.0.0:8000</code></p>
                            <p>• ESP32 & PC harus satu jaringan WiFi</p>
                            <p>• Cek IP PC dengan <code className="bg-slate-100 px-1 rounded">ipconfig</code></p>
                            <p>• Filter per device untuk log yang lebih rapi</p>
                        </div>
                    </div>
                    <div className="bg-white rounded-xl p-4 border border-slate-200">
                        <p className="text-[10px] font-bold uppercase text-slate-400 mb-1">File Log</p>
                        <div className="space-y-1 text-xs text-slate-600">
                            <p><code className="bg-slate-100 px-1 rounded">storage/logs/infusion-YYYY-MM-DD.log</code></p>
                            <p>Log disimpan 7 hari, auto-rotate harian</p>
                        </div>
                    </div>
                </div>

                {/* CONTACT DEVELOPER */}
                <div className="mt-6 bg-white rounded-2xl p-5 sm:p-6 border border-slate-200 shadow-sm">
                    <div className="text-center mb-4">
                        <p className="text-xs font-black uppercase tracking-widest text-slate-400 mb-1">Butuh Bantuan?</p>
                        <p className="text-sm font-bold text-slate-600">Hubungi Developer SIMS</p>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        {[
                            { name: 'Arga', email: 'arga@sims.dev' },
                            { name: 'Muhajir', email: 'muhajir@sims.dev' },
                            { name: 'Alfian', email: 'alfian@sims.dev' },
                            { name: 'Adam', email: 'adam@sims.dev' },
                        ].map((dev) => (
                            <a
                                key={dev.name}
                                href={`mailto:${dev.email}`}
                                className="flex flex-col items-center gap-2 p-3 sm:p-4 rounded-xl border border-slate-200 bg-slate-50 hover:bg-emerald-50 hover:border-emerald-200 transition-all group"
                            >
                                <div className="w-10 h-10 rounded-full bg-slate-200 group-hover:bg-emerald-500 flex items-center justify-center transition-all">
                                    <Mail size={16} className="text-slate-500 group-hover:text-white transition-all" />
                                </div>
                                <div className="text-center">
                                    <p className="text-xs font-black text-slate-700 group-hover:text-emerald-700 transition-all">{dev.name}</p>
                                    <p className="text-[9px] text-slate-400 font-bold">{dev.email}</p>
                                </div>
                            </a>
                        ))}
                    </div>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
