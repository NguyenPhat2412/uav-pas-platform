package com.uav.platform.dto.request;

public record AccountDeletionRequest(
        String currentPassword, String confirmationPhrase, String reason) {}
