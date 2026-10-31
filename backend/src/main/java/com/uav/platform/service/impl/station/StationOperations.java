package com.uav.platform.service.impl.station;

import com.uav.platform.entity.station.*;
import com.uav.platform.enums.station.*;

/** Internal service implementation rules; persistence entities contain data only. */
public final class StationOperations {
    private StationOperations() {}

    public static Station create(
            String code,
            String name,
            String address,
            Double latitude,
            Double longitude,
            StationStatus status) {
        Station value = new Station();

        value.setCode(code);
        value.setName(name);
        value.setAddress(address);
        value.setLatitude(latitude);
        value.setLongitude(longitude);
        value.setStatus(status == null ? StationStatus.ACTIVE : status);

        return value;
    }

    public static void update(
            Station value,
            String name,
            String address,
            Double latitude,
            Double longitude,
            StationStatus status) {
        value.setName(name);
        value.setAddress(address);
        value.setLatitude(latitude);
        value.setLongitude(longitude);
        if (status != null) value.setStatus(status);
    }
}
