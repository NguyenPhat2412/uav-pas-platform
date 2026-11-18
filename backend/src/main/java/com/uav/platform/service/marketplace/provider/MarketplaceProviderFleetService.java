package com.uav.platform.service.marketplace.provider;

import com.uav.platform.dto.request.marketplace.provider.CreateListingFromTemplateRequest;
import com.uav.platform.dto.request.marketplace.provider.ProviderOrderAssignRequest;
import com.uav.platform.dto.request.marketplace.provider.ProviderPilotPatchRequest;
import com.uav.platform.dto.request.marketplace.provider.ProviderPilotUpsertRequest;
import com.uav.platform.dto.request.marketplace.provider.ProviderUavUpdateRequest;
import com.uav.platform.dto.response.marketplace.catalog.MarketplaceListingResponse;
import com.uav.platform.dto.response.marketplace.provider.ProviderDocumentResponse;
import com.uav.platform.dto.response.marketplace.provider.ProviderPilotResponse;
import com.uav.platform.dto.response.marketplace.provider.ProviderUavResponse;
import com.uav.platform.dto.response.mission.lifecycle.MissionResponse;

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
