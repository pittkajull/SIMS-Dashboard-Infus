import GuestLayout from '@/Layouts/GuestLayout';
import { Head, useForm } from '@inertiajs/react';
import { ShieldCheck, Lock } from 'lucide-react';

export default function ConfirmPassword() {
    const { data, setData, post, processing, errors, reset } = useForm({
        password: '',
    });

    const submit = (e) => {
        e.preventDefault();
        post(route('password.confirm'), {
            onFinish: () => reset('password'),
        });
    };

    return (
        <GuestLayout>
            <Head title="Konfirmasi Password - RSUD BANTEN" />

            <div className="mb-6 text-center">
                <div className="inline-flex p-3 bg-rose-50 rounded-2xl mb-4 text-rose-500 border border-rose-100 shadow-sm">
                    <ShieldCheck size={28} strokeWidth={2} />
                </div>
                <h3 className="text-2xl font-black tracking-tight text-slate-800">Area Aman</h3>
                <p className="text-slate-500 text-sm mt-2 font-medium leading-relaxed">
                    Ini adalah area yang diamankan. Harap konfirmasi password Anda sebelum melanjutkan.
                </p>
            </div>

            <form onSubmit={submit} className="space-y-5">
                <div className="group">
                    <label className="text-[10px] font-bold text-slate-500 uppercase block mb-2 ml-1 tracking-widest">Password Anda</label>
                    <div className="relative">
                        <input
                            type="password"
                            value={data.password}
                            onChange={(e) => setData('password', e.target.value)}
                            className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 pl-12 text-sm font-bold text-slate-800 focus:bg-white focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100 outline-none transition-all placeholder:font-medium placeholder:text-slate-400 shadow-sm"
                            placeholder="••••••••"
                            autoFocus
                            required
                        />
                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-emerald-500 transition-colors" size={18} strokeWidth={2.5} />
                    </div>
                    {errors.password && <div className="text-rose-500 text-[10px] uppercase tracking-wider mt-2 font-bold ml-1">{errors.password}</div>}
                </div>

                <button
                    disabled={processing}
                    className="w-full bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white py-4 rounded-[20px] font-black text-sm uppercase tracking-widest shadow-[0_8px_20px_rgba(16,185,129,0.2)] hover:shadow-[0_8px_25px_rgba(16,185,129,0.3)] transition-all active:scale-[0.98] mt-6 flex items-center justify-center gap-2 disabled:opacity-70 disabled:pointer-events-none"
                >
                    {processing ? 'Memproses...' : 'Konfirmasi & Lanjutkan'}
                </button>
            </form>
        </GuestLayout>
    );
}
