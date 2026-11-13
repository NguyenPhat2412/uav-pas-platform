package com.uav.platform.dto.request.user;

public record AccountDeletionRequest(
        String currentPassword, String confirmationPhrase, String reason) {}
