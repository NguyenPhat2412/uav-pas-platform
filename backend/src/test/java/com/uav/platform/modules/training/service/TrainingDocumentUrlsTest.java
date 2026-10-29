package com.uav.platform.modules.training.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

import com.uav.platform.error.SystemException;

import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.junit.jupiter.params.provider.NullAndEmptySource;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.http.HttpStatus;

class TrainingDocumentUrlsTest {

    private static final String ID = "1AbCdEfGhIjKlMnOpQrStUvWxYz0123456789";

    @ParameterizedTest
    @CsvSource({
        "https://docs.google.com/document/d/"
                + ID
                + "/edit?usp=sharing, https://docs.google.com/document/d/"
                + ID
                + "/preview",
        "https://docs.google.com/document/d/"
                + ID
                + ", https://docs.google.com/document/d/"
                + ID
                + "/preview",
        "https://docs.google.com/presentation/d/"
                + ID
                + "/edit#slide=id.p, https://docs.google.com/presentation/d/"
                + ID
                + "/preview",
        "https://docs.google.com/spreadsheets/d/"
                + ID
                + "/edit#gid=0, https://docs.google.com/spreadsheets/d/"
                + ID
                + "/preview",
        "https://drive.google.com/file/d/"
                + ID
                + "/view?usp=sharing, https://drive.google.com/file/d/"
                + ID
                + "/preview",
        "https://drive.google.com/file/d/"
                + ID
                + "/preview, https://drive.google.com/file/d/"
                + ID
                + "/preview",
        "'  https://DOCS.Google.com/document/d/"
                + ID
                + "/edit  ', https://docs.google.com/document/d/"
                + ID
                + "/preview"
    })
    void acceptedLinksBecomePreviewUrls(String input, String expected) {
        assertEquals(expected, TrainingDocumentUrls.toPreviewUrl(input));
    }

    @ParameterizedTest
    @NullAndEmptySource
    @ValueSource(
            strings = {
                "   ",
                "not a url",
                "http://docs.google.com/document/d/" + ID + "/edit",
                "https://docs.google.com:8443/document/d/" + ID,
                "https://user@docs.google.com/document/d/" + ID,
                "https://docs.google.com/forms/d/" + ID + "/viewform",
                "https://docs.google.com/document/d/e/2PACX/pub",
                "https://docs.google.com/document/d/short/edit",
                "https://docs.google.com/document/",
                "https://docs.google.com/document/u/0/d/" + ID + "/edit",
                "https://drive.google.com/file/u/1/d/" + ID + "/view",
                "https://drive.google.com/drive/folders/" + ID,
                "https://drive.google.com/open?id=" + ID,
                "https://docs.google.com.evil.example/document/d/" + ID,
                "https://evil.example/document/d/" + ID,
                "https://www.dropbox.com/s/abc/guide.pdf",
                "javascript:alert(1)"
            })
    void otherLinksAreRejected(String input) {
        SystemException ex =
                assertThrows(SystemException.class, () -> TrainingDocumentUrls.toPreviewUrl(input));
        assertEquals(HttpStatus.BAD_REQUEST, ex.getStatus());
        assertEquals("TRAINING_LESSON_DOCUMENT_URL_INVALID", ex.getCode());
    }
}
