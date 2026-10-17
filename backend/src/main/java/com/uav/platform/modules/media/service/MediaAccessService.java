package com.uav.platform.modules.media.service;

/** Authorization port for linking media to protected platform resources. */
public interface MediaAccessService {
    org.springframework.data.jpa.domain.Specification<
                    com.uav.platform.modules.media.entity.MediaAsset>
            readableBy(String actor);

    void requireLink(String type, String id, String actor, boolean write);

    void requireFile(
            com.uav.platform.modules.media.entity.MediaAsset asset, String actor, boolean write);
}
