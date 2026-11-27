package com.uav.platform.service;

import com.uav.platform.common.dto.response.PageResponse;
import com.uav.platform.dto.request.AdminFileQueryRequest;
import com.uav.platform.dto.response.AdminFileDownloadResponse;
import com.uav.platform.dto.response.AdminFileResponse;
import com.uav.platform.dto.response.AdminFileSummaryResponse;

/**
 * Admin view over every object the platform keeps in object storage, built from the database tables that record
 * them (media_assets, training_assets). Listing never calls the storage provider.
 */
public interface AdminFileService {
    PageResponse<AdminFileResponse> list(
            AdminFileQueryRequest query, int page, int size, String sort);

    AdminFileSummaryResponse summary();

    AdminFileDownloadResponse downloadUrl(String id, String actor);

    /** Deletes an UNUSED or PENDING file (object and record); IN_USE and mission media answer 409. */
    void delete(String id, String actor);
}
