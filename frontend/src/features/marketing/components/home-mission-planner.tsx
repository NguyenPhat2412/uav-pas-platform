'use client';

import Image from 'next/image';
import Link from 'next/link';
import {useEffect, useRef, useState} from 'react';
import {type MissionKind, missionPatterns, surveyPilot} from "@/features/marketing/content/home-content";
import {MissionIcon} from "@/features/marketing/components/home-icons";

type Point = [number, number];
type Plan = { points: Point[]; area?: Point[]; poi?: Point; towers?: Point[]; site?: Point };

const station: Point = [0.1, 0.84];

// Flight patterns in normalised map coordinates (0..1).
function buildPlan(kind: MissionKind): Plan {
    const points: Point[] = [station];
    if (kind === 'survey') {
        const [x0, x1, y0, y1, lanes] = [0.24, 0.84, 0.18, 0.8, 8];
        for (let i = 0; i <= lanes; i++) {
            const x = x0 + (x1 - x0) * i / lanes;
            points.push(...(i % 2 ? [[x, y1], [x, y0]] : [[x, y0], [x, y1]]) as Point[]);
        }
        points.push(station);
        return {points, area: [[x0 - .03, y0 - .05], [x1 + .03, y0 - .08], [x1 + .05, y1 + .04], [x0 - .05, y1 + .06]]};
    }
    if (kind === 'orbit') {
        const [cx, cy, r] = [0.58, 0.46, 0.24];
        for (let a = 0; a <= 630; a += 6) {
            const rad = (a + 170) * Math.PI / 180;
            points.push([cx + Math.cos(rad) * r, cy + Math.sin(rad) * r]);
        }
        points.push(station);
        return {points, poi: [cx, cy]};
    }
    if (kind === 'corridor') {
        const towers: Point[] = [[0.16, 0.7], [0.32, 0.56], [0.5, 0.52], [0.66, 0.36], [0.86, 0.22]];
        towers.forEach(([x, y]) => points.push([x + 0.02, y - 0.06]));
        [...towers].reverse().forEach(([x, y]) => points.push([x - 0.02, y + 0.06]));
        points.push(station);
        return {points, towers};
    }
    const site: Point = [0.74, 0.32];
    points.push([0.36, 0.5], site);
    for (let a = 0; a <= 360; a += 20) points.push([site[0] + Math.cos(a * Math.PI / 180) * 0.07, site[1] + Math.sin(a * Math.PI / 180) * 0.07]);
    points.push([0.4, 0.62], station);
    return {points, site};
}

function drawPlan(ctx: CanvasRenderingContext2D, plan: Plan, w: number, h: number, progress: number) {
    const at = ([x, y]: Point): Point => [x * w, y * h];
    const polyline = (pts: Point[]) => { ctx.beginPath(); pts.map(at).forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)); };
    ctx.clearRect(0, 0, w, h);
    ctx.lineWidth = 1;
    ctx.strokeStyle = 'rgba(171,37,35,0.07)';
    const step = Math.max(24, w / 24);
    for (let x = 0; x < w; x += step) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke(); }
    for (let y = 0; y < h; y += step) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke(); }
    ctx.strokeStyle = 'rgba(58,64,76,0.12)';
    for (let k = 0; k < 5; k++) {
        ctx.beginPath();
        for (let x = 0; x <= w; x += 8) { const y = h * (0.2 + k * 0.17) + Math.sin(x / w * 6 + k) * 14; if (x) ctx.lineTo(x, y); else ctx.moveTo(x, y); }
        ctx.stroke();
    }
    if (plan.area) {
        polyline(plan.area); ctx.closePath();
        ctx.fillStyle = 'rgba(0,127,62,0.07)'; ctx.fill();
        ctx.setLineDash([5, 5]); ctx.strokeStyle = 'rgba(0,127,62,0.7)'; ctx.stroke(); ctx.setLineDash([]);
    }
    if (plan.poi) {
        const [x, y] = at(plan.poi);
        ctx.fillStyle = 'rgba(180,83,9,0.14)'; ctx.beginPath(); ctx.arc(x, y, 26, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#b45309'; ctx.fillRect(x - 9, y - 9, 18, 18);
    }
    if (plan.towers) {
        ctx.strokeStyle = 'rgba(180,83,9,0.6)'; ctx.lineWidth = 1.5; polyline(plan.towers); ctx.stroke();
        plan.towers.map(at).forEach(([x, y]) => { ctx.fillStyle = '#b45309'; ctx.beginPath(); ctx.moveTo(x, y - 8); ctx.lineTo(x + 6, y + 6); ctx.lineTo(x - 6, y + 6); ctx.closePath(); ctx.fill(); });
    }
    if (plan.site) {
        const [x, y] = at(plan.site);
        ctx.strokeStyle = '#b45309'; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.arc(x, y, 10, 0, Math.PI * 2); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(x - 15, y); ctx.lineTo(x + 15, y); ctx.moveTo(x, y - 15); ctx.lineTo(x, y + 15); ctx.stroke();
    }
    ctx.setLineDash([3, 6]); ctx.strokeStyle = 'rgba(32,32,32,0.25)'; ctx.lineWidth = 1.5; polyline(plan.points); ctx.stroke(); ctx.setLineDash([]);

    const pts = plan.points.map(at);
    const lengths = [0];
    for (let i = 1; i < pts.length; i++) lengths.push(lengths[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
    const target = lengths[lengths.length - 1] * progress;
    let head = pts[0];
    ctx.strokeStyle = '#ab2523'; ctx.lineWidth = 2.5; ctx.lineJoin = 'round';
    ctx.beginPath(); ctx.moveTo(head[0], head[1]);
    for (let i = 1; i < pts.length; i++) {
        if (lengths[i] <= target) { head = pts[i]; ctx.lineTo(head[0], head[1]); continue; }
        const f = (target - lengths[i - 1]) / ((lengths[i] - lengths[i - 1]) || 1);
        head = [pts[i - 1][0] + (pts[i][0] - pts[i - 1][0]) * f, pts[i - 1][1] + (pts[i][1] - pts[i - 1][1]) * f];
        ctx.lineTo(head[0], head[1]);
        break;
    }
    ctx.stroke();
    const [sx, sy] = at(station);
    ctx.fillStyle = '#007f3e'; ctx.fillRect(sx - 8, sy - 8, 16, 16);
    ctx.fillStyle = '#646464'; ctx.font = '600 10px ui-monospace, monospace'; ctx.fillText('TRẠM', sx + 13, sy + 4);
    ctx.fillStyle = 'rgba(171,37,35,0.18)'; ctx.beginPath(); ctx.arc(head[0], head[1], 12, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#ab2523'; ctx.beginPath(); ctx.arc(head[0], head[1], 5, 0, Math.PI * 2); ctx.fill();
}

export function MissionPlanner() {
    const [kind, setKind] = useState<MissionKind>('survey');
    const [progress, setProgress] = useState(0);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const mission = missionPatterns.find((item) => item.kind === kind) ?? missionPatterns[0];

    useEffect(() => {
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext('2d');
        if (!canvas || !ctx) return;
        const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        const plan = buildPlan(kind);
        let w = 0, h = 0, frame = 0, visible = true, lastLabel = -1;
        const size = () => {
            const rect = canvas.getBoundingClientRect(), dpr = Math.min(window.devicePixelRatio || 1, 2);
            w = rect.width; h = rect.height;
            canvas.width = w * dpr; canvas.height = h * dpr;
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
            if (reduce) drawPlan(ctx, plan, w, h, 1);
        };
        size();
        const resizeObserver = new ResizeObserver(size);
        resizeObserver.observe(canvas);
        const io = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; });
        io.observe(canvas);
        if (reduce) {
            frame = requestAnimationFrame(() => { drawPlan(ctx, plan, w, h, 1); setProgress(100); });
        } else {
            const start = performance.now();
            const loop = (now: number) => {
                frame = requestAnimationFrame(loop);
                if (!visible) return;
                const p = Math.min(1, ((now - start) % 8200) / 7000);
                drawPlan(ctx, plan, w, h, p);
                const label = Math.round(p * 100);
                if (label !== lastLabel) { lastLabel = label; setProgress(label); }
            };
            frame = requestAnimationFrame(loop);
        }
        return () => { cancelAnimationFrame(frame); resizeObserver.disconnect(); io.disconnect(); };
    }, [kind]);

    return (
        <div className="home-missions">
            <div className="home-mission-side">
                <div className="home-mission-tabs" role="tablist" aria-label="Dịch vụ">
                    {missionPatterns.map((item) => (
                        <button key={item.kind} type="button" role="tab" id={`home-tab-${item.kind}`} className="home-mission-tab"
                                aria-selected={item.kind === kind} aria-controls="home-mission-map" onClick={() => setKind(item.kind)}>
                            <span className="home-mission-icon"><MissionIcon kind={item.kind}/></span>
                            <strong>{item.title}</strong>
                            <span>{item.text}</span>
                        </button>
                    ))}
                </div>
                <figure className="home-mission-photo">
                    <div className="home-mission-photo-frame"><Image src={surveyPilot.src} alt={surveyPilot.alt} fill sizes="(max-width: 1040px) 100vw, 40vw"/></div>
                    <figcaption>{surveyPilot.caption}<a href={surveyPilot.source} target="_blank" rel="noopener noreferrer">Ảnh: {surveyPilot.credit} ↗</a></figcaption>
                </figure>
            </div>
            <div className="home-map" role="tabpanel" id="home-mission-map" aria-labelledby={`home-tab-${kind}`}>
                <div className="home-map-top"><span>ĐƯỜNG BAY MINH HOẠ · <b>{mission.title.toUpperCase()}</b></span><span>TIẾN ĐỘ {progress}%</span></div>
                <div className="home-map-canvas"><canvas ref={canvasRef} aria-label={`Sơ đồ đường bay minh hoạ: ${mission.pattern}`}/></div>
                <dl className="home-map-stats">
                    <div><dt>Kiểu bay</dt><dd>{mission.pattern}</dd></div>
                    <div><dt>Phù hợp cho</dt><dd>{mission.fit}</dd></div>
                    <div><dt>Bạn cần cung cấp</dt><dd>{mission.provide}</dd></div>
                </dl>
                <Link className="home-map-link" href={`/services/${mission.slug}`}>Tìm hiểu dịch vụ {mission.title.toLowerCase()} →</Link>
            </div>
        </div>
    );
}
