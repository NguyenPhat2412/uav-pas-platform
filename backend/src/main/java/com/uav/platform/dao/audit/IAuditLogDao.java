package com.uav.platform.dao.audit;

import com.uav.platform.dao.base.IGenericDao;
import com.uav.platform.entity.audit.AuditLog;
import com.uav.platform.enums.audit.*;

public interface IAuditLogDao extends IGenericDao<Long, AuditLog> {}
