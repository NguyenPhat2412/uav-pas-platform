package com.uav.platform.dto.record;

public record DriveUploadedFile(
        String driveFileId,
        String driveFolderId,
        String moduleFolder,
        String fileName,
        String contentType,
        long sizeBytes) {}
