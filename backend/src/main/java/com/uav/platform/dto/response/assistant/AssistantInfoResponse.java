package com.uav.platform.dto.response.assistant;

import java.util.List;

/** What the chat widget needs: whether the assistant is usable and which modes it offers. */
public record AssistantInfoResponse(boolean enabled, List<AssistantModeResponse> modes) {}
