package com.uav.platform.repository.marketplace;

import com.uav.platform.entity.marketplace.ProviderPayout;

import jakarta.persistence.LockModeType;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface ProviderPayoutRepository
        extends JpaRepository<ProviderPayout, Long>, JpaSpecificationExecutor<ProviderPayout> {

    @Override
    @EntityGraph(attributePaths = {"provider", "provider.user"})
    Page<ProviderPayout> findAll(Specification<ProviderPayout> spec, Pageable pageable);

    List<ProviderPayout> findByProviderIdOrderByCreatedAtDesc(Long providerId);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select p from ProviderPayout p join fetch p.provider where p.id = :id")
    Optional<ProviderPayout> findByIdForUpdate(@Param("id") Long id);
}
