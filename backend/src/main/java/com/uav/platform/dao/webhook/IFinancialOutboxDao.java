package com.uav.platform.dao.webhook;

import com.uav.platform.dao.base.IGenericDao;
import com.uav.platform.entity.webhook.FinancialOutboxEvent;

import org.springframework.data.domain.Pageable;

import java.time.LocalDateTime;
import java.util.*;

public interface IFinancialOutboxDao extends IGenericDao<String, FinancialOutboxEvent> {
    Optional<FinancialOutboxEvent> findByIdForUpdate(String id);

    List<String> dueIds(LocalDateTime now, Pageable pageable);
}
