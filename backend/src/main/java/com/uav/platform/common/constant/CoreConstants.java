package com.uav.platform.common.constant;

public final class CoreConstants {
    private CoreConstants() {}

    // System & Validation Error Messages
    public static final String EMAIL_ALREADY_EXISTS = "Email already exists in the system";
    public static final String USERNAME_ALREADY_EXISTS = "Username already exists in the system";
    public static final String PHONE_ALREADY_EXISTS = "Phone number already exists in the system";
    public static final String USER_NOT_FOUND = "User not found";
    public static final String REGISTRATION_DATA_REQUIRED =
            "Registration request data cannot be null";
    public static final String INTERNAL_SERVER_ERROR =
            "An internal server error occurred. Please try again later";
    public static final String INVALID_CREDENTIALS = "Invalid username/email or password";
    public static final String ACCOUNT_INACTIVE = "Account is not active";

    // OpenAPI Metadata & Descriptions
    public static final String OPENAPI_TITLE = "UAV PAS Platform API";
    public static final String OPENAPI_VERSION = "1.0.0";
    public static final String OPENAPI_DESCRIPTION = "API documentation for UAV PAS Platform";

    public static final String AUTH_TAG_NAME = "Authentication";
    public static final String AUTH_TAG_DESCRIPTION = "User registration and authentication APIs";
    public static final String AUTH_OP_REGISTER_SUMMARY = "Register a new user account";
    public static final String AUTH_OP_LOGIN_SUMMARY =
            "User login with username/email and password";
    public static final String AUTH_OP_ME_SUMMARY = "Get current authenticated user profile";
}
