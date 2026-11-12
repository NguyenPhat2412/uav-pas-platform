package com.uav.platform.service.training;

/**
 * Course progress rules. progressPercent counts completed active lessons over active lessons (rounded down, so
 * 100 only when every lesson is done). A course is complete when it has lessons, all of them are done and the
 * checklist, if any, is fully ticked.
 */
public final class TrainingCourseProgress {
    public static final String NOT_STARTED = "NOT_STARTED";
    public static final String IN_PROGRESS = "IN_PROGRESS";
    public static final String COMPLETED = "COMPLETED";

    private TrainingCourseProgress() {}

    public static int percent(int completedLessons, int lessonCount, String recordStatus) {
        if (lessonCount <= 0) return COMPLETED.equals(recordStatus) ? 100 : 0;
        int done = Math.min(Math.max(completedLessons, 0), lessonCount);
        return (int) ((done * 100L) / lessonCount);
    }

    public static boolean courseComplete(
            int completedLessons, int lessonCount, int checklistSize, int checkedSteps) {
        return lessonCount > 0
                && completedLessons >= lessonCount
                && (checklistSize == 0 || checkedSteps >= checklistSize);
    }

    /**
     * Status shown on the course card: the stored course record wins (it also reflects the checklist flow);
     * otherwise any lesson activity means IN_PROGRESS.
     */
    public static String status(String recordStatus, boolean anyLessonActivity) {
        if (COMPLETED.equals(recordStatus)) return COMPLETED;
        if (IN_PROGRESS.equals(recordStatus) || anyLessonActivity) return IN_PROGRESS;
        return NOT_STARTED;
    }

    /**
     * Status the stored course record must have, derived from the learner's state. It is recomputed whenever
     * that state changes (lesson completed, checklist ticked) and for every learner when an administrator
     * changes the course's active lessons, so the record never goes stale. A completion is kept: once the
     * record is COMPLETED it stays COMPLETED, whatever lessons or steps change later.
     *
     * <p>A course with active lessons is COMPLETED only when every active lesson is done and the checklist, if
     * any, is fully ticked; otherwise it is IN_PROGRESS once the learner did anything (lesson activity, a
     * ticked step, an earlier record status) and NOT_STARTED before that.
     *
     * <p>A course without active lessons keeps the checklist-only rule: a fully ticked checklist completes it,
     * and a checklist-free course keeps its stored status (it is completed explicitly through the overview
     * endpoint).
     */
    public static String recordStatus(
            String current,
            int completedLessons,
            int lessonCount,
            int checklistSize,
            int checkedSteps,
            boolean lessonActivity) {
        if (COMPLETED.equals(current)) return COMPLETED;
        boolean started = lessonActivity || checkedSteps > 0 || IN_PROGRESS.equals(current);
        if (lessonCount > 0) {
            if (courseComplete(completedLessons, lessonCount, checklistSize, checkedSteps))
                return COMPLETED;
            return started ? IN_PROGRESS : NOT_STARTED;
        }
        if (checklistSize > 0) {
            if (checkedSteps >= checklistSize) return COMPLETED;
            return started ? IN_PROGRESS : NOT_STARTED;
        }
        return current == null ? NOT_STARTED : current;
    }
}
