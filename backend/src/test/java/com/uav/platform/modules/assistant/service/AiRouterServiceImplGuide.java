package com.uav.platform.modules.assistant.service;

/** Reads the package-private guide constant for assertions. */
final class AiRouterServiceImplGuide {
    private AiRouterServiceImplGuide() {}

    static String guide() {
        try {
            var field =
                    com.uav.platform.modules.assistant.service.impl.AiRouterServiceImpl.class
                            .getDeclaredField("PLATFORM_GUIDE");
            field.setAccessible(true);
            return (String) field.get(null);
        } catch (ReflectiveOperationException e) {
            throw new IllegalStateException(e);
        }
    }
}
