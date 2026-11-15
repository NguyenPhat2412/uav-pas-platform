package com.uav.platform.repository.marketplace;

import com.uav.platform.entity.marketplace.WalletTransaction;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

import java.util.List;

public interface WalletTransactionRepository
        extends JpaRepository<WalletTransaction, Long>,
                JpaSpecificationExecutor<WalletTransaction> {

    List<WalletTransaction> findTop50ByWalletIdOrderByCreatedAtDescIdDesc(Long walletId);
}
