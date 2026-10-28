package com.uav.platform.modules.assistant.service.impl;

import com.uav.platform.error.SystemException;
import com.uav.platform.modules.assistant.dto.record.ChatImage;
import com.uav.platform.modules.assistant.dto.request.AssistantAttachmentRequest;

import java.util.ArrayList;
import java.util.Base64;
import java.util.List;

/** Decodes chat attachments and accepts only real JPEG, PNG or WebP images within the size caps. */
public final class AssistantAttachmentOperations {
    static final int MAX_IMAGES = 8;

    /** The browser re-encodes to at most 1280 px, so a genuine attachment stays well under this. */
    static final int MAX_IMAGE_BYTES = 1_500_000;

    static final int MAX_TOTAL_BYTES = 8_000_000;

    private AssistantAttachmentOperations() {}

    public static List<ChatImage> validate(List<AssistantAttachmentRequest> attachments) {
        if (attachments == null || attachments.isEmpty()) return List.of();
        if (attachments.size() > MAX_IMAGES)
            throw SystemException.badRequest(
                    "Too many attachments", "ASSISTANT_ATTACHMENT_TOO_MANY");
        List<ChatImage> images = new ArrayList<>(attachments.size());
        long total = 0;
        for (AssistantAttachmentRequest a : attachments) {
            byte[] data;
            try {
                data = Base64.getDecoder().decode(a.data());
            } catch (IllegalArgumentException e) {
                throw SystemException.badRequest(
                        "Attachment is not valid base64", "ASSISTANT_ATTACHMENT_INVALID");
            }
            if (data.length > MAX_IMAGE_BYTES)
                throw SystemException.badRequest(
                        "Attachment is too large", "ASSISTANT_ATTACHMENT_TOO_LARGE");
            total += data.length;
            if (total > MAX_TOTAL_BYTES)
                throw SystemException.badRequest(
                        "Attachments are too large", "ASSISTANT_ATTACHMENT_TOO_LARGE");
            String mime = sniff(data);
            if (mime == null)
                throw SystemException.badRequest(
                        "Only JPEG, PNG or WebP images are accepted",
                        "ASSISTANT_ATTACHMENT_INVALID");
            String name = a.name() == null ? null : a.name().strip().replaceAll("[\\p{Cntrl}]", "");
            images.add(
                    new ChatImage(
                            a.kind(), mime, name == null || name.isEmpty() ? null : name, data));
        }
        return images;
    }

    /** Image type from the file signature, or null when it is not an accepted image. */
    static String sniff(byte[] d) {
        if (d.length >= 3
                && (d[0] & 0xFF) == 0xFF
                && (d[1] & 0xFF) == 0xD8
                && (d[2] & 0xFF) == 0xFF) return "image/jpeg";
        if (d.length >= 8 && (d[0] & 0xFF) == 0x89 && d[1] == 'P' && d[2] == 'N' && d[3] == 'G')
            return "image/png";
        if (d.length >= 12
                && d[0] == 'R'
                && d[1] == 'I'
                && d[2] == 'F'
                && d[3] == 'F'
                && d[8] == 'W'
                && d[9] == 'E'
                && d[10] == 'B'
                && d[11] == 'P') return "image/webp";
        return null;
    }

    public static String dataUrl(String mimeType, byte[] data) {
        return "data:" + mimeType + ";base64," + Base64.getEncoder().encodeToString(data);
    }
}
