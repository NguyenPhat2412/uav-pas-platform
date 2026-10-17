package com.uav.platform.modules.reporting.service;

import com.uav.platform.modules.reporting.dto.response.OperationsReportResponse;

import org.springframework.security.core.Authentication;

public interface ReportService {
    OperationsReportResponse getOperationsSummary(Authentication auth);

    String exportOperationsCsv(Authentication auth);
}
