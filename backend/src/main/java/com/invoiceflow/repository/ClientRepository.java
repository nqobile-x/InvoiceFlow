package com.invoiceflow.repository;

import com.invoiceflow.model.entity.Client;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface ClientRepository extends JpaRepository<Client, UUID> {

    Page<Client> findByBusinessIdAndIsActiveTrue(UUID businessId, Pageable pageable);

    @Query("""
        SELECT c FROM Client c
        WHERE c.business.id = :businessId
        AND c.isActive = true
        AND (LOWER(c.name) LIKE LOWER(CONCAT('%', :search, '%'))
             OR LOWER(c.companyName) LIKE LOWER(CONCAT('%', :search, '%'))
             OR LOWER(c.email) LIKE LOWER(CONCAT('%', :search, '%')))
        """)
    Page<Client> searchByBusinessId(UUID businessId, String search, Pageable pageable);

    Optional<Client> findByIdAndBusinessId(UUID id, UUID businessId);
    boolean existsByIdAndBusinessId(UUID id, UUID businessId);
}
