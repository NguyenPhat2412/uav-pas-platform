package com.uav.platform.repository.marketplace;

import com.uav.platform.entity.marketplace.ProviderProfile;

import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

import java.util.Optional;

public interface ProviderProfileRepository
        extends JpaRepository<ProviderProfile, Long>, JpaSpecificationExecutor<ProviderProfile> {

    @EntityGraph(attributePaths = {"user"})
    Optional<ProviderProfile> findByUserId(Long userId);

    @EntityGraph(attributePaths = {"user"})
    Optional<ProviderProfile> findByUserUsername(String username);

    @EntityGraph(attributePaths = {"user"})
    Optional<ProviderProfile> findBySlug(String slug);

    boolean existsBySlug(String slug);
}
