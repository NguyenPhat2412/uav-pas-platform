package com.uav.platform.modules.training.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

import com.uav.platform.error.SystemException;

import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.junit.jupiter.params.provider.NullAndEmptySource;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.http.HttpStatus;

class TrainingVideoUrlsTest {

    @ParameterizedTest
    @CsvSource({
        "https://www.youtube.com/watch?v=dQw4w9WgXcQ, https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ",
        "https://youtube.com/watch?feature=share&v=dQw4w9WgXcQ&t=42, https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ",
        "http://www.youtube.com/watch?v=dQw4w9WgXcQ, https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ",
        "https://youtu.be/dQw4w9WgXcQ, https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ",
        "https://m.youtube.com/watch?v=dQw4w9WgXcQ, https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ",
        "https://m.youtube.com/watch?v=dQw4w9WgXcQ&feature=share, https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ",
        "https://youtu.be/dQw4w9WgXcQ?si=abc123, https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ",
        "https://www.youtube.com/embed/dQw4w9WgXcQ, https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ",
        "https://www.youtube.com/shorts/dQw4w9WgXcQ, https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ",
        "'  https://WWW.YouTube.com/live/dQw4w9WgXcQ  ', https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ",
        "https://vimeo.com/76979871, https://player.vimeo.com/video/76979871",
        "https://vimeo.com/76979871/8272103f6e, https://player.vimeo.com/video/76979871?h=8272103f6e",
        "https://vimeo.com/channels/staffpicks/76979871, https://player.vimeo.com/video/76979871",
        "https://vimeo.com/groups/motion/videos/76979871, https://player.vimeo.com/video/76979871"
    })
    void acceptedLinksBecomeEmbedUrls(String input, String expected) {
        assertEquals(expected, TrainingVideoUrls.toEmbedUrl(input));
    }

    @ParameterizedTest
    @NullAndEmptySource
    @ValueSource(
            strings = {
                "   ",
                "not a url",
                "https://m.youtube.com/watch?v=short",
                "https://m.youtube.com.evil.example/watch?v=dQw4w9WgXcQ",
                "https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ",
                "https://player.vimeo.com/video/76979871",
                "https://youtube.com.evil.example/watch?v=dQw4w9WgXcQ",
                "https://notyoutube.com/watch?v=dQw4w9WgXcQ",
                "https://youtube.com@evil.example/watch?v=dQw4w9WgXcQ",
                "https://evil.example/?u=https://youtu.be/dQw4w9WgXcQ",
                "javascript:alert(1)",
                "ftp://youtube.com/watch?v=dQw4w9WgXcQ",
                "//youtu.be/dQw4w9WgXcQ",
                "https://youtube.com:8443/watch?v=dQw4w9WgXcQ",
                "https://www.youtube.com/watch?v=short",
                "https://www.youtube.com/watch?v=dQw4w9WgXcQ%22onerror",
                "https://www.youtube.com/watch",
                "https://www.youtube.com/channel/UC123",
                "https://youtu.be/",
                "https://youtu.be/dQw4w9WgXcQ/extra",
                "https://vimeo.com/abc",
                "https://vimeo.com/76979871/not-a-hash!",
                "https://vimeo.com/",
                "https://www.vimeo.com/76979871",
                "https://drive.google.com/file/d/abc/view",
                "https://example.com/video.mp4"
            })
    void everythingElseIsRejected(String input) {
        SystemException ex =
                assertThrows(SystemException.class, () -> TrainingVideoUrls.toEmbedUrl(input));
        assertEquals(HttpStatus.BAD_REQUEST, ex.getStatus());
        assertEquals("TRAINING_VIDEO_URL_UNSUPPORTED", ex.getCode());
        assertEquals("videoUrl", ex.getField());
    }
}
