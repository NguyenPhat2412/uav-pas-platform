package com.uav.platform.modules.storage.dto.request;

import com.uav.platform.modules.storage.enums.StoredFileKind;
import com.uav.platform.modules.storage.enums.StoredFileModule;
import com.uav.platform.modules.storage.enums.StoredFileStatus;

/** Optional file manager filters; q matches file name, storage key, linked item and owner. */
public record AdminFileQueryRequest(
        StoredFileModule module, StoredFileKind type, StoredFileStatus status, String q) {}
