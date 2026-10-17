package com.uav.platform.modules.permission.dto.response;

import com.fasterxml.jackson.annotation.JsonValue;

import java.util.List;

/** Preserves the existing JSON array returned by the current-permissions endpoint. */
public record PermissionCodesResponse(@JsonValue List<String> codes) {}
