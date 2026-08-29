package com.invoiceflow.dto.response;

import com.invoiceflow.model.entity.Invoice;
import com.invoiceflow.model.entity.Invoice.InvoiceStatus;
import com.invoiceflow.model.entity.Invoice.LineItem;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

public record InvoiceResponse(
    UUID id,
    String invoiceNumber,
    InvoiceStatus status,
    LocalDate issueDate,
    LocalDate dueDate,
    List<LineItem> lineItems,
    BigDecimal subtotal,
    BigDecimal taxTotal,
    BigDecimal total,
    String currency,
    String notes,
    String terms,
    String pdfUrl,
    UUID viewToken,
    LocalDateTime sentAt,
    LocalDateTime viewedAt,
    LocalDateTime paidAt,
    LocalDateTime createdAt,
    ClientSummary client,
    BusinessSummary business
) {
    public record ClientSummary(UUID id, String name, String companyName, String email) {}
    public record BusinessSummary(UUID id, String name, String logoUrl, String primaryColor) {}

    public static InvoiceResponse from(Invoice i) {
        return new InvoiceResponse(
            i.getId(), i.getInvoiceNumber(), i.getStatus(),
            i.getIssueDate(), i.getDueDate(), i.getLineItems(),
            i.getSubtotal(), i.getTaxTotal(), i.getTotal(), i.getCurrency(),
            i.getNotes(), i.getTerms(), i.getPdfUrl(), i.getViewToken(),
            i.getSentAt(), i.getViewedAt(), i.getPaidAt(), i.getCreatedAt(),
            new ClientSummary(i.getClient().getId(), i.getClient().getName(),
                    i.getClient().getCompanyName(), i.getClient().getEmail()),
            new BusinessSummary(i.getBusiness().getId(), i.getBusiness().getName(),
                    i.getBusiness().getLogoUrl(), i.getBusiness().getPrimaryColor())
        );
    }
}
