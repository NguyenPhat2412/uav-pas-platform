package com.uav.platform.service;

import com.uav.platform.dto.request.CreateListingFromTemplateRequest;
import com.uav.platform.dto.request.ProviderOrderAssignRequest;
import com.uav.platform.dto.request.ProviderPilotPatchRequest;
import com.uav.platform.dto.request.ProviderPilotUpsertRequest;
import com.uav.platform.dto.request.ProviderUavUpdateRequest;
import com.uav.platform.dto.response.MarketplaceListingResponse;
import com.uav.platform.dto.response.MissionResponse;
import com.uav.platform.dto.response.ProviderDocumentResponse;
import com.uav.platform.dto.response.ProviderPilotResponse;
import com.uav.platform.dto.response.ProviderUavResponse;

import java.util.List;

public interface MarketplaceProviderFleetService {

    List<ProviderDocumentResponse> listMyDocuments(String username);

    MarketplaceListingResponse createListingFromTemplate(
            CreateListingFromTemplateRequest request, String username);

    void deleteListing(Long listingId, String username);

    List<ProviderUavResponse> listMyUavs(String username);

    ProviderUavResponse updateMyUav(Long uavId, ProviderUavUpdateRequest request, String username);

    void deleteMyUav(Long uavId, String username);

    void deleteMyEquipment(Long equipmentId, String username);

    List<ProviderPilotResponse> listMyPilots(String username);

    ProviderPilotResponse createPilot(ProviderPilotUpsertRequest request, String username);

    ProviderPilotResponse updatePilot(
            Long pilotId, ProviderPilotPatchRequest request, String username);

    void deletePilot(Long pilotId, String username);

    MissionResponse getMyOrder(Long missionId, String username);

    MissionResponse assignOrder(
            Long missionId, ProviderOrderAssignRequest request, String username);
}
