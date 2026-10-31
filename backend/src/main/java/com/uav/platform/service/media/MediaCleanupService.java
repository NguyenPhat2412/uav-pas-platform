package com.uav.platform.service.media;

/** Each object is claimed by database row locks, including across application instances. */
public interface MediaCleanupService {
    void scheduledCleanup();

    int runBatch();

    boolean process(Long id);
}
