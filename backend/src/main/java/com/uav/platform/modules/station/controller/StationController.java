package com.uav.platform.modules.station.controller;


import com.uav.platform.common.dto.response.PageResponse;
import com.uav.platform.modules.station.config.request.StationRequest;
import com.uav.platform.modules.station.config.response.StationResponse;
import com.uav.platform.modules.station.service.StationService;
import jakarta.validation.Valid;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/stations")
public class StationController {
    private final StationService service;
    public StationController(StationService service) { this.service = service; }

    @GetMapping
    @PreAuthorize("@permissionService.has(authentication, 'STATION_READ')")
    public ResponseEntity<PageResponse<StationResponse>> list(@RequestParam(defaultValue = "0") int page,
                                                               @RequestParam(defaultValue = "20") int size) {
        return ResponseEntity.ok(service.list(PageRequest.of(page, size, Sort.by("name").ascending())));
    }

    @GetMapping("/{id}")
    @PreAuthorize("@permissionService.has(authentication, 'STATION_READ')")
    public ResponseEntity<StationResponse> get(@PathVariable Long id) { return ResponseEntity.ok(service.get(id)); }

    @PostMapping
    @PreAuthorize("@permissionService.has(authentication, 'STATION_MANAGE')")
    public ResponseEntity<StationResponse> create(@Valid @RequestBody StationRequest request, Authentication auth) {
        return ResponseEntity.status(201).body(service.create(request, auth.getName()));
    }

    @PutMapping("/{id}")
    @PreAuthorize("@permissionService.has(authentication, 'STATION_MANAGE')")
    public ResponseEntity<StationResponse> update(@PathVariable Long id, @Valid @RequestBody StationRequest request, Authentication auth) {
        return ResponseEntity.ok(service.update(id, request, auth.getName()));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("@permissionService.has(authentication, 'STATION_MANAGE')")
    public ResponseEntity<Void> delete(@PathVariable Long id, Authentication auth) {
        service.delete(id, auth.getName()); return ResponseEntity.noContent().build();
    }
}
