package com.invoiceflow.service;

import com.invoiceflow.dto.response.DashboardSummaryResponse;
import com.invoiceflow.dto.response.InvoiceListResponse;
import com.invoiceflow.dto.response.RevenueDataResponse;
import com.invoiceflow.dto.response.RevenueDataResponse.MonthlyRevenue;
import com.invoiceflow.model.entity.Invoice.InvoiceStatus;
import com.invoiceflow.repository.InvoiceRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.Month;
import java.time.format.TextStyle;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class DashboardService {

    private final InvoiceRepository invoiceRepository;

    @Transactional(readOnly = true)
    public DashboardSummaryResponse getSummary(UUID businessId) {
        return new DashboardSummaryResponse(
            invoiceRepository.sumPaidByBusinessId(businessId),
            invoiceRepository.sumOutstandingByBusinessId(businessId),
            invoiceRepository.sumOverdueByBusinessId(businessId),
            invoiceRepository.countByBusinessIdAndStatus(businessId, InvoiceStatus.DRAFT),
            invoiceRepository.countByBusinessIdAndStatus(businessId, InvoiceStatus.SENT),
            invoiceRepository.countByBusinessIdAndStatus(businessId, InvoiceStatus.VIEWED),
            invoiceRepository.countByBusinessIdAndStatus(businessId, InvoiceStatus.PAID),
            invoiceRepository.countByBusinessIdAndStatus(businessId, InvoiceStatus.OVERDUE)
        );
    }

    @Transactional(readOnly = true)
    public List<InvoiceListResponse> getRecent(UUID businessId) {
        return invoiceRepository
                .findByBusinessIdOrderByCreatedAtDesc(businessId, PageRequest.of(0, 10))
                .stream()
                .map(InvoiceListResponse::from)
                .toList();
    }

    @Transactional(readOnly = true)
    public RevenueDataResponse getRevenue(UUID businessId) {
        List<Object[]> raw = invoiceRepository.monthlyRevenue(businessId);

        // Build a map of year-month -> amount from DB results
        Map<String, BigDecimal> revenueMap = raw.stream()
                .collect(Collectors.toMap(
                    row -> row[0] + "-" + row[1],  // "2026-1"
                    row -> (BigDecimal) row[2]
                ));

        // Fill last 12 months (including months with zero revenue)
        List<MonthlyRevenue> months = new ArrayList<>();
        LocalDate cursor = LocalDate.now().withDayOfMonth(1);

        for (int i = 11; i >= 0; i--) {
            LocalDate month = cursor.minusMonths(i);
            String key = month.getYear() + "-" + month.getMonthValue();
            BigDecimal amount = revenueMap.getOrDefault(key, BigDecimal.ZERO);
            String label = Month.of(month.getMonthValue())
                    .getDisplayName(TextStyle.SHORT, Locale.ENGLISH);
            months.add(new MonthlyRevenue(label, month.getYear(), amount));
        }

        return new RevenueDataResponse(months);
    }
}
