package com.invoiceflow.repository;

import com.invoiceflow.model.entity.Invoice;
import com.invoiceflow.model.entity.Invoice.InvoiceStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface InvoiceRepository extends JpaRepository<Invoice, UUID> {

    Page<Invoice> findByBusinessId(UUID businessId, Pageable pageable);

    Page<Invoice> findByBusinessIdAndStatus(UUID businessId, InvoiceStatus status, Pageable pageable);

    Optional<Invoice> findByIdAndBusinessId(UUID id, UUID businessId);

    Optional<Invoice> findByViewToken(UUID viewToken);

    List<Invoice> findByBusinessIdOrderByCreatedAtDesc(UUID businessId, Pageable pageable);

    @Query("""
        SELECT i FROM Invoice i
        WHERE i.status IN ('SENT', 'VIEWED')
        AND i.dueDate < :today
        """)
    List<Invoice> findOverdueInvoices(LocalDate today);

    @Query("""
        SELECT COALESCE(SUM(i.total), 0) FROM Invoice i
        WHERE i.business.id = :businessId AND i.status = 'PAID'
        """)
    BigDecimal sumPaidByBusinessId(UUID businessId);

    @Query("""
        SELECT COALESCE(SUM(i.total), 0) FROM Invoice i
        WHERE i.business.id = :businessId AND i.status IN ('SENT', 'VIEWED')
        """)
    BigDecimal sumOutstandingByBusinessId(UUID businessId);

    @Query("""
        SELECT COALESCE(SUM(i.total), 0) FROM Invoice i
        WHERE i.business.id = :businessId AND i.status = 'OVERDUE'
        """)
    BigDecimal sumOverdueByBusinessId(UUID businessId);

    long countByBusinessIdAndStatus(UUID businessId, InvoiceStatus status);

    Optional<Invoice> findByPayfastPaymentId(String payfastPaymentId);

    @Query("""
        SELECT EXTRACT(YEAR FROM i.paidAt) AS year,
               EXTRACT(MONTH FROM i.paidAt) AS month,
               COALESCE(SUM(i.total), 0) AS revenue
        FROM Invoice i
        WHERE i.business.id = :businessId
        AND i.status = 'PAID'
        AND i.paidAt >= :from
        GROUP BY EXTRACT(YEAR FROM i.paidAt), EXTRACT(MONTH FROM i.paidAt)
        ORDER BY year, month
        """)
    List<Object[]> monthlyRevenue(UUID businessId,
        @org.springframework.data.repository.query.Param("from")
        java.time.LocalDateTime from);

    default List<Object[]> monthlyRevenue(UUID businessId) {
        return monthlyRevenue(businessId, java.time.LocalDateTime.now().minusMonths(12));
    }
}
