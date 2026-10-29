package com.uav.platform.modules.training.service;

import com.uav.platform.error.SystemException;

import java.net.URI;
import java.net.URISyntaxException;
import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;
import java.util.Arrays;
import java.util.List;
import java.util.Locale;
import java.util.regex.Pattern;

/**
 * External lesson videos: only YouTube (youtube.com, www.youtube.com, youtu.be) and Vimeo (vimeo.com) links are
 * accepted, and learners only ever receive the provider's embed URL built from the parsed video id, never the
 * link as entered.
 */
public final class TrainingVideoUrls {
    public static final String UNSUPPORTED_CODE = "TRAINING_VIDEO_URL_UNSUPPORTED";

    private static final Pattern YOUTUBE_ID = Pattern.compile("[A-Za-z0-9_-]{11}");
    private static final Pattern VIMEO_ID = Pattern.compile("[0-9]{1,15}");
    private static final Pattern VIMEO_HASH = Pattern.compile("[0-9a-f]{6,32}");
    private static final List<String> YOUTUBE_ID_PATHS = List.of("embed", "shorts", "live", "v");

    private TrainingVideoUrls() {}

    /**
     * @return {@code https://www.youtube-nocookie.com/embed/{id}} or {@code https://player.vimeo.com/video/{id}}
     *     (plus {@code ?h={hash}} for an unlisted Vimeo link)
     * @throws SystemException 400 TRAINING_VIDEO_URL_UNSUPPORTED for any other host or an unrecognised link
     */
    public static String toEmbedUrl(String raw) {
        if (raw == null || raw.isBlank()) throw unsupported();
        URI uri;
        try {
            uri = new URI(raw.trim());
        } catch (URISyntaxException ex) {
            throw unsupported();
        }
        String scheme = uri.getScheme() == null ? "" : uri.getScheme().toLowerCase(Locale.ROOT);
        if (!scheme.equals("https") && !scheme.equals("http")) throw unsupported();
        if (uri.getRawUserInfo() != null || uri.getHost() == null) throw unsupported();
        if (uri.getPort() != -1 && uri.getPort() != 443 && uri.getPort() != 80) throw unsupported();
        String host = uri.getHost().toLowerCase(Locale.ROOT);
        List<String> segments =
                uri.getPath() == null
                        ? List.of()
                        : Arrays.stream(uri.getPath().split("/"))
                                .filter(s -> !s.isEmpty())
                                .toList();

        return switch (host) {
            case "youtube.com", "www.youtube.com" -> youtube(youtubeId(segments, uri));
            case "youtu.be" -> youtube(segments.size() == 1 ? segments.get(0) : null);
            case "vimeo.com" -> vimeo(segments);
            default -> throw unsupported();
        };
    }

    private static String youtubeId(List<String> segments, URI uri) {
        if (segments.equals(List.of("watch"))) return queryParam(uri.getRawQuery(), "v");
        if (segments.size() == 2 && YOUTUBE_ID_PATHS.contains(segments.get(0)))
            return segments.get(1);
        return null;
    }

    private static String youtube(String id) {
        if (id == null || !YOUTUBE_ID.matcher(id).matches()) throw unsupported();
        return "https://www.youtube-nocookie.com/embed/" + id;
    }

    /** vimeo.com/{id}, vimeo.com/{id}/{hash}, vimeo.com/channels/{c}/{id}, vimeo.com/groups/{g}/videos/{id}. */
    private static String vimeo(List<String> segments) {
        String id = null;
        String hash = null;
        if (segments.size() == 1) id = segments.get(0);
        else if (segments.size() == 2 && VIMEO_ID.matcher(segments.get(0)).matches()) {
            id = segments.get(0);
            hash = segments.get(1);
            if (!VIMEO_HASH.matcher(hash).matches()) throw unsupported();
        } else if (segments.size() == 3 && segments.get(0).equals("channels")) id = segments.get(2);
        else if (segments.size() == 4
                && segments.get(0).equals("groups")
                && segments.get(2).equals("videos")) id = segments.get(3);
        if (id == null || !VIMEO_ID.matcher(id).matches()) throw unsupported();
        return "https://player.vimeo.com/video/" + id + (hash == null ? "" : "?h=" + hash);
    }

    private static String queryParam(String rawQuery, String name) {
        if (rawQuery == null) return null;
        for (String pair : rawQuery.split("&")) {
            int eq = pair.indexOf('=');
            if (eq > 0 && pair.substring(0, eq).equals(name))
                return URLDecoder.decode(pair.substring(eq + 1), StandardCharsets.UTF_8);
        }
        return null;
    }

    private static SystemException unsupported() {
        return SystemException.badRequest(
                        "Chỉ hỗ trợ liên kết video YouTube (youtube.com, youtu.be) hoặc Vimeo (vimeo.com).",
                        UNSUPPORTED_CODE)
                .at("videoUrl");
    }
}
