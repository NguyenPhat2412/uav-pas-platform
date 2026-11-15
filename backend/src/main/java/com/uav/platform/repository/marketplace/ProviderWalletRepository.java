package com.uav.platform.repository.marketplace;

import com.uav.platform.entity.marketplace.ProviderWallet;

import jakarta.persistence.LockModeType;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;

public interface ProviderWalletRepository
        extends JpaRepository<ProviderWallet, Long>, JpaSpecificationExecutor<ProviderWallet> {

    Optional<ProviderWallet> findByProviderId(Long providerId);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select w from ProviderWallet w where w.provider.id = :providerId")
    Optional<ProviderWallet> findByProviderIdForUpdate(@Param("providerId") Long providerId);
}
