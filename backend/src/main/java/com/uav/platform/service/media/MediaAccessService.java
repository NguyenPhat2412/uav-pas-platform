package com.uav.platform.service.media;

/** Authorization port for linking media to protected platform resources. */
public interface MediaAccessService {
    com.uav.platform.dao.base.HibernateSpecification<com.uav.platform.entity.media.MediaAsset>
            readableBy(String actor);

    void requireLink(String type, String id, String actor, boolean write);

    void requireFile(com.uav.platform.entity.media.MediaAsset asset, String actor, boolean write);
}
