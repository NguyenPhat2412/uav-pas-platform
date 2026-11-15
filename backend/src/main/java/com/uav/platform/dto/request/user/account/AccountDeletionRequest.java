package com.uav.platform.dto.request.user.account;

public record AccountDeletionRequest(
        String currentPassword, String confirmationPhrase, String reason) {}
