package com.uav.platform.common.util;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.text.Normalizer;
import java.util.LinkedHashMap;
import java.util.Locale;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Shared coordinate lookup for Vietnamese provinces and lightweight GeoJSON centroid extraction so
 * project subscriptions and fleet dispatch always have deterministic geographic coordinates.
 */
public final class VietnamProvinceCoordinates {

    private static final double EARTH_RADIUS_KM = 6_371.0;
    private static final double[] DEFAULT_VN_CENTER = {21.0285, 105.8542};
    private static final Pattern LON_LAT_PAIR =
            Pattern.compile(
                    "\\[\\s*(-?\\d+(?:\\.\\d+)?)\\s*,\\s*(-?\\d+(?:\\.\\d+)?)\\s*(?:,\\s*-?\\d+(?:\\.\\d+)?\\s*)?\\]");

    private static final Map<String, double[]> PROVINCE_COORDS = new LinkedHashMap<>();

    static {
        put("ha noi", 21.0285, 105.8542);
        put("tp ho chi minh", 10.7769, 106.7009);
        put("ho chi minh", 10.7769, 106.7009);
        put("hcm", 10.7769, 106.7009);
        put("da nang", 16.0544, 108.2022);
        put("hai phong", 20.8449, 106.6881);
        put("can tho", 10.0452, 105.7469);
        put("binh duong", 10.9804, 106.6519);
        put("dong nai", 10.9574, 106.8426);
        put("ba ria vung tau", 10.5417, 107.2429);
        put("long an", 10.5331, 106.4113);
        put("quang ninh", 21.0064, 107.2925);
        put("bac ninh", 21.1861, 106.0763);
        put("bac giang", 21.2731, 106.1946);
        put("vinh phuc", 21.3089, 105.6049);
        put("hung yen", 20.6464, 106.0511);
        put("thai nguyen", 21.5942, 105.8482);
        put("thanh hoa", 19.8067, 105.7852);
        put("nghe an", 18.6796, 105.6813);
        put("thua thien hue", 16.4637, 107.5909);
        put("hue", 16.4637, 107.5909);
        put("quang nam", 15.5394, 108.0191);
        put("quang ngai", 15.1214, 108.8044);
        put("binh dinh", 13.7830, 109.2197);
        put("khanh hoa", 12.2388, 109.1967);
        put("lam dong", 11.9404, 108.4583);
        put("dak lak", 12.6667, 108.0500);
        put("gia lai", 13.9833, 108.0000);
        put("tien giang", 10.3600, 106.3600);
        put("an giang", 10.3864, 105.4352);
        put("kien giang", 10.0125, 105.0809);
        put("dong thap", 10.4938, 105.6882);
    }

    private VietnamProvinceCoordinates() {}

    private static void put(String key, double lat, double lng) {
        PROVINCE_COORDS.put(key, new double[] {lat, lng});
    }

    public static double[] resolveForProvince(String province) {
        String norm = normalize(province);
        if (norm.isEmpty()) {
            return DEFAULT_VN_CENTER.clone();
        }
        double[] exact = PROVINCE_COORDS.get(norm);
        if (exact != null) {
            return exact.clone();
        }
        for (Map.Entry<String, double[]> entry : PROVINCE_COORDS.entrySet()) {
            if (norm.contains(entry.getKey()) || entry.getKey().contains(norm)) {
                return entry.getValue().clone();
            }
        }
        return DEFAULT_VN_CENTER.clone();
    }

    /**
     * Extracts `[lat, lng]` centroid from a GeoJSON string (where coordinate pairs are `[lng,
     * lat]`), returning null if no valid coordinate pairs are found.
     */
    public static BigDecimal[] extractGeoJsonCentroid(String geoJson) {
        if (geoJson == null || geoJson.isBlank()) {
            return null;
        }
        Matcher matcher = LON_LAT_PAIR.matcher(geoJson);
        double sumLat = 0;
        double sumLng = 0;
        int count = 0;
        while (matcher.find() && count < 500) {
            try {
                double first = Double.parseDouble(matcher.group(1));
                double second = Double.parseDouble(matcher.group(2));
                double lat;
                double lng;
                if (Math.abs(second) <= 90 && Math.abs(first) <= 180 && Math.abs(first) > 90) {
                    lng = first;
                    lat = second;
                } else if (Math.abs(first) <= 90
                        && Math.abs(second) > 90
                        && Math.abs(second) <= 180) {
                    lat = first;
                    lng = second;
                } else if (Math.abs(second) <= 90 && Math.abs(first) <= 180) {
                    lng = first;
                    lat = second;
                } else {
                    continue;
                }
                sumLat += lat;
                sumLng += lng;
                count++;
            } catch (NumberFormatException ignored) {
                // Ignore malformed numeric token.
            }
        }
        if (count == 0) {
            return null;
        }
        return new BigDecimal[] {
            BigDecimal.valueOf(sumLat / count).setScale(7, RoundingMode.HALF_UP),
            BigDecimal.valueOf(sumLng / count).setScale(7, RoundingMode.HALF_UP)
        };
    }

    public static double haversineKm(double lat1, double lng1, double lat2, double lng2) {
        double dLat = Math.toRadians(lat2 - lat1);
        double dLng = Math.toRadians(lng2 - lng1);
        double a =
                Math.sin(dLat / 2) * Math.sin(dLat / 2)
                        + Math.cos(Math.toRadians(lat1))
                                * Math.cos(Math.toRadians(lat2))
                                * Math.sin(dLng / 2)
                                * Math.sin(dLng / 2);
        double c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return Math.round(EARTH_RADIUS_KM * c * 10.0) / 10.0;
    }

    public static String normalize(String text) {
        if (text == null || text.isBlank()) {
            return "";
        }
        String decomposed =
                Normalizer.normalize(text.trim(), Normalizer.Form.NFD)
                        .replaceAll("\\p{M}+", "")
                        .replace('đ', 'd')
                        .replace('Đ', 'D')
                        .toLowerCase(Locale.ROOT);
        return decomposed.replaceAll("[^a-z0-9]+", " ").trim();
    }
}
