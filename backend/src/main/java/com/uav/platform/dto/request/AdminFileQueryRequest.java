package com.uav.platform.dto.request;

import com.uav.platform.enums.StoredFileKind;
import com.uav.platform.enums.StoredFileModule;
import com.uav.platform.enums.StoredFileStatus;

/** Optional file manager filters; q matches file name, storage key, linked item and owner. */
public record AdminFileQueryRequest(
        StoredFileModule module, StoredFileKind type, StoredFileStatus status, String q) {}
