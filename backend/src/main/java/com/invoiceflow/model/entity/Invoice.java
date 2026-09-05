package com.invoiceflow.model.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "invoices")
@EntityListeners(AuditingEntityListener.class)
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Invoice {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "business_id", nullable = false)
    private Business business;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "client_id", nullable = false)
    private Client client;

    @Column(name = "invoice_number", nullable = false)
    private String invoiceNumber;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    @Builder.Default
    private InvoiceStatus status = InvoiceStatus.DRAFT;

    @Column(name = "issue_date", nullable = false)
    private LocalDate issueDate;

    @Column(name = "due_date", nullable = false)
    private LocalDate dueDate;

    /**
     * Line items stored as JSONB for flexibility.
     * Format: [{ description, quantity, unitPrice, taxRate, amount }]
     */
    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "line_items", nullable = false, columnDefinition = "jsonb")
    private List<LineItem> lineItems;

    @Column(nullable = false, precision = 12, scale = 2)
    @Builder.Default
    private BigDecimal subtotal = BigDecimal.ZERO;

    @Column(name = "tax_total", precision = 12, scale = 2)
    @Builder.Default
    private BigDecimal taxTotal = BigDecimal.ZERO;

    @Column(nullable = false, precision = 12, scale = 2)
    @Builder.Default
    private BigDecimal total = BigDecimal.ZERO;

    @Column(nullable = false)
    @Builder.Default
    private String currency = "ZAR";

    @Column(columnDefinition = "TEXT")
    private String notes;

    @Column(columnDefinition = "TEXT")
    private String terms;

    @Column(name = "pdf_url")
    private String pdfUrl;

    /**
     * Unique token for client-facing public view URL (no auth required).
     * Format: /invoice/public/{viewToken}
     */
    @Column(name = "view_token", unique = true, nullable = false)
    @Builder.Default
    private UUID viewToken = UUID.randomUUID();

    @Column(name = "sent_at")
    private LocalDateTime sentAt;

    @Column(name = "viewed_at")
    private LocalDateTime viewedAt;

    @Column(name = "paid_at")
    private LocalDateTime paidAt;

    @Column(name = "contact_person")
    private String contactPerson;

    @Column(name = "purchase_order_number")
    private String purchaseOrderNumber;

    @Column(name = "tin_number")
    private String tinNumber;

    @Column(name = "payfast_payment_id")
    private String payfastPaymentId;

    @CreatedDate
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @LastModifiedDate
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    public enum InvoiceStatus {
        DRAFT, SENT, VIEWED, PAID, OVERDUE, CANCELLED
    }

    /**
     * Embedded line item record stored in JSONB.
     */
    public record LineItem(
        String description,
        BigDecimal quantity,
        BigDecimal unitPrice,
        BigDecimal taxRate,    // e.g. 15 for 15% VAT, 0 for zero-rated
        BigDecimal amount      // quantity * unitPrice * (1 + taxRate/100)
    ) {}
}
