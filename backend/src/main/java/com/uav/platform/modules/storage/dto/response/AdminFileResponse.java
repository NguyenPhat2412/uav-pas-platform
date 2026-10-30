package com.uav.platform.modules.storage.dto.response;

import com.uav.platform.modules.storage.enums.StoredFileKind;
import com.uav.platform.modules.storage.enums.StoredFileModule;
import com.uav.platform.modules.storage.enums.StoredFileStatus;

import java.time.LocalDateTime;

/**
 * One stored object as the admin file manager shows it. id is "MODULE:dbId". deletable is true only for UNUSED or
 * PENDING files outside mission media (read-only here) whose upload window has closed.
 */
public record AdminFileResponse(
        String id,
        StoredFileModule module,
        String fileName,
        String contentType,
        StoredFileKind kind,
        long sizeBytes,
        String storageKey,
        Owner owner,
        LinkedTo linkedTo,
        StoredFileStatus status,
        boolean deletable,
        LocalDateTime createdAt) {

    /** id is null when the uploader's account no longer exists; name then holds the stored username. */
    public record Owner(Long id, String name) {}

    /** type is MISSION, COURSE, USER, STATION, UAV or EQUIPMENT; slug is set for courses. */
    public record LinkedTo(String type, Long id, String label, String slug) {}
}
