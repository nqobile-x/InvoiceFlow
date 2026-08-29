package com.invoiceflow.service;

import com.invoiceflow.dto.request.LoginRequest;
import com.invoiceflow.dto.request.RefreshRequest;
import com.invoiceflow.dto.request.RegisterRequest;
import com.invoiceflow.dto.response.AuthResponse;
import com.invoiceflow.exception.InvoiceFlowException;
import com.invoiceflow.model.entity.RefreshToken;
import com.invoiceflow.model.entity.User;
import com.invoiceflow.repository.BusinessRepository;
import com.invoiceflow.repository.RefreshTokenRepository;
import com.invoiceflow.repository.UserRepository;
import com.invoiceflow.security.jwt.JwtUtil;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.commons.codec.digest.DigestUtils;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository userRepository;
    private final BusinessRepository businessRepository;
    private final RefreshTokenRepository refreshTokenRepository;
    private final PasswordEncoder passwordEncoder;
    private final AuthenticationManager authenticationManager;
    private final JwtUtil jwtUtil;

    @Value("${app.jwt.access-token-expiry-ms}")
    private long accessTokenExpiryMs;

    @Value("${app.jwt.refresh-token-expiry-ms}")
    private long refreshTokenExpiryMs;

    @Transactional
    public AuthResponse register(RegisterRequest req) {
        if (userRepository.existsByEmail(req.email())) {
            throw InvoiceFlowException.conflict("Email already registered");
        }

        User user = User.builder()
                .email(req.email().toLowerCase().trim())
                .passwordHash(passwordEncoder.encode(req.password()))
                .firstName(req.firstName().trim())
                .lastName(req.lastName().trim())
                .phone(req.phone())
                .build();

        userRepository.save(user);
        log.info("New user registered: {}", user.getEmail());

        return buildAuthResponse(user);
    }

    @Transactional
    public AuthResponse login(LoginRequest req) {
        try {
            authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(req.email().toLowerCase().trim(), req.password())
            );
        } catch (BadCredentialsException e) {
            throw InvoiceFlowException.unauthorized("Invalid email or password");
        }

        User user = userRepository.findByEmail(req.email().toLowerCase().trim())
                .orElseThrow(() -> InvoiceFlowException.notFound("User not found"));

        return buildAuthResponse(user);
    }

    @Transactional
    public AuthResponse refresh(RefreshRequest req) {
        String tokenHash = DigestUtils.sha256Hex(req.refreshToken());

        RefreshToken stored = refreshTokenRepository.findByTokenHash(tokenHash)
                .orElseThrow(() -> InvoiceFlowException.unauthorized("Invalid refresh token"));

        if (!stored.isValid()) {
            throw InvoiceFlowException.unauthorized("Refresh token expired or revoked");
        }

        stored.setRevoked(true);
        refreshTokenRepository.save(stored);

        return buildAuthResponse(stored.getUser());
    }

    @Transactional
    public void logout(UUID userId) {
        refreshTokenRepository.revokeAllByUserId(userId);
        log.info("User logged out, tokens revoked: {}", userId);
    }

    private AuthResponse buildAuthResponse(User user) {
        UUID businessId = businessRepository.findByOwnerId(user.getId())
                .map(b -> b.getId())
                .orElse(null);

        String accessToken = jwtUtil.generateAccessToken(user, businessId);
        String rawRefreshToken = UUID.randomUUID().toString();
        String tokenHash = DigestUtils.sha256Hex(rawRefreshToken);

        RefreshToken refreshToken = RefreshToken.builder()
                .user(user)
                .tokenHash(tokenHash)
                .expiresAt(LocalDateTime.now().plusSeconds(refreshTokenExpiryMs / 1000))
                .build();

        refreshTokenRepository.save(refreshToken);

        boolean hasBusinessProfile = businessId != null;

        return AuthResponse.of(
            accessToken, rawRefreshToken, accessTokenExpiryMs / 1000,
            user.getId(), user.getEmail(), user.getFirstName(), user.getLastName(),
            hasBusinessProfile
        );
    }
}
