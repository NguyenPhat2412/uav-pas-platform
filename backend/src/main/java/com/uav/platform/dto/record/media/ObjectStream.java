package com.uav.platform.dto.record.media;

import java.io.IOException;
import java.io.InputStream;

public record ObjectStream(
        InputStream body,
        String contentType,
        long contentLength,
        String contentRange,
        String acceptRanges,
        String eTag)
        implements AutoCloseable {

    @Override
    public void close() throws IOException {
        if (body != null) {
            body.close();
        }
    }
}
