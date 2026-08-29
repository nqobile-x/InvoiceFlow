package com.invoiceflow.controller;

import com.invoiceflow.dto.response.DashboardSummaryResponse;
import com.invoiceflow.dto.response.InvoiceListResponse;
import com.invoiceflow.dto.response.RevenueDataResponse;
import com.invoiceflow.exception.InvoiceFlowException;
import com.invoiceflow.model.entity.User;
import com.invoiceflow.repository.BusinessRepository;
import com.invoiceflow.service.DashboardService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/dashboard")
@RequiredArgsConstructor
public class DashboardController {

    private final DashboardService dashboardService;
    private final BusinessRepository businessRepository;

    @GetMapping("/summary")
    public ResponseEntity<DashboardSummaryResponse> summary(@AuthenticationPrincipal User user) {
        return ResponseEntity.ok(dashboardService.getSummary(getBusinessId(user)));
    }

    @GetMapping("/recent")
    public ResponseEntity<List<InvoiceListResponse>> recent(@AuthenticationPrincipal User user) {
        return ResponseEntity.ok(dashboardService.getRecent(getBusinessId(user)));
    }

    @GetMapping("/revenue")
    public ResponseEntity<RevenueDataResponse> revenue(@AuthenticationPrincipal User user) {
        return ResponseEntity.ok(dashboardService.getRevenue(getBusinessId(user)));
    }

    private UUID getBusinessId(User user) {
        return businessRepository.findByOwnerId(user.getId())
                .map(b -> b.getId())
                .orElseThrow(() -> InvoiceFlowException.badRequest("Please complete your business profile first"));
    }
}
