package com.uav.platform.service;

/** Authorization port for linking media to protected platform resources. */
public interface MediaAccessService {
    com.uav.platform.dao.base.HibernateSpecification<com.uav.platform.entity.MediaAsset> readableBy(
            String actor);

    void requireLink(String type, String id, String actor, boolean write);

    void requireFile(com.uav.platform.entity.MediaAsset asset, String actor, boolean write);
}
