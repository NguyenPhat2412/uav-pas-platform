package com.uav.platform.dao.support;

import com.uav.platform.dao.base.IGenericDao;
import com.uav.platform.entity.support.SupportQuickReply;

import java.util.List;

public interface ISupportQuickReplyDao extends IGenericDao<Long, SupportQuickReply> {
    List<SupportQuickReply> findAllByOrderBySortOrderAscIdAsc();
}
