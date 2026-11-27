package com.uav.platform.service;

import com.uav.platform.dto.response.OperationsReportResponse;

import org.springframework.security.core.Authentication;

public interface ReportService {
    OperationsReportResponse getOperationsSummary(Authentication auth);

    String exportOperationsCsv(Authentication auth);
}
