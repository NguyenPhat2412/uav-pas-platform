package com.uav.platform.mapper;

import com.uav.platform.dto.response.MediaAssetResponse;
import com.uav.platform.entity.MediaAsset;

import org.mapstruct.Mapper;
import org.mapstruct.MappingConstants;

@Mapper(componentModel = MappingConstants.ComponentModel.SPRING)
public interface MediaMapper {

    MediaAssetResponse toResponse(MediaAsset asset);
}
