package com.uav.platform.modules.assistant.dto.record;

/** The stored conversation a chat turn belongs to and the portal it was asked from. */
public record ChatThread(Long conversationId, String portal) {}
