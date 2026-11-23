package com.uav.platform.dao.mission;

import com.uav.platform.dao.base.IGenericDao;
import com.uav.platform.entity.mission.Mission;
import com.uav.platform.enums.mission.*;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface IMissionDao extends IGenericDao<Long, Mission> {
    Optional<Mission> findByCode(String code);

    long nextCodeValue();

    Optional<Mission> findByIdForUpdate(Long id);

    java.util.List<Mission> findByCustomerIdAndStatusNotIn(
            Long customerId, Collection<MissionStatus> closedStatuses);

    long countActiveByUserId(Long userId, Collection<MissionStatus> closedStatuses);

    long countAnyByUserId(Long userId);

    Optional<Mission> findFirstByUavIdAndStatusOrderByIdDesc(Long uavId, MissionStatus status);

    boolean existsByUavIdAndStatusNotIn(Long uavId, Collection<MissionStatus> terminalStatuses);

    boolean existsByUavIdAndIdNotAndStatusNotIn(
            Long uavId, Long missionId, Collection<MissionStatus> terminalStatuses);

    boolean existsByUavIdAndIdNotAndStatus(Long uavId, Long missionId, MissionStatus status);

    List<Mission> findActiveWithResourcesNotIn(Collection<MissionStatus> excludedStatuses);

    List<Object[]> countCompletedByOperator();

    List<Mission> findAllNonDraftWithAssociations();

    List<Mission> findByProviderIdOrderByCreatedAtDesc(Long providerId);

    List<Mission> findOpenRfqMissions(Collection<MissionStatus> openStatuses);

    long countByProjectId(Long projectId);

    boolean existsByProjectIdAndStatusNotIn(
            Long projectId, Collection<MissionStatus> terminalStatuses);

    Optional<Mission> findFirstBySubscriptionIdOrderByIdAsc(Long subscriptionId);

    Optional<Mission> findFirstBySubscriptionIdOrderByIdDesc(Long subscriptionId);
}
