package com.invoiceflow.dto.request;

import jakarta.validation.constraints.NotBlank;

public record ClientRequest(
    @NotBlank String name,
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
    String notes
) {}
