package com.uav.platform.common.constant;

import java.util.Set;

/** MIME types accepted for uploads (media, avatars, training assets, assistant attachments). */
public final class MediaConstants {
    private MediaConstants() {}

    public static final String IMAGE_JPEG = "image/jpeg";
    public static final String IMAGE_PNG = "image/png";
    public static final String IMAGE_WEBP = "image/webp";
    public static final String VIDEO_MP4 = "video/mp4";
    public static final String VIDEO_WEBM = "video/webm";
    public static final String APPLICATION_PDF = "application/pdf";

    /** The still-image formats every upload path accepts. */
    public static final Set<String> IMAGE_TYPES = Set.of(IMAGE_JPEG, IMAGE_PNG, IMAGE_WEBP);
}
