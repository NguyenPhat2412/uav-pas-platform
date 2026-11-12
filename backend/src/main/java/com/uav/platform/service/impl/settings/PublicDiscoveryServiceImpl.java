package com.uav.platform.service.impl.settings;

import com.uav.platform.dto.response.settings.PublicDiscoveryResponse;
import com.uav.platform.dto.response.settings.PublicDiscoveryResponse.PublicPlanItem;
import com.uav.platform.dto.response.settings.PublicDiscoveryResponse.PublicServiceItem;
import com.uav.platform.dto.response.settings.PublicDiscoveryResponse.PublicTrainingItem;
import com.uav.platform.dto.response.settings.PublicSiteInfoResponse;
import com.uav.platform.entity.billing.ServicePlan;
import com.uav.platform.repository.billing.ServicePlanRepository;
import com.uav.platform.repository.mission.ServiceOfferingRepository;
import com.uav.platform.repository.training.TrainingDocumentRepository;
import com.uav.platform.service.settings.PublicDiscoveryService;
import com.uav.platform.service.settings.SystemConfigService;

import lombok.RequiredArgsConstructor;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Comparator;
import java.util.List;

@Service
@RequiredArgsConstructor
public class PublicDiscoveryServiceImpl implements PublicDiscoveryService {

    private final ServiceOfferingRepository serviceOfferingRepository;
    private final ServicePlanRepository servicePlanRepository;
    private final TrainingDocumentRepository trainingDocumentRepository;
    private final SystemConfigService systemConfigService;

    @Override
    @Transactional(readOnly = true)
    public PublicDiscoveryResponse getPublicDiscovery() {
        List<PublicServiceItem> services =
                serviceOfferingRepository.findByActiveTrueOrderByIdAsc().stream()
                        .filter(s -> !s.getCode().endsWith("_READ"))
                        .limit(5)
                        .map(
                                s ->
                                        new PublicServiceItem(
                                                s.getCode(),
                                                s.getName(),
                                                s.getDescription(),
                                                s.getDefaultDurationMinutes(),
                                                s.getSensors(),
                                                s.getMaxAreaHectares()))
                        .toList();

        List<PublicPlanItem> plans =
                servicePlanRepository.findByActiveTrue().stream()
                        .sorted(Comparator.comparing(ServicePlan::getPrice))
                        .limit(4)
                        .map(
                                p ->
                                        new PublicPlanItem(
                                                p.getCode(),
                                                p.getName(),
                                                p.getPrice(),
                                                p.getMaxMonthlyFlightHours(),
                                                p.getMaxConcurrentUavs(),
                                                p.getAllowSarAi()))
                        .toList();

        List<PublicTrainingItem> trainings =
                trainingDocumentRepository
                        .findByActiveTrueOrderByTargetPortalAscSortOrderAscIdAsc()
                        .stream()
                        .filter(doc -> !"ADMIN".equalsIgnoreCase(doc.getTargetPortal()))
                        .limit(5)
                        .map(
                                doc ->
                                        new PublicTrainingItem(
                                                doc.getCode(),
                                                doc.getSlug(),
                                                doc.getTitle(),
                                                doc.getSummary(),
                                                doc.getEstimatedMinutes(),
                                                doc.getCategory()))
                        .toList();

        PublicSiteInfoResponse siteInfo = systemConfigService.publicSiteInfo();
        return new PublicDiscoveryResponse(
                services,
                plans,
                trainings,
                siteInfo.dispatchHotline(),
                siteInfo.zaloPhone(),
                siteInfo.email());
    }
}
