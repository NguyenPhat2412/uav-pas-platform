package com.uav.platform.repository.notification;

import com.uav.platform.entity.notification.PushDeviceToken;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

import java.util.List;
import java.util.Optional;

public interface PushDeviceTokenRepository
        extends JpaRepository<PushDeviceToken, Long>, JpaSpecificationExecutor<PushDeviceToken> {

    Optional<PushDeviceToken> findByToken(String token);

    List<PushDeviceToken> findByUserIdAndActiveTrue(Long userId);

    void deleteByUserId(Long userId);
}
