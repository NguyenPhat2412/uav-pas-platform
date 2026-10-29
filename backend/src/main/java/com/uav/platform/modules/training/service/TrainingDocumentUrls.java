package com.uav.platform.modules.training.service;

import com.uav.platform.error.SystemException;

import java.net.URI;
import java.net.URISyntaxException;
import java.util.Arrays;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.regex.Pattern;

/**
 * Linked DOCUMENT lessons: only https Google Docs, Slides and Sheets links (docs.google.com) and Drive file links
 * (drive.google.com/file/d/ID) are accepted. Learners only ever receive the embeddable {@code /preview} URL
 * rebuilt from the parsed file id, never the link as entered.
 */
public final class TrainingDocumentUrls {
    public static final String INVALID_CODE = "TRAINING_LESSON_DOCUMENT_URL_INVALID";
    public static final String PROVIDER_GOOGLE = "GOOGLE";

    /** Google file ids are long URL-safe tokens; short values such as the "e" of published links are refused. */
    private static final Pattern FILE_ID = Pattern.compile("[A-Za-z0-9_-]{20,200}");

    private static final Set<String> DOCS_KINDS =
            Set.of("document", "presentation", "spreadsheets");

    private TrainingDocumentUrls() {}

    /**
     * @return {@code https://docs.google.com/{document|presentation|spreadsheets}/d/{id}/preview} or
     *     {@code https://drive.google.com/file/d/{id}/preview}
     * @throws SystemException 400 TRAINING_LESSON_DOCUMENT_URL_INVALID for any other host or an unrecognised link
     */
    public static String toPreviewUrl(String raw) {
        if (raw == null || raw.isBlank()) throw invalid();
        URI uri;
        try {
            uri = new URI(raw.trim());
        } catch (URISyntaxException ex) {
            throw invalid();
        }
        String scheme = uri.getScheme() == null ? "" : uri.getScheme().toLowerCase(Locale.ROOT);
        if (!scheme.equals("https")) throw invalid();
        if (uri.getRawUserInfo() != null || uri.getHost() == null) throw invalid();
        if (uri.getPort() != -1 && uri.getPort() != 443) throw invalid();
        String host = uri.getHost().toLowerCase(Locale.ROOT);
        List<String> segments =
                uri.getPath() == null
                        ? List.of()
                        : Arrays.stream(uri.getPath().split("/"))
                                .filter(s -> !s.isEmpty())
                                .toList();

        return switch (host) {
            case "docs.google.com" -> docs(segments);
            case "drive.google.com" -> drive(segments);
            default -> throw invalid();
        };
    }

    /** docs.google.com/{document|presentation|spreadsheets}/d/{id}[/...]; nothing else. */
    private static String docs(List<String> segments) {
        if (segments.size() < 3
                || !DOCS_KINDS.contains(segments.get(0))
                || !segments.get(1).equals("d")) throw invalid();
        return "https://docs.google.com/"
                + segments.get(0)
                + "/d/"
                + fileId(segments.get(2))
                + "/preview";
    }

    /** drive.google.com/file/d/{id}[/view|/preview|/edit]; nothing else. */
    private static String drive(List<String> segments) {
        if (segments.size() < 3 || !segments.get(0).equals("file") || !segments.get(1).equals("d"))
            throw invalid();
        return "https://drive.google.com/file/d/" + fileId(segments.get(2)) + "/preview";
    }

    private static String fileId(String id) {
        if (!FILE_ID.matcher(id).matches()) throw invalid();
        return id;
    }

    private static SystemException invalid() {
        return SystemException.badRequest(
                        "Chỉ hỗ trợ liên kết https tới Google Docs, Slides, Sheets (docs.google.com) hoặc tệp Google Drive (drive.google.com/file/d/…).",
                        INVALID_CODE)
                .at("documentUrl");
    }
}
