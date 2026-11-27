package com.uav.platform.service;

import com.uav.platform.dto.request.SavedFlightSiteUpsertRequest;
import com.uav.platform.dto.response.SavedFlightSiteResponse;

import org.springframework.security.core.Authentication;

import java.util.List;

public interface SavedFlightSiteService {

    List<SavedFlightSiteResponse> listMySites(Authentication authentication);

    SavedFlightSiteResponse createSite(
            SavedFlightSiteUpsertRequest request, Authentication authentication);

    void deleteSite(Long id, Authentication authentication);
}
