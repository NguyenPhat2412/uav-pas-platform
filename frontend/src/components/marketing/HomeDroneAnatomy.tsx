'use client';

import {useState} from 'react';
import {droneParts} from "@/content/marketing/home-content";

const rotors = [[96, 96, false], [304, 96, true], [96, 304, true], [304, 304, false]] as const;

export function DroneAnatomy() {
    const [selectedId, setSelectedId] = useState(droneParts[0].id);
    const selected = droneParts.find((part) => part.id === selectedId) ?? droneParts[0];
    // Leader line: from the hotspot, a short diagonal, then flat out to the nearer edge of the plan.
    const side = selected.x >= 50 ? 1 : -1;
    const elbowX = selected.x + side * 6;
    const elbowY = Math.min(94, Math.max(6, selected.y + (selected.y < 50 ? -7 : 7)));
    const endX = side > 0 ? 98 : 2;

    return (
        <div className="grid grid-cols-1 items-center gap-8 lg:grid-cols-12">
            <div className="relative mx-auto aspect-square w-full max-w-[420px] rounded-2xl border border-border bg-card p-4 shadow-xs lg:col-span-6">
                <svg viewBox="0 0 400 400" fill="none" aria-hidden="true" className="h-full w-full">
                    <g><circle cx="200" cy="200" r="190" className="stroke-rose-200" strokeDasharray="2 10"/></g>
                    <circle cx="200" cy="200" r="150" className="stroke-rose-100"/>
                    <path d="M200 6v388M6 200h388" className="stroke-slate-100"/>
                    <g className="stroke-slate-200" strokeWidth="16" strokeLinecap="round"><path d="M178 178L96 96M222 178l82-82M178 222l-82 82M222 222l82 82"/></g>
                    <g className="stroke-slate-700" strokeWidth="2"><path d="M178 178L96 96M222 178l82-82M178 222l-82 82M222 222l82 82"/></g>
                    {rotors.map(([x, y]) => (
                        <g key={`${x}-${y}`} transform={`translate(${x} ${y})`}>
                            <circle r="62" className="stroke-rose-200 fill-primary/5"/>
                            <g><path d="M-56 0H56" className="stroke-slate-700" strokeOpacity=".55" strokeWidth="5" strokeLinecap="round"/></g>
                            <circle r="15" className="fill-white stroke-slate-700" strokeWidth="2"/>
                        </g>
                    ))}
                    <rect x="150" y="140" width="100" height="120" rx="26" className="fill-white stroke-slate-700" strokeWidth="2"/>
                    <rect x="168" y="196" width="64" height="40" rx="6" className="fill-slate-100 stroke-slate-400"/>
                    <path d="M176 216h40" className="stroke-primary" strokeWidth="3" strokeLinecap="round"/>
                    <rect x="178" y="164" width="44" height="22" rx="4" className="fill-slate-100 stroke-slate-400"/>
                    <circle cx="200" cy="152" r="9" className="fill-white stroke-slate-700" strokeWidth="1.5"/>
                    <circle cx="200" cy="272" r="13" className="fill-slate-800"/>
                    <circle cx="200" cy="272" r="5" className="fill-primary"/>
                    <path d="M160 254l-10 16M240 254l10 16" className="stroke-slate-700" strokeWidth="2" strokeLinecap="round"/>
                    <circle cx="96" cy="96" r="4" className="fill-primary"/><circle cx="304" cy="96" r="4" className="fill-primary"/>
                    <circle cx="96" cy="304" r="4" className="fill-uav-blue"/><circle cx="304" cy="304" r="4" className="fill-uav-blue"/>
                    <text x="200" y="22" className="fill-slate-400 font-sans" fontSize="10" textAnchor="middle" letterSpacing="2">MŨI · HƯỚNG BAY</text>
                </svg>
                <svg className="pointer-events-none absolute inset-0 h-full w-full stroke-primary fill-primary" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true" key={selected.id}>
                    <polyline points={`${selected.x},${selected.y} ${elbowX},${elbowY} ${endX},${elbowY}`} fill="none" strokeWidth="0.6" pathLength={1}/>
                    <circle cx={endX} cy={elbowY} r="0.8"/>
                </svg>
                <span
                    key={`label-${selected.id}`}
                    aria-hidden="true"
                    className={`pointer-events-none absolute -translate-y-1/2 rounded-md bg-primary px-2 py-0.5 text-[10px] font-bold text-primary-foreground shadow-xs ${
                        side > 0 ? '-translate-x-full' : ''
                    }`}
                    style={{left: `${endX}%`, top: `${elbowY}%`}}
                >
                    {selected.name}
                </span>
                {droneParts.map((part) => (
                    <button
                        key={part.id}
                        type="button"
                        className={`absolute h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white transition-transform cursor-pointer ${
                            part.id === selected.id ? 'scale-125 bg-primary ring-4 ring-primary/30' : 'bg-slate-700 hover:bg-primary'
                        }`}
                        aria-label={part.name}
                        aria-pressed={part.id === selected.id}
                        style={{left: `${part.x}%`, top: `${part.y}%`}}
                        onClick={() => setSelectedId(part.id)}
                        onMouseEnter={() => setSelectedId(part.id)}
                    />
                ))}
            </div>
            <div className="space-y-4 lg:col-span-6">
                <article className="rounded-2xl border border-border bg-card p-6 shadow-xs space-y-3" aria-live="polite">
                    <span className="text-xs font-bold uppercase tracking-widest text-primary">{selected.kicker}</span>
                    <h3 className="text-xl font-bold text-foreground">{selected.name}</h3>
                    <p className="text-sm leading-relaxed text-slate-600">{selected.text}</p>
                    <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-slate-50 px-4 py-2.5 text-xs font-semibold text-slate-700">
                        <span className="text-slate-500">Thông số thường gặp</span>
                        <span>{selected.spec}</span>
                    </div>
                </article>
                <div className="flex flex-wrap gap-2" role="group" aria-label="Danh sách bộ phận">
                    {droneParts.map((part) => (
                        <button
                            key={part.id}
                            type="button"
                            className={`rounded-xl border px-3.5 py-2 text-xs font-bold transition-colors cursor-pointer ${
                                part.id === selected.id
                                    ? 'border-primary bg-uav-red-light text-primary'
                                    : 'border-border bg-card text-slate-700 hover:bg-slate-100'
                            }`}
                            aria-pressed={part.id === selected.id}
                            onClick={() => setSelectedId(part.id)}
                        >
                            {part.name}
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
}
