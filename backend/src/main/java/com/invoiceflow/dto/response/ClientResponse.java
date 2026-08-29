package com.invoiceflow.dto.response;

import com.invoiceflow.model.entity.Client;

import java.time.LocalDateTime;
import java.util.UUID;

public record ClientResponse(
    UUID id,
    String name,
    String email,
    String phone,
    String companyName,
    String vatNumber,
    String addressLine1,
    String addressLine2,
    String city,
    String province,
    String postalCode,
    String country,
    String notes,
    boolean isActive,
    LocalDateTime createdAt
) {
    public static ClientResponse from(Client c) {
        return new ClientResponse(
            c.getId(), c.getName(), c.getEmail(), c.getPhone(),
            c.getCompanyName(), c.getVatNumber(), c.getAddressLine1(), c.getAddressLine2(),
            c.getCity(), c.getProvince(), c.getPostalCode(), c.getCountry(),
            c.getNotes(), c.isActive(), c.getCreatedAt()
        );
    }
}
