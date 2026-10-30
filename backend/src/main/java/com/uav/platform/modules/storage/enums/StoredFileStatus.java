package com.uav.platform.modules.storage.enums;

/**
 * IN_USE: something in the database references the file. UNUSED: the upload finished but nothing references it.
 * PENDING: the upload was registered and never confirmed.
 */
public enum StoredFileStatus {
    IN_USE,
    UNUSED,
    PENDING
}
