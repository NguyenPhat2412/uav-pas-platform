package com.uav.platform.dao.impl;

import com.uav.platform.dao.IStorageDriveNodeDao;
import com.uav.platform.dao.base.HibernateGenericDao;
import com.uav.platform.entity.StorageDriveNode;

import jakarta.persistence.EntityManager;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public class StorageDriveNodeDaoImpl extends HibernateGenericDao<Long, StorageDriveNode>
        implements IStorageDriveNodeDao {

    private static final Logger logger = LoggerFactory.getLogger(StorageDriveNodeDaoImpl.class);

    public StorageDriveNodeDaoImpl(final EntityManager entityManager) {
        super(StorageDriveNode.class, entityManager);
    }

    @Override
    public Optional<StorageDriveNode> findByCode(String code) {
        return hql("select e from StorageDriveNode e where e.code = :code")
                .setParameter("code", code)
                .uniqueResultOptional();
    }

    @Override
    public Optional<StorageDriveNode> findByAccountEmailIgnoreCase(String accountEmail) {
        return hql("select e from StorageDriveNode e where lower(e.accountEmail) = lower(:accountEmail)")
                .setParameter("accountEmail", accountEmail)
                .uniqueResultOptional();
    }

    @Override
    public List<StorageDriveNode> findAllByOrderByPriorityWeightDescIdAsc() {
        return hql("select e from StorageDriveNode e order by e.priorityWeight desc, e.id asc")
                .getResultList();
    }

    @Override
    public List<StorageDriveNode> findByEnabledTrueOrderByPriorityWeightDescIdAsc() {
        return hql("select e from StorageDriveNode e where e.enabled = true order by e.priorityWeight desc, e.id asc")
                .getResultList();
    }
}
