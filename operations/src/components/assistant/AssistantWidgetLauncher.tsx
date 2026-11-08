'use client';

import {type PointerEvent, useLayoutEffect, useRef, useState} from 'react';
import {Button} from '@/components/ui';
import {SuperheroLogo} from '@/components/assistant/SuperheroLogo';
import type {AssistantCorner as Corner} from '@/types/assistant/assistant.types';
import {cn} from '@/lib/utils';

export const CORNER_KEY = 'uav_assistant_corner';
export const EXPANDED_KEY = 'uav_assistant_expanded';

/** Pointer travel (px) before a press counts as a drag rather than a click. */
const DRAG_THRESHOLD = 6;
/** Glide into the corner with a slight overshoot, like a magnet catching the button. */
const SETTLE = 'transform 460ms cubic-bezier(0.22, 1.25, 0.36, 1)';

export const PANEL_ORIGIN: Record<Corner, string> = {
    tl: 'origin-top-left',
    tr: 'origin-top-right',
    bl: 'origin-bottom-left',
    br: 'origin-bottom-right',
};

// Top corners sit below the portal header so the launcher never covers the account menu.
export const LAUNCHER_AT: Record<Corner, string> = {
    tl: 'top-[4.5rem] left-5',
    tr: 'top-[4.5rem] right-5',
    bl: 'bottom-5 left-5',
    br: 'bottom-5 right-5',
};

export const PANEL_AT: Record<Corner, string> = {
    tl: 'top-[9.5rem] left-5',
    tr: 'top-[9.5rem] right-5',
    bl: 'bottom-24 left-5',
    br: 'bottom-24 right-5',
};

export function isCorner(value: unknown): value is Corner {
    return value === 'tl' || value === 'tr' || value === 'bl' || value === 'br';
}

interface AssistantWidgetLauncherProps {
    open: boolean;
    corner: Corner;
    dragging: boolean;
    title: string;
    ariaLabel: string;
    onToggle: () => void;
    onCornerChange: (corner: Corner) => void;
    onDraggingChange: (dragging: boolean) => void;
}

export function AssistantWidgetLauncher({
    open,
    corner,
    dragging,
    title,
    ariaLabel,
    onToggle,
    onCornerChange,
    onDraggingChange,
}: AssistantWidgetLauncherProps) {
    const [settles, setSettles] = useState(0);
    const launcher = useRef<HTMLButtonElement>(null);
    const drag = useRef<{
        startX: number;
        startY: number;
        box: DOMRect;
        x: number;
        y: number;
        moved: boolean;
        frame: number;
    } | null>(null);
    const dropFrom = useRef<DOMRect | null>(null);
    const justDragged = useRef(false);

    // FLIP: after a drop the button already sits in its new corner; start it where it was released and let it glide home.
    useLayoutEffect(() => {
        const el = launcher.current;
        const from = dropFrom.current;
        dropFrom.current = null;
        if (!el || !from) return;
        el.style.transition = 'none';
        el.style.transform = '';
        const to = el.getBoundingClientRect();
        el.style.transform = `translate(${from.left - to.left}px, ${from.top - to.top}px)`;
        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
            el.style.transform = '';
            return;
        }
        void el.offsetWidth;
        el.style.transition = SETTLE;
        el.style.transform = '';
    }, [settles]);

    const onPointerDown = (event: PointerEvent<HTMLButtonElement>) => {
        if (event.button !== 0) return;
        justDragged.current = false;
        const el = event.currentTarget;
        el.style.transition = 'none';
        el.style.transform = '';
        drag.current = {
            startX: event.clientX,
            startY: event.clientY,
            box: el.getBoundingClientRect(),
            x: 0,
            y: 0,
            moved: false,
            frame: 0,
        };
        el.setPointerCapture(event.pointerId);
    };

    const onPointerMove = (event: PointerEvent<HTMLButtonElement>) => {
        const d = drag.current;
        if (!d) return;
        if (!d.moved) {
            if (Math.hypot(event.clientX - d.startX, event.clientY - d.startY) < DRAG_THRESHOLD) return;
            d.moved = true;
            onDraggingChange(true);
        }
        // Keep the whole button on screen, then paint at most once per frame without re-rendering React.
        d.x = Math.min(Math.max(-d.box.left, event.clientX - d.startX), window.innerWidth - d.box.right);
        d.y = Math.min(Math.max(-d.box.top, event.clientY - d.startY), window.innerHeight - d.box.bottom);
        const el = event.currentTarget;
        if (!d.frame) {
            d.frame = requestAnimationFrame(() => {
                d.frame = 0;
                el.style.transform = `translate(${d.x}px, ${d.y}px)`;
            });
        }
    };

    const endDrag = (el: HTMLButtonElement) => {
        const d = drag.current;
        drag.current = null;
        if (d?.frame) cancelAnimationFrame(d.frame);
        if (!d?.moved) return;
        justDragged.current = true;
        el.style.transform = `translate(${d.x}px, ${d.y}px)`;
        const at = el.getBoundingClientRect();
        const next: Corner = `${at.top + at.height / 2 < window.innerHeight / 2 ? 't' : 'b'}${
            at.left + at.width / 2 < window.innerWidth / 2 ? 'l' : 'r'
        }`;
        dropFrom.current = at;
        onCornerChange(next);
        onDraggingChange(false);
        setSettles((n) => n + 1);
        try {
            localStorage.setItem(CORNER_KEY, next);
        } catch {
            // Storage unavailable: the corner lasts until reload.
        }
    };

    const handleClick = () => {
        // A drag ends with a click event too; only a press that stayed put opens the panel.
        if (justDragged.current) {
            justDragged.current = false;
            return;
        }
        onToggle();
    };

    return (
        <Button
            ref={launcher}
            type="button"
            variant="outline"
            onClick={handleClick}
            aria-expanded={open}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={(e) => endDrag(e.currentTarget)}
            onPointerCancel={(e) => endDrag(e.currentTarget)}
            onTransitionEnd={(e) => {
                if (e.propertyName === 'transform') e.currentTarget.style.transition = '';
            }}
            aria-label={ariaLabel}
            title={title}
            className={cn(
                'fixed z-50 h-14 w-14 touch-none rounded-full border-2 bg-white p-0 hover:bg-white active:bg-white will-change-transform',
                'transition-[scale,box-shadow,border-color] duration-200 ease-out motion-reduce:transition-none',
                LAUNCHER_AT[corner],
                dragging
                    ? 'scale-110 cursor-grabbing border-primary shadow-2xl'
                    : 'cursor-grab shadow-xl hover:scale-105 active:scale-95',
                !dragging && (open ? 'border-primary' : 'border-slate-200 hover:border-primary'),
            )}
        >
            <SuperheroLogo size={42} title={title}/>
        </Button>
    );
}
