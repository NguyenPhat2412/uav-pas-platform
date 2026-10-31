package com.uav.platform.dto.response.training;

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

    /**
     * Source of a DOCUMENT lesson. kind FILE: uploaded PDF with a signed GET url (null when storage is not
     * configured), fileName and size; kind EMBED: the embeddable /preview url of a linked Google file and its
     * provider.
     */
    public record Document(
            String kind,
            String url,
            @JsonInclude(JsonInclude.Include.NON_NULL) String fileName,
            @JsonInclude(JsonInclude.Include.NON_NULL) Long size,
            @JsonInclude(JsonInclude.Include.NON_NULL) String provider) {

        public static Document file(String url, String fileName, long size) {
            return new Document("FILE", url, fileName, size, null);
        }

        public static Document embed(String previewUrl, String provider) {
            return new Document("EMBED", previewUrl, null, null, provider);
        }
    }

    public record Resource(String title, String url, String contentType, long size) {}
}
