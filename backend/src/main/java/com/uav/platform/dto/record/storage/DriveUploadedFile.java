package com.uav.platform.dto.record.storage;

public record DriveUploadedFile(
        String driveFileId,
        String driveFolderId,
        String moduleFolder,
        String fileName,
        String contentType,
        long sizeBytes) {}
