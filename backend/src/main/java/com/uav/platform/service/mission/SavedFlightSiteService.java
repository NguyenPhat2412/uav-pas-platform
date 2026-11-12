package com.uav.platform.service.mission;

import com.uav.platform.dto.request.mission.SavedFlightSiteUpsertRequest;
import com.uav.platform.dto.response.mission.SavedFlightSiteResponse;

import org.springframework.security.core.Authentication;

import java.util.List;

public interface SavedFlightSiteService {

    List<SavedFlightSiteResponse> listMySites(Authentication authentication);

    SavedFlightSiteResponse createSite(
            SavedFlightSiteUpsertRequest request, Authentication authentication);

    void deleteSite(Long id, Authentication authentication);
}
