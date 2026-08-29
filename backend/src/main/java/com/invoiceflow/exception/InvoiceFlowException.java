package com.invoiceflow.exception;

import org.springframework.http.HttpStatus;

public class InvoiceFlowException extends RuntimeException {

    private final HttpStatus status;
    private final String code;

    public InvoiceFlowException(String message, HttpStatus status, String code) {
        super(message);
        this.status = status;
        this.code = code;
    }

    public HttpStatus getStatus() { return status; }
    public String getCode() { return code; }

    public static InvoiceFlowException notFound(String message) {
        return new InvoiceFlowException(message, HttpStatus.NOT_FOUND, "NOT_FOUND");
    }

    public static InvoiceFlowException badRequest(String message) {
        return new InvoiceFlowException(message, HttpStatus.BAD_REQUEST, "BAD_REQUEST");
    }

    public static InvoiceFlowException conflict(String message) {
        return new InvoiceFlowException(message, HttpStatus.CONFLICT, "CONFLICT");
    }

    public static InvoiceFlowException forbidden(String message) {
        return new InvoiceFlowException(message, HttpStatus.FORBIDDEN, "FORBIDDEN");
    }

    public static InvoiceFlowException unauthorized(String message) {
        return new InvoiceFlowException(message, HttpStatus.UNAUTHORIZED, "UNAUTHORIZED");
    }
}
