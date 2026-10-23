'use client';

import {useState} from 'react';
import {droneParts} from "@/features/marketing/content/home-content";

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
        <div className="home-anatomy">
            <div className="home-plan">
                <svg viewBox="0 0 400 400" fill="none" aria-hidden="true">
                    <g className="home-plan-ring"><circle cx="200" cy="200" r="190" stroke="#e4d5d5" strokeDasharray="2 10"/></g>
                    <circle cx="200" cy="200" r="150" stroke="#efe6e6"/>
                    <path d="M200 6v388M6 200h388" stroke="#f1e9e9"/>
                    <g stroke="#d9dde3" strokeWidth="16" strokeLinecap="round"><path d="M178 178L96 96M222 178l82-82M178 222l-82 82M222 222l82 82"/></g>
                    <g stroke="#3a404c" strokeWidth="2"><path d="M178 178L96 96M222 178l82-82M178 222l-82 82M222 222l82 82"/></g>
                    {rotors.map(([x, y, reverse]) => (
                        <g key={`${x}-${y}`} transform={`translate(${x} ${y})`}>
                            <circle r="62" stroke="#e0d6d6" fill="rgba(171,37,35,.03)"/>
                            <g className={reverse ? 'home-rotor is-reverse' : 'home-rotor'}><path d="M-56 0H56" stroke="#3a404c" strokeOpacity=".55" strokeWidth="5" strokeLinecap="round"/></g>
                            <circle r="15" fill="#fff" stroke="#3a404c" strokeWidth="2"/>
                        </g>
                    ))}
                    <rect x="150" y="140" width="100" height="120" rx="26" fill="#fff" stroke="#3a404c" strokeWidth="2"/>
                    <rect x="168" y="196" width="64" height="40" rx="6" fill="#f5f6f8" stroke="#9aa1ad"/>
                    <path d="M176 216h40" stroke="#007f3e" strokeWidth="3" strokeLinecap="round"/>
                    <rect x="178" y="164" width="44" height="22" rx="4" fill="#f5f6f8" stroke="#9aa1ad"/>
                    <circle cx="200" cy="152" r="9" fill="#fff" stroke="#3a404c" strokeWidth="1.5"/>
                    <circle cx="200" cy="272" r="13" fill="#2a2f3a"/>
                    <circle cx="200" cy="272" r="5" fill="#ab2523"/>
                    <path d="M160 254l-10 16M240 254l10 16" stroke="#3a404c" strokeWidth="2" strokeLinecap="round"/>
                    <circle cx="96" cy="96" r="4" fill="#ab2523"/><circle cx="304" cy="96" r="4" fill="#ab2523"/>
                    <circle cx="96" cy="304" r="4" fill="#007f3e"/><circle cx="304" cy="304" r="4" fill="#007f3e"/>
                    <text x="200" y="22" fill="#8a8f99" fontSize="10" textAnchor="middle" letterSpacing="2" fontFamily="ui-monospace, monospace">MŨI · HƯỚNG BAY</text>
                </svg>
                <svg className="home-leader" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true" key={selected.id}>
                    <polyline points={`${selected.x},${selected.y} ${elbowX},${elbowY} ${endX},${elbowY}`} pathLength={1}/>
                    <circle cx={endX} cy={elbowY} r="0.8"/>
                </svg>
                <span key={`label-${selected.id}`} aria-hidden="true"
                      className={side > 0 ? 'home-leader-label is-right' : 'home-leader-label'}
                      style={{left: `${endX}%`, top: `${elbowY}%`}}>{selected.name}</span>
                {droneParts.map((part) => (
                    <button key={part.id} type="button" className="home-hotspot" aria-label={part.name}
                            aria-pressed={part.id === selected.id} style={{left: `${part.x}%`, top: `${part.y}%`}}
                            onClick={() => setSelectedId(part.id)} onMouseEnter={() => setSelectedId(part.id)}/>
                ))}
            </div>
            <div>
                <article className="home-part" aria-live="polite">
                    <span className="home-eyebrow">{selected.kicker}</span>
                    <h3>{selected.name}</h3>
                    <p>{selected.text}</p>
                    <div className="home-part-spec"><span>Thông số thường gặp</span>{selected.spec}</div>
                </article>
                <div className="home-chips" role="group" aria-label="Danh sách bộ phận">
                    {droneParts.map((part) => (
                        <button key={part.id} type="button" className="home-chip" aria-pressed={part.id === selected.id}
                                onClick={() => setSelectedId(part.id)}>{part.name}</button>
                    ))}
                </div>
            </div>
        </div>
    );
}
