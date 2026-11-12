'use client';
import {keepVietnamesePhrases} from "@/lib/typography";

export function SectionHeading({title, meta, action}: { title: string; meta?: string; action?: React.ReactNode }) {
    return (
        <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
                <h2 className="text-base font-bold tracking-tight text-foreground">{keepVietnamesePhrases(title)}</h2>
                {meta && <span className="text-xs text-slate-500">{meta}</span>}
            </div>
            {action}
        </div>
    );
}
