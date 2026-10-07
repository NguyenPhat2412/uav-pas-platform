package com.uav.platform.modules.media.repository;


import com.uav.platform.modules.media.common.*;

import com.uav.platform.modules.media.entity.MediaAsset;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

public interface MediaAssetRepository extends JpaRepository<MediaAsset, Long>, JpaSpecificationExecutor<MediaAsset> { }
