package com.uav.platform.modules.reporting.controller;

import com.uav.platform.modules.reporting.dto.response.OperationsReportResponse;
import com.uav.platform.modules.reporting.service.ReportService;

import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.nio.charset.StandardCharsets;

@RestController
@RequestMapping("/api/v1/reports")
public class ReportController {

    private final ReportService reportService;

    public ReportController(ReportService reportService) {
        this.reportService = reportService;
    }

    @GetMapping("/operations-summary")
    @PreAuthorize("@permissionService.has(authentication, 'DASHBOARD_READ')")
    public ResponseEntity<OperationsReportResponse> getOperationsSummary(Authentication auth) {
        return ResponseEntity.ok(reportService.getOperationsSummary(auth));
    }

    @GetMapping(value = "/export-csv", produces = "text/csv")
    @PreAuthorize("@permissionService.has(authentication, 'DASHBOARD_READ')")
    public ResponseEntity<byte[]> exportCsv(Authentication auth) {
        String csvContent = reportService.exportOperationsCsv(auth);
        byte[] bytes = csvContent.getBytes(StandardCharsets.UTF_8);

        return ResponseEntity.ok()
                .header(
                        HttpHeaders.CONTENT_DISPOSITION,
                        "attachment; filename=\"uav_pas_operations_report.csv\"")
                .contentType(MediaType.parseMediaType("text/csv; charset=UTF-8"))
                .body(bytes);
    }
}
