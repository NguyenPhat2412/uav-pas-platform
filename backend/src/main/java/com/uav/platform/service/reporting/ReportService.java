package com.uav.platform.service.reporting;

import com.uav.platform.dto.response.reporting.OperationsReportResponse;

import org.springframework.security.core.Authentication;

public interface ReportService {
    OperationsReportResponse getOperationsSummary(Authentication auth);

    String exportOperationsCsv(Authentication auth);
}
