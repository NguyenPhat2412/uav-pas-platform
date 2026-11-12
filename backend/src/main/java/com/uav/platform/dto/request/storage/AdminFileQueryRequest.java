package com.uav.platform.dto.request.storage;

import com.uav.platform.enums.storage.StoredFileKind;
import com.uav.platform.enums.storage.StoredFileModule;
import com.uav.platform.enums.storage.StoredFileStatus;

/** Optional file manager filters; q matches file name, storage key, linked item and owner. */
public record AdminFileQueryRequest(
        StoredFileModule module, StoredFileKind type, StoredFileStatus status, String q) {}
