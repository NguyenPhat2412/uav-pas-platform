package com.uav.platform.service.support;

import com.uav.platform.common.dto.response.PageResponse;
import com.uav.platform.dto.request.support.PublicSupportCreateRequest;
import com.uav.platform.dto.request.support.PublicSupportMessageRequest;
import com.uav.platform.dto.request.support.SupportAdminReplyRequest;
import com.uav.platform.dto.request.support.SupportQuickReplyUpsertRequest;
import com.uav.platform.dto.request.support.SupportStatusUpdateRequest;
import com.uav.platform.dto.response.support.PublicSupportThreadSessionResponse;
import com.uav.platform.dto.response.support.SupportAdminSummaryResponse;
import com.uav.platform.dto.response.support.SupportQuickReplyResponse;
import com.uav.platform.dto.response.support.SupportThreadDetailResponse;
import com.uav.platform.dto.response.support.SupportThreadResponse;

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

    SupportThreadDetailResponse getAdminThreadDetail(Long id);

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
