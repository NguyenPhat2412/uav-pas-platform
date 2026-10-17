package com.uav.platform.modules.media.mapper;

import com.uav.platform.modules.media.dto.response.MediaAssetResponse;
import com.uav.platform.modules.media.entity.MediaAsset;

import org.mapstruct.Mapper;
import org.mapstruct.MappingConstants;

@Mapper(componentModel = MappingConstants.ComponentModel.SPRING)
public interface MediaMapper {

    MediaAssetResponse toResponse(MediaAsset asset);
}
