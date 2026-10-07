package com.uav.platform.modules.media.service;


/** Authorization port for linking media to protected platform resources. */
public interface MediaAccessService {
    void requireLink(String type, String id, String actor, boolean write);
    void requireFile(com.uav.platform.modules.media.entity.MediaAsset asset, String actor, boolean write);
}
