package com.uav.platform.service;

import com.uav.platform.common.dto.response.PageResponse;
import com.uav.platform.dto.request.PublicSupportCreateRequest;
import com.uav.platform.dto.request.PublicSupportMessageRequest;
import com.uav.platform.dto.request.SupportAdminReplyRequest;
import com.uav.platform.dto.request.SupportQuickReplyUpsertRequest;
import com.uav.platform.dto.request.SupportStatusUpdateRequest;
import com.uav.platform.dto.response.PublicSupportThreadSessionResponse;
import com.uav.platform.dto.response.SupportAdminSummaryResponse;
import com.uav.platform.dto.response.SupportQuickReplyResponse;
import com.uav.platform.dto.response.SupportThreadDetailResponse;
import com.uav.platform.dto.response.SupportThreadResponse;

import org.springframework.security.core.Authentication;

import java.util.List;

public interface SupportService {

    PublicSupportThreadSessionResponse createPublicThread(PublicSupportCreateRequest request);

    PublicSupportThreadSessionResponse getPublicThread(String visitorToken, boolean markRead);

    PublicSupportThreadSessionResponse postPublicMessage(
            String visitorToken, PublicSupportMessageRequest request);

    SupportAdminSummaryResponse getAdminSummary();

    PageResponse<SupportThreadResponse> listAdminThreads(
            String status, String topic, Boolean unreadOnly, String q, int page, int size);

    int acknowledgeAdminDelivered();

    SupportThreadDetailResponse getAdminThreadDetail(Long id, Authentication auth);

    default SupportThreadDetailResponse getAdminThreadDetail(Long id) {
        return getAdminThreadDetail(id, null);
    }

    SupportThreadDetailResponse replyAsAdmin(
            Long id, SupportAdminReplyRequest request, Authentication auth);

    SupportThreadResponse updateThreadStatus(Long id, SupportStatusUpdateRequest request);

    void deleteThread(Long id);

    List<SupportQuickReplyResponse> listQuickReplies();

    SupportQuickReplyResponse createQuickReply(
            SupportQuickReplyUpsertRequest request, Authentication auth);

    SupportQuickReplyResponse updateQuickReply(Long id, SupportQuickReplyUpsertRequest request);

    void deleteQuickReply(Long id);
}
