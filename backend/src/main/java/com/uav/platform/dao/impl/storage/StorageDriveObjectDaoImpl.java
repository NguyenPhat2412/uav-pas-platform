package com.uav.platform.dao.impl.storage;

import com.uav.platform.dao.base.HibernateGenericDao;
import com.uav.platform.dao.storage.IStorageDriveObjectDao;
import com.uav.platform.entity.storage.StorageDriveObject;

import jakarta.persistence.EntityManager;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public class StorageDriveObjectDaoImpl extends HibernateGenericDao<Long, StorageDriveObject>
        implements IStorageDriveObjectDao {

    private static final Logger logger = LoggerFactory.getLogger(StorageDriveObjectDaoImpl.class);

    public StorageDriveObjectDaoImpl(final EntityManager entityManager) {
        super(StorageDriveObject.class, entityManager);
    }

    @Override
    public Optional<StorageDriveObject> findByObjectKey(String objectKey) {
        return hql("select e from StorageDriveObject e where e.objectKey = :objectKey")
                .setParameter("objectKey", objectKey)
                .uniqueResultOptional();
    }

    @Override
    public boolean existsByObjectKey(String objectKey) {
        return !hql(
                        "select 1 from StorageDriveObject e where e.objectKey = :objectKey",
                        Integer.class)
                .setParameter("objectKey", objectKey)
                .setMaxResults(1)
                .getResultList()
                .isEmpty();
    }

    @Override
    public long countByNodeId(Long nodeId) {
        Long v =
                hql(
                                "select count(e) from StorageDriveObject e where e.node.id = :nodeId",
                                Long.class)
                        .setParameter("nodeId", nodeId)
                        .getSingleResult();
        return v == null ? 0L : v;
    }

    @Override
    public long sumBytesByNodeId(Long nodeId) {
        Long v =
                hql(
                                "SELECT COALESCE(SUM(o.sizeBytes), 0) FROM StorageDriveObject o WHERE o.node.id = :nodeId",
                                Long.class)
                        .setParameter("nodeId", nodeId)
                        .getSingleResult();
        return v == null ? 0L : v;
    }

    @Override
    public long sumAllBytes() {
        Long v =
                hql("SELECT COALESCE(SUM(o.sizeBytes), 0) FROM StorageDriveObject o", Long.class)
                        .getSingleResult();
        return v == null ? 0L : v;
    }
}
