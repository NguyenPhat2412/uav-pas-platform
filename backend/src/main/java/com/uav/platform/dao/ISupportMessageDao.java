package com.uav.platform.dao;

import com.uav.platform.dao.base.IGenericDao;
import com.uav.platform.entity.SupportMessage;

import java.util.Collection;
import java.util.List;

public interface ISupportMessageDao extends IGenericDao<Long, SupportMessage> {
    List<SupportMessage> findByThreadIdOrderByCreatedAtAscIdAsc(Long threadId);

    List<SupportMessage> findBySenderRoleAndDeliveredAtIsNull(String senderRole);

    long countByThreadId(Long threadId);

    List<Object[]> countGroupedByThreadIds(Collection<Long> threadIds);

    void deleteByThreadId(Long threadId);
}
