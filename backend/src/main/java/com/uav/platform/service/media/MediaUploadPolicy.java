package com.uav.platform.service.media;

import static com.uav.platform.common.constant.MediaConstants.APPLICATION_PDF;
import static com.uav.platform.common.constant.MediaConstants.IMAGE_JPEG;
import static com.uav.platform.common.constant.MediaConstants.IMAGE_PNG;
import static com.uav.platform.common.constant.MediaConstants.IMAGE_WEBP;
import static com.uav.platform.common.constant.MediaConstants.VIDEO_MP4;
import static com.uav.platform.common.constant.MediaConstants.VIDEO_WEBM;

import com.uav.platform.error.SystemException;

import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;
import java.util.Map;

/** Decimal byte limits and bounded format identification, not antivirus or full decoding. */
public final class MediaUploadPolicy {
    private MediaUploadPolicy() {}

    public static final String DESCRIPTION =
            "JPEG/PNG/WebP/PDF: tối đa 100 MB (100000000 byte); MP4/WebM: tối đa 1 GB (1000000000 byte).";
    private static final Map<String, Long> LIMITS =
            Map.of(
                    IMAGE_JPEG,
                    100_000_000L,
                    IMAGE_PNG,
                    100_000_000L,
                    IMAGE_WEBP,
                    100_000_000L,
                    APPLICATION_PDF,
                    100_000_000L,
                    VIDEO_MP4,
                    1_000_000_000L,
                    VIDEO_WEBM,
                    1_000_000_000L);

    public static void validate(String mime, long size) {
        Long limit = LIMITS.get(mime);
        if (limit == null || size < 1 || size > limit)
            throw SystemException.badRequest(
                    DESCRIPTION + " Tệp phải có nội dung và đúng định dạng cho phép.");
    }

    public static boolean expired(LocalDateTime created, LocalDateTime now) {
        return created != null && !created.plusHours(24).isAfter(now);
    }

    public static void requireCurrent(LocalDateTime created) {
        if (expired(created, LocalDateTime.now()))
            throw SystemException.conflict(
                    "Tệp chưa xác nhận đã hết hạn sau 24 giờ. Vui lòng đăng ký và tải lại tệp.");
    }

    public static void validateHeader(String mime, byte[] bytes) {
        boolean valid =
                bytes != null
                        && switch (mime) {
                            case IMAGE_JPEG ->
                                    bytes.length >= 3
                                            && (bytes[0] & 255) == 255
                                            && (bytes[1] & 255) == 216
                                            && (bytes[2] & 255) == 255;
                            case IMAGE_PNG ->
                                    starts(
                                            bytes,
                                            new byte[] {(byte) 137, 80, 78, 71, 13, 10, 26, 10});
                            case IMAGE_WEBP -> ascii(bytes, 0, "RIFF") && ascii(bytes, 8, "WEBP");
                            case APPLICATION_PDF -> ascii(bytes, 0, "%PDF-");
                            case VIDEO_MP4 -> bytes.length >= 12 && ascii(bytes, 4, "ftyp");
                            case VIDEO_WEBM ->
                                    starts(bytes, new byte[] {26, 69, (byte) 223, (byte) 163})
                                            && new String(bytes, StandardCharsets.ISO_8859_1)
                                                    .contains("webm");
                            default -> false;
                        };
        if (!valid)
            throw SystemException.conflict(
                    "Nội dung tệp không khớp định dạng đã đăng ký. Vui lòng xóa và tải lại tệp đúng định dạng.");
    }

    private static boolean starts(byte[] bytes, byte[] prefix) {
        return bytes.length >= prefix.length
                && java.util.Arrays.equals(java.util.Arrays.copyOf(bytes, prefix.length), prefix);
    }

    private static boolean ascii(byte[] bytes, int offset, String expected) {
        return bytes.length >= offset + expected.length()
                && new String(bytes, offset, expected.length(), StandardCharsets.US_ASCII)
                        .equals(expected);
    }
}
