package com.invoiceflow.dto.response;

import java.util.UUID;

public record AuthResponse(
    String accessToken,
    String refreshToken,
    String tokenType,
    long expiresIn,
    UUID userId,
    String email,
    String firstName,
    String lastName,
    boolean hasBusinessProfile
) {
    public static AuthResponse of(String accessToken, String refreshToken, long expiresIn,
                                   UUID userId, String email, String firstName, String lastName,
                                   boolean hasBusinessProfile) {
        return new AuthResponse(accessToken, refreshToken, "Bearer", expiresIn,
                userId, email, firstName, lastName, hasBusinessProfile);
    }
}
