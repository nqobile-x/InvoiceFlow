package com.invoiceflow.controller;

import com.invoiceflow.dto.request.BusinessRequest;
import com.invoiceflow.dto.response.BusinessResponse;
import com.invoiceflow.model.entity.User;
import com.invoiceflow.service.BusinessService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/business")
@RequiredArgsConstructor
public class BusinessController {

    private final BusinessService businessService;

    @Value("${app.upload.dir:./uploads}")
    private String uploadDir;

    @Value("${app.url.api:http://localhost:8080}")
    private String apiUrl;

    @GetMapping
    public ResponseEntity<BusinessResponse> get(@AuthenticationPrincipal User user) {
        return ResponseEntity.ok(businessService.getByOwnerId(user.getId()));
    }

    @PostMapping
    public ResponseEntity<BusinessResponse> create(
            @AuthenticationPrincipal User user,
            @Valid @RequestBody BusinessRequest req) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(businessService.create(user.getId(), req));
    }

    @PutMapping
    public ResponseEntity<BusinessResponse> update(
            @AuthenticationPrincipal User user,
            @Valid @RequestBody BusinessRequest req) {
        return ResponseEntity.ok(businessService.update(user.getId(), req));
    }

    @PostMapping("/logo")
    public ResponseEntity<Map<String, String>> uploadLogo(
            @AuthenticationPrincipal User user,
            @RequestParam("logo") MultipartFile file) throws IOException {

        String contentType = file.getContentType();
        if (contentType == null || !contentType.startsWith("image/")) {
            return ResponseEntity.badRequest().build();
        }
        if (file.getSize() > 5 * 1024 * 1024) {
            return ResponseEntity.badRequest().build();
        }

        byte[] bytes = file.getBytes();

        // Store base64 in DB so logo survives server restarts
        String base64 = java.util.Base64.getEncoder().encodeToString(bytes);
        String dataUri = "data:" + contentType + ";base64," + base64;

        // Also write to disk as fallback (best-effort)
        try {
            String ext = contentType.contains("png") ? ".png" : ".jpg";
            String filename = UUID.randomUUID() + ext;
            Path dir = Paths.get(uploadDir, "logos");
            Files.createDirectories(dir);
            Files.write(dir.resolve(filename), bytes);
        } catch (Exception ignored) {}

        businessService.updateLogo(user.getId(), dataUri);

        return ResponseEntity.ok(Map.of("logoUrl", dataUri));
    }
}
