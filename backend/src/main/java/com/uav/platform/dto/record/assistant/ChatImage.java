package com.uav.platform.dto.record.assistant;

/** A validated attachment: mimeType is detected from the bytes, not taken from the client. */
public record ChatImage(String kind, String mimeType, String name, byte[] data) {}
