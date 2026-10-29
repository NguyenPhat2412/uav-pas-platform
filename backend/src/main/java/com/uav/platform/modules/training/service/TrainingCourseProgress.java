package com.uav.platform.modules.training.service;

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
     * Next status of the course record after a lesson change. Completing everything marks it COMPLETED; an
     * explicitly un-completed lesson takes a COMPLETED course back to IN_PROGRESS; otherwise it is kept, and a
     * missing or NOT_STARTED record becomes IN_PROGRESS.
     */
    public static String nextRecordStatus(
            String current, boolean courseComplete, boolean lessonUncompleted) {
        if (courseComplete) return COMPLETED;
        if (COMPLETED.equals(current)) return lessonUncompleted ? IN_PROGRESS : COMPLETED;
        return IN_PROGRESS;
    }
}
