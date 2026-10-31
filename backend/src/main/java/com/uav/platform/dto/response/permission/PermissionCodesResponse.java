package com.uav.platform.dto.response.permission;

import com.fasterxml.jackson.annotation.JsonValue;

import java.util.List;

/** Preserves the existing JSON array returned by the current-permissions endpoint. */
public record PermissionCodesResponse(@JsonValue List<String> codes) {}
