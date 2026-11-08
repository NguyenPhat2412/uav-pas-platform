'use client';

import {useCallback, useEffect, useRef, useState} from 'react';
import type {ReactNode} from 'react';
import {VideoOff} from 'lucide-react';
import type {UpdateTrainingLessonProgressPayload} from '@/types/training/training.types';
import {
    isPositionSaveDue,
    isVideoEmbedUrl,
    isVideoWatched,
    resumePosition,
} from '@/utils/training/course-helpers';

/** The player's media frame: 16:9, never taller than 70 % of the viewport. */
export const STAGE_FRAME = 'aspect-video max-h-[70vh] w-full';

/**
 * Shown in the player frame when there is nothing to play (no media, or storage not configured).
 * `dark` sits on the black video/slide stage, `light` on the reading surface.
 */
export function LessonMediaEmpty({
    icon,
    title,
    detail,
    tone = 'dark',
}: {
    icon?: ReactNode;
    title: string;
    detail?: string;
    tone?: 'dark' | 'light';
}) {
    const dark = tone === 'dark';
    return (
        <div className={`flex ${STAGE_FRAME} flex-col items-center justify-center gap-2 px-6 text-center ${dark ? 'bg-[#1c1d1f]' : 'bg-slate-100'}`}>
            <span className={dark ? 'text-white/40' : 'text-slate-400'}>
                {icon ?? <VideoOff className="h-8 w-8" strokeWidth={1.5} />}
            </span>
            <p className={`text-sm font-semibold ${dark ? 'text-white' : 'text-slate-700'}`}>{title}</p>
            {detail && <p className={`max-w-md text-xs ${dark ? 'text-white/60' : 'text-slate-500'}`}>{detail}</p>}
        </div>
    );
}

/** A position save; `completed` goes along only when it is true, so a save never un-completes a lesson. */
function positionPayload(currentTime: number, completed: boolean): UpdateTrainingLessonProgressPayload {
    const positionSeconds = Math.floor(currentTime);
    return completed ? {completed: true, positionSeconds} : {positionSeconds};
}

/**
 * An uploaded video. Resumes from the saved position, saves the position every ~15 s while playing
 * and on pause, and reports the lesson complete at 90 % or at the end. Mount it with `key={lessonId}`:
 * the signed URL and the start position are read once, so a refreshed URL does not restart playback.
 */
export function VideoFileLesson({
    url,
    contentType,
    completed,
    positionSeconds,
    onSave,
}: {
    url: string;
    contentType: string;
    completed: boolean;
    positionSeconds: number;
    onSave: (payload: UpdateTrainingLessonProgressPayload) => void;
}) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const [source] = useState(url);
    const [startAt] = useState(positionSeconds);
    const [failed, setFailed] = useState(false);
    const lastSavedAt = useRef(0);
    const completedRef = useRef(completed);
    const onSaveRef = useRef(onSave);

    useEffect(() => {
        onSaveRef.current = onSave;
        if (completed) completedRef.current = true;
    }, [onSave, completed]);

    const save = useCallback((markComplete: boolean) => {
        const video = videoRef.current;
        if (!video) return;
        if (markComplete) completedRef.current = true;
        lastSavedAt.current = Date.now();
        onSaveRef.current(positionPayload(video.currentTime, completedRef.current));
    }, []);

    // Leaving the lesson (next lesson, another page) keeps the place too.
    useEffect(() => {
        const video = videoRef.current;
        lastSavedAt.current = Date.now();
        return () => {
            if (video && video.currentTime > 0 && !video.ended) {
                onSaveRef.current(positionPayload(video.currentTime, completedRef.current));
            }
        };
    }, []);

    if (failed) {
        return (
            <LessonMediaEmpty
                title="Không phát được video"
                detail="Liên kết xem có thể đã hết hạn. Tải lại trang để lấy liên kết mới."
            />
        );
    }

    return (
        <div className={`${STAGE_FRAME} bg-black`}>
            <video
                ref={videoRef}
                controls
                preload="metadata"
                playsInline
                className="h-full w-full"
                onLoadedMetadata={event => {
                    const start = resumePosition(startAt, event.currentTarget.duration);
                    if (start > 0) event.currentTarget.currentTime = start;
                }}
                onTimeUpdate={event => {
                    const video = event.currentTarget;
                    if (!completedRef.current && isVideoWatched(video.currentTime, video.duration)) save(true);
                    else if (!video.paused && isPositionSaveDue(lastSavedAt.current, Date.now())) save(false);
                }}
                onPause={event => {
                    if (!event.currentTarget.ended) save(false);
                }}
                onEnded={() => save(true)}
                onError={() => setFailed(true)}
            >
                <source src={source} type={contentType || undefined} />
            </video>
        </div>
    );
}

/** A YouTube or Vimeo embed. Completion is the learner's call ("Đánh dấu đã xem"). */
export function ExternalVideoLesson({url, title}: {url: string; title: string}) {
    if (!isVideoEmbedUrl(url)) {
        return <LessonMediaEmpty title="Liên kết video không hợp lệ" detail="Chỉ phát được video YouTube hoặc Vimeo." />;
    }
    return (
        <div className={`relative ${STAGE_FRAME} bg-black`}>
            <iframe
                src={url}
                title={title}
                allow="fullscreen; picture-in-picture"
                allowFullScreen
                referrerPolicy="strict-origin-when-cross-origin"
                className="absolute inset-0 h-full w-full border-0"
            />
        </div>
    );
}
