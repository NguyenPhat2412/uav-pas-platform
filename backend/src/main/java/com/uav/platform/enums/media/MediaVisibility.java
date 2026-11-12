package com.uav.platform.enums.media;

/**
 * Who may read a media file (BA 13.4). Files are always served through short-lived signed URLs; the
 * level only widens the readers. PRIVATE (default): the uploader, media managers and readers of the
 * linked resource. PROTECTED: also every user who holds MEDIA_VIEW. PUBLIC: every signed-in user.
 */
public enum MediaVisibility {
    PRIVATE,
    PROTECTED,
    PUBLIC
}
