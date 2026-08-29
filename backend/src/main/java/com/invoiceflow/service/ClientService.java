package com.invoiceflow.service;

import com.invoiceflow.dto.request.ClientRequest;
import com.invoiceflow.dto.response.ClientResponse;
import com.invoiceflow.dto.response.PageResponse;
import com.invoiceflow.exception.InvoiceFlowException;
import com.invoiceflow.model.entity.Business;
import com.invoiceflow.model.entity.Client;
import com.invoiceflow.repository.BusinessRepository;
import com.invoiceflow.repository.ClientRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.util.UUID;

@Service
@RequiredArgsConstructor
public class ClientService {

    private final ClientRepository clientRepository;
    private final BusinessRepository businessRepository;

    @Transactional(readOnly = true)
    public PageResponse<ClientResponse> list(UUID businessId, String search, int page, int size) {
        var pageable = PageRequest.of(page, size, Sort.by("name").ascending());

        var resultPage = StringUtils.hasText(search)
                ? clientRepository.searchByBusinessId(businessId, search, pageable)
                : clientRepository.findByBusinessIdAndIsActiveTrue(businessId, pageable);

        return PageResponse.from(resultPage.map(ClientResponse::from));
    }

    @Transactional(readOnly = true)
    public ClientResponse get(UUID businessId, UUID clientId) {
        return clientRepository.findByIdAndBusinessId(clientId, businessId)
                .map(ClientResponse::from)
                .orElseThrow(() -> InvoiceFlowException.notFound("Client not found"));
    }

    @Transactional
    public ClientResponse create(UUID businessId, ClientRequest req) {
        Business business = businessRepository.findById(businessId)
                .orElseThrow(() -> InvoiceFlowException.notFound("Business not found"));

        Client client = Client.builder()
                .business(business)
                .name(req.name())
                .email(req.email())
                .phone(req.phone())
                .companyName(req.companyName())
                .vatNumber(req.vatNumber())
                .addressLine1(req.addressLine1())
                .addressLine2(req.addressLine2())
                .city(req.city())
                .province(req.province())
                .postalCode(req.postalCode())
                .country(req.country() != null ? req.country() : "ZA")
                .notes(req.notes())
                .build();

        return ClientResponse.from(clientRepository.save(client));
    }

    @Transactional
    public ClientResponse update(UUID businessId, UUID clientId, ClientRequest req) {
        Client client = clientRepository.findByIdAndBusinessId(clientId, businessId)
                .orElseThrow(() -> InvoiceFlowException.notFound("Client not found"));

        client.setName(req.name());
        client.setEmail(req.email());
        client.setPhone(req.phone());
        client.setCompanyName(req.companyName());
        client.setVatNumber(req.vatNumber());
        client.setAddressLine1(req.addressLine1());
        client.setAddressLine2(req.addressLine2());
        client.setCity(req.city());
        client.setProvince(req.province());
        client.setPostalCode(req.postalCode());
        if (req.country() != null) client.setCountry(req.country());
        client.setNotes(req.notes());

        return ClientResponse.from(clientRepository.save(client));
    }

    @Transactional
    public void delete(UUID businessId, UUID clientId) {
        Client client = clientRepository.findByIdAndBusinessId(clientId, businessId)
                .orElseThrow(() -> InvoiceFlowException.notFound("Client not found"));
        client.setActive(false);
        clientRepository.save(client);
    }
}
