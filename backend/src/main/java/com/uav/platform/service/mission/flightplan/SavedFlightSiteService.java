package com.uav.platform.service.mission.flightplan;

import com.uav.platform.dto.request.mission.flightplan.SavedFlightSiteUpsertRequest;
import com.uav.platform.dto.response.mission.flightplan.SavedFlightSiteResponse;

import org.springframework.security.core.Authentication;

import java.util.List;

public interface SavedFlightSiteService {

    List<SavedFlightSiteResponse> listMySites(Authentication authentication);

    SavedFlightSiteResponse createSite(
            SavedFlightSiteUpsertRequest request, Authentication authentication);

    void deleteSite(Long id, Authentication authentication);
}
