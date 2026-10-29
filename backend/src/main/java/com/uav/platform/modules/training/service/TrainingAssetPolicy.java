package com.uav.platform.modules.training.service;

import com.uav.platform.error.SystemException;
import com.uav.platform.modules.media.service.MediaUploadPolicy;

import java.util.Arrays;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;

/** Allowed types and decimal byte limits for training uploads, and their object keys under training/. */
public final class TrainingAssetPolicy {
    public static final long MAX_VIDEO_BYTES = 500_000_000L;
    public static final long MAX_IMAGE_BYTES = 10_000_000L;
    public static final long MAX_PDF_BYTES = 50_000_000L;
    public static final long MAX_OFFICE_BYTES = 50_000_000L;

    public static final String DOCX =
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
    public static final String PPTX =
            "application/vnd.openxmlformats-officedocument.presentationml.presentation";
    public static final String XLSX =
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

    /** Word, PowerPoint and Excel files: valid only as downloadable lesson resources. */
    public static final List<String> OFFICE_TYPES = List.of(DOCX, PPTX, XLSX);

    public static final String DESCRIPTION =
            "Video MP4/WebM: tối đa 500 MB (500000000 byte); PDF và Word/PowerPoint/Excel (.docx, .pptx, .xlsx): tối đa 50 MB (50000000 byte); ảnh PNG/JPEG/WebP: tối đa 10 MB (10000000 byte).";

    private static final Map<String, Long> LIMITS =
            Map.of(
                    "video/mp4",
                    MAX_VIDEO_BYTES,
                    "video/webm",
                    MAX_VIDEO_BYTES,
                    "image/png",
                    MAX_IMAGE_BYTES,
                    "image/jpeg",
                    MAX_IMAGE_BYTES,
                    "image/webp",
                    MAX_IMAGE_BYTES,
                    "application/pdf",
                    MAX_PDF_BYTES,
                    DOCX,
                    MAX_OFFICE_BYTES,
                    PPTX,
                    MAX_OFFICE_BYTES,
                    XLSX,
                    MAX_OFFICE_BYTES);

    /** Local file header of a ZIP archive, which every Office Open XML file is. */
    private static final byte[] ZIP_HEADER = {'P', 'K', 3, 4};

    private TrainingAssetPolicy() {}

    /** Lower-cased content type without parameters, e.g. "video/mp4" for "Video/MP4; codecs=avc1". */
    public static String baseType(String contentType) {
        if (contentType == null) return "";
        int semicolon = contentType.indexOf(';');
        return (semicolon < 0 ? contentType : contentType.substring(0, semicolon))
                .trim()
                .toLowerCase(Locale.ROOT);
    }

    /** @return the normalised content type */
    public static String validate(String contentType, long size) {
        String type = baseType(contentType);
        Long limit = LIMITS.get(type);
        if (limit == null)
            throw SystemException.badRequest(
                            "Định dạng tệp không được hỗ trợ. " + DESCRIPTION,
                            "TRAINING_ASSET_TYPE_UNSUPPORTED")
                    .at("contentType");
        if (size < 1 || size > limit)
            throw SystemException.badRequest(
                            "Dung lượng tệp không hợp lệ. " + DESCRIPTION,
                            "TRAINING_ASSET_SIZE_INVALID")
                    .at("size");
        return type;
    }

    /**
     * Bounded format identification of the first bytes of an upload: Office files must be ZIP archives, every
     * other type is checked by the shared media rule.
     *
     * @throws SystemException when the bytes do not match the declared type
     */
    public static void validateHeader(String contentType, byte[] header) {
        String type = baseType(contentType);
        if (OFFICE_TYPES.contains(type)) {
            if (header == null
                    || header.length < ZIP_HEADER.length
                    || !Arrays.equals(Arrays.copyOf(header, ZIP_HEADER.length), ZIP_HEADER))
                throw SystemException.conflict(
                        "Nội dung tệp không khớp định dạng đã đăng ký.", "TRAINING_ASSET_MISMATCH");
            return;
        }
        MediaUploadPolicy.validateHeader(type, header);
    }

    public static String objectKey(String fileName) {
        String safe = fileName == null ? "" : fileName.trim().replaceAll("[^a-zA-Z0-9._-]", "_");
        if (safe.length() > 120) safe = safe.substring(safe.length() - 120);
        if (safe.isEmpty()) safe = "file";
        return "training/" + UUID.randomUUID() + "-" + safe;
    }
}
