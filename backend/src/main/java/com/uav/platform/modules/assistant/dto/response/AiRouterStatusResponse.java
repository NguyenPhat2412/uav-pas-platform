package com.uav.platform.modules.assistant.dto.response;

import java.util.List;

/** Live check of the gateway: health endpoint, then the model list with the stored key. */
public record AiRouterStatusResponse(
        boolean reachable,
        Long latencyMs,
        boolean authenticated,
        List<String> models,
        String error) {}
