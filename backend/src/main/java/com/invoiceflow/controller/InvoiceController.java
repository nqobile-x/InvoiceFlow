package com.invoiceflow.controller;

import com.invoiceflow.dto.request.InvoiceRequest;
import com.invoiceflow.dto.response.InvoiceListResponse;
import com.invoiceflow.dto.response.InvoiceResponse;
import com.invoiceflow.dto.response.PageResponse;
import com.invoiceflow.exception.InvoiceFlowException;
import com.invoiceflow.model.entity.Invoice.InvoiceStatus;
import com.invoiceflow.model.entity.User;
import com.invoiceflow.repository.BusinessRepository;
import com.invoiceflow.service.InvoiceService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.UUID;

@RestController
@RequiredArgsConstructor
public class InvoiceController {

    private final InvoiceService invoiceService;
    private final BusinessRepository businessRepository;

    // ─── Authenticated routes ───────────────────────────────────────────────

    @GetMapping("/api/v1/invoices")
    public ResponseEntity<PageResponse<InvoiceListResponse>> list(
            @AuthenticationPrincipal User user,
            @RequestParam(required = false) InvoiceStatus status,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return ResponseEntity.ok(invoiceService.list(getBusinessId(user), status, page, size));
    }

    @GetMapping("/api/v1/invoices/{id}")
    public ResponseEntity<InvoiceResponse> get(
            @AuthenticationPrincipal User user,
            @PathVariable UUID id) {
        return ResponseEntity.ok(invoiceService.get(getBusinessId(user), id));
    }

    @PostMapping("/api/v1/invoices")
    public ResponseEntity<InvoiceResponse> create(
            @AuthenticationPrincipal User user,
            @Valid @RequestBody InvoiceRequest req) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(invoiceService.create(getBusinessId(user), req));
    }

    @PutMapping("/api/v1/invoices/{id}")
    public ResponseEntity<InvoiceResponse> update(
            @AuthenticationPrincipal User user,
            @PathVariable UUID id,
            @Valid @RequestBody InvoiceRequest req) {
        return ResponseEntity.ok(invoiceService.update(getBusinessId(user), id, req));
    }

    @DeleteMapping("/api/v1/invoices/{id}")
    public ResponseEntity<Map<String, String>> delete(
            @AuthenticationPrincipal User user,
            @PathVariable UUID id) {
        invoiceService.delete(getBusinessId(user), id);
        return ResponseEntity.ok(Map.of("message", "Invoice deleted"));
    }

    @PostMapping("/api/v1/invoices/{id}/send")
    public ResponseEntity<InvoiceResponse> send(
            @AuthenticationPrincipal User user,
            @PathVariable UUID id) {
        return ResponseEntity.ok(invoiceService.send(getBusinessId(user), id));
    }

    @PostMapping("/api/v1/invoices/{id}/mark-paid")
    public ResponseEntity<InvoiceResponse> markPaid(
            @AuthenticationPrincipal User user,
            @PathVariable UUID id) {
        return ResponseEntity.ok(invoiceService.markPaid(getBusinessId(user), id));
    }

    @GetMapping("/api/v1/invoices/{id}/pdf")
    public ResponseEntity<byte[]> downloadPdf(
            @AuthenticationPrincipal User user,
            @PathVariable UUID id) {
        byte[] pdf = invoiceService.downloadPdf(getBusinessId(user), id);
        return ResponseEntity.ok()
                .contentType(MediaType.APPLICATION_PDF)
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"invoice-" + id + ".pdf\"")
                .body(pdf);
    }

    // ─── Public route (no auth) ─────────────────────────────────────────────

    @GetMapping("/api/v1/invoices/public/{viewToken}")
    public ResponseEntity<InvoiceResponse> getPublic(@PathVariable UUID viewToken) {
        return ResponseEntity.ok(invoiceService.getPublic(viewToken));
    }

    // ─── Helper ─────────────────────────────────────────────────────────────

    private UUID getBusinessId(User user) {
        return businessRepository.findByOwnerId(user.getId())
                .map(b -> b.getId())
                .orElseThrow(() -> InvoiceFlowException.badRequest("Please complete your business profile first"));
    }
}
