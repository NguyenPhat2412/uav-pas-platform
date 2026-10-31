package com.uav.platform.mapper.media;

import com.uav.platform.dto.response.media.MediaAssetResponse;
import com.uav.platform.entity.media.MediaAsset;

import org.mapstruct.Mapper;
import org.mapstruct.MappingConstants;

@Mapper(componentModel = MappingConstants.ComponentModel.SPRING)
public interface MediaMapper {

    MediaAssetResponse toResponse(MediaAsset asset);
}
