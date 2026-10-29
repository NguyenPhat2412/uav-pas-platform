package com.uav.platform.modules.training.dto.response;

import com.fasterxml.jackson.annotation.JsonInclude;

import lombok.Builder;

import java.util.List;

/** The lesson player: media with per-request signed URLs, the learner's state and neighbours. */
@Builder
public record TrainingLessonDetailResponse(
        Long id,
        String courseCode,
        String courseSlug,
        String title,
        String type,
        Integer durationMinutes,
        Video video,
        List<Slide> slides,
        Document document,
        List<Resource> resources,
        String bodyMarkdown,
        boolean completed,
        int positionSeconds,
        Long prevLessonId,
        Long nextLessonId) {

    /**
     * kind FILE: signed GET url (null when storage is not configured) and contentType; kind EXTERNAL: embed
     * url only.
     */
    public record Video(
            String kind,
            String url,
            @JsonInclude(JsonInclude.Include.NON_NULL) String contentType) {

        public static Video file(String url, String contentType) {
            return new Video("FILE", url, contentType);
        }

        public static Video external(String embedUrl) {
            return new Video("EXTERNAL", embedUrl, null);
        }
    }

    public record Slide(String url, String caption) {}

    /** PDF of a DOCUMENT lesson; url is null when storage is not configured. */
    public record Document(String url, String fileName, long size) {}

    public record Resource(String title, String url, String contentType, long size) {}
}
