package com.uav.platform.dto.response.storage;

import com.uav.platform.enums.storage.StoredFileKind;
import com.uav.platform.enums.storage.StoredFileModule;

import java.util.List;

/** Totals over every stored file, per module and per kind, plus the largest files. */
public record AdminFileSummaryResponse(
        Total total,
        Total unused,
        Total pending,
        List<ModuleTotal> byModule,
        List<KindTotal> byKind,
        List<AdminFileResponse> largest) {

    public record Total(long count, long bytes) {}

    public record ModuleTotal(
            StoredFileModule module, long count, long bytes, long unusedCount, long pendingCount) {}

    public record KindTotal(StoredFileKind kind, long count, long bytes) {}
}
