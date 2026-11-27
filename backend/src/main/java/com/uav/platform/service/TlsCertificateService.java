package com.uav.platform.service;

import com.uav.platform.dto.record.TlsCertificateInfo;

public interface TlsCertificateService {
    /** Certificate of app.public-url, cached for about an hour. */
    TlsCertificateInfo current();
}
