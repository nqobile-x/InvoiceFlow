package com.invoiceflow.controller;

import com.invoiceflow.dto.request.ClientRequest;
import com.invoiceflow.dto.response.ClientResponse;
import com.invoiceflow.dto.response.PageResponse;
import com.invoiceflow.model.entity.User;
import com.invoiceflow.repository.BusinessRepository;
import com.invoiceflow.service.ClientService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/clients")
@RequiredArgsConstructor
public class ClientController {

    private final ClientService clientService;
    private final BusinessRepository businessRepository;

    @GetMapping
    public ResponseEntity<PageResponse<ClientResponse>> list(
            @AuthenticationPrincipal User user,
            @RequestParam(required = false) String search,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        UUID businessId = getBusinessId(user);
        return ResponseEntity.ok(clientService.list(businessId, search, page, size));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ClientResponse> get(
            @AuthenticationPrincipal User user,
            @PathVariable UUID id) {
        UUID businessId = getBusinessId(user);
        return ResponseEntity.ok(clientService.get(businessId, id));
    }

    @PostMapping
    public ResponseEntity<ClientResponse> create(
            @AuthenticationPrincipal User user,
            @Valid @RequestBody ClientRequest req) {
        UUID businessId = getBusinessId(user);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(clientService.create(businessId, req));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ClientResponse> update(
            @AuthenticationPrincipal User user,
            @PathVariable UUID id,
            @Valid @RequestBody ClientRequest req) {
        UUID businessId = getBusinessId(user);
        return ResponseEntity.ok(clientService.update(businessId, id, req));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Map<String, String>> delete(
            @AuthenticationPrincipal User user,
            @PathVariable UUID id) {
        UUID businessId = getBusinessId(user);
        clientService.delete(businessId, id);
        return ResponseEntity.ok(Map.of("message", "Client deleted"));
    }

    private UUID getBusinessId(User user) {
        return businessRepository.findByOwnerId(user.getId())
                .map(b -> b.getId())
                .orElseThrow(() -> com.invoiceflow.exception.InvoiceFlowException.badRequest(
                    "Please complete your business profile first"));
    }
}
