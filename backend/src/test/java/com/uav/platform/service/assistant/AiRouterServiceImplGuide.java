package com.uav.platform.service.assistant;

/** Reads the package-private guide constant for assertions. */
final class AiRouterServiceImplGuide {
    private AiRouterServiceImplGuide() {}

    static String guide() {
        try {
            var field =
                    com.uav.platform.service.impl.assistant.AiRouterServiceImpl.class
                            .getDeclaredField("PLATFORM_GUIDE");
            field.setAccessible(true);
            return (String) field.get(null);
        } catch (ReflectiveOperationException e) {
            throw new IllegalStateException(e);
        }
    }
}
