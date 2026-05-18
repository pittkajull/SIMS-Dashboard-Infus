import os

file_path = r"d:\laragon\www\sims\resources\js\Pages\Recap.jsx"
with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

replacements = [
    ("bg-cyan-400", "bg-emerald-400"),
    ("text-cyan-400", "text-emerald-500"),
    ("from-slate-900 to-slate-800", "from-emerald-50 to-teal-50"),
    ("border-slate-700/50", "border-emerald-100"),
    ("bg-cyan-100", "bg-emerald-100"),
    ("text-cyan-800", "text-emerald-800"),
    ("border-cyan-200", "border-emerald-200"),
    ("text-cyan-500", "text-emerald-500"),
    ("text-cyan-600", "text-emerald-600"),
    ("bg-gradient-to-br from-cyan-500 to-blue-600", "bg-gradient-to-br from-emerald-500 to-teal-600"),
    ("shadow-cyan-500/10", "shadow-emerald-500/10"),
    ("bg-cyan-500/20", "bg-emerald-500/20"),
    ("bg-white/10", "bg-white/50"),
    ("text-white", "text-slate-800"),
    ("text-slate-300", "text-slate-500"),
    ("text-cyan-300", "text-emerald-600"),
    ("bg-white/5", "bg-white"),
    ("border-white/10", "border-emerald-100"),
    ("hover:border-cyan-200", "hover:border-emerald-200"),
    ("focus:border-cyan-400", "focus:border-emerald-400"),
    ("focus:ring-cyan-50", "focus:ring-emerald-50"),
    ("from-cyan-500 to-blue-500", "from-emerald-500 to-teal-500"),
    ("hover:from-cyan-400 hover:to-blue-400", "hover:from-emerald-400 hover:to-teal-400"),
    ("shadow-[0_8px_20px_rgba(6,182,212,0.3)]", "shadow-[0_8px_20px_rgba(16,185,129,0.3)]"),
    ("hover:shadow-[0_8px_25px_rgba(6,182,212,0.4)]", "hover:shadow-[0_8px_25px_rgba(16,185,129,0.4)]"),
    ("bg-cyan-50", "bg-emerald-50"),
    ("border-cyan-100", "border-emerald-100"),
    ("group-hover:border-cyan-300", "group-hover:border-emerald-300"),
    ("group-hover:shadow-[0_0_15px_rgba(6,182,212,0.3)]", "group-hover:shadow-[0_0_15px_rgba(16,185,129,0.3)]"),
    ("group-hover:text-cyan-600", "group-hover:text-emerald-600"),
    ("group-hover:bg-cyan-100", "group-hover:bg-emerald-100"),
    ("group-hover:border-cyan-100", "group-hover:border-emerald-100"),
    ("shadow-[0_8px_30px_rgba(6,182,212,0.08)]", "shadow-[0_8px_30px_rgba(16,185,129,0.08)]"),
    ("bg-gradient-to-r from-slate-900 to-slate-800", "bg-gradient-to-r from-emerald-500 to-teal-600"),
    ("text-slate-800", "text-slate-800"), # Just to note that this should stay dark if it's already text-slate-800 in light areas
]

for old, new in replacements:
    content = content.replace(old, new)

# Special fix for the card header which used to be dark slate but is now emerald gradient. So the text inside should remain white.
content = content.replace('text-slate-800 leading-none tracking-tighter', 'text-slate-800 leading-none tracking-tighter') # timeline text
content = content.replace('text-4xl md:text-5xl font-black mb-2 tracking-tighter text-slate-800', 'text-4xl md:text-5xl font-black mb-2 tracking-tighter text-white')
content = content.replace('text-4xl font-black text-slate-800 flex items-baseline gap-1 justify-center', 'text-4xl font-black text-white flex items-baseline gap-1 justify-center')
content = content.replace('<span className="bg-white/50 px-3 py-1 rounded-lg text-slate-800">', '<span className="bg-white/20 px-3 py-1 rounded-lg text-white">')
content = content.replace('text-emerald-600">Bed', 'text-white">Bed')
content = content.replace('text-slate-500">{infusion.drip_type}', 'text-slate-100">{infusion.drip_type}')

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)
print("Updated Recap.jsx")
