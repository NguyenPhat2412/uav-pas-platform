package com.uav.platform.error;

import static org.junit.jupiter.api.Assertions.*;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpInputMessage;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.validation.BeanPropertyBindingResult;
import org.springframework.validation.BindingResult;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.MissingServletRequestParameterException;

class GlobalExceptionHandlerTest {

    private GlobalExceptionHandler exceptionHandler;
    private MockHttpServletRequest request;

    @BeforeEach
    void setUp() {
        exceptionHandler = new GlobalExceptionHandler();
        request = new MockHttpServletRequest();
        request.setRequestURI("/api/v1/test");
    }

    @Test
    void handleSystemException_ReturnsCorrectStatusAndBody() {
        SystemException ex = SystemException.conflict("Data already exists");
        ResponseEntity<ErrorResponse> response =
                exceptionHandler.handleSystemException(ex, request);

        assertEquals(HttpStatus.CONFLICT, response.getStatusCode());
        assertNotNull(response.getBody());
        assertEquals("Data already exists", response.getBody().message());
        assertEquals(409, response.getBody().status());
        assertEquals("/api/v1/test", response.getBody().path());
    }

    @Test
    void handleGenericException_ReturnsInternalServerError() {
        Exception ex = new RuntimeException("Unexpected error");
        ResponseEntity<ErrorResponse> response =
                exceptionHandler.handleGenericException(ex, request);

        assertEquals(HttpStatus.INTERNAL_SERVER_ERROR, response.getStatusCode());
        assertNotNull(response.getBody());
        assertEquals(500, response.getBody().status());
    }

    @Test
    void handleValidationException_ReturnsBadRequestWithFieldErrors() {
        BindingResult bindingResult = new BeanPropertyBindingResult(new Object(), "target");
        bindingResult.addError(new FieldError("target", "email", "must not be blank"));
        MethodArgumentNotValidException ex =
                new MethodArgumentNotValidException(null, bindingResult);

        ResponseEntity<ErrorResponse> response =
                exceptionHandler.handleValidationException(ex, request);

        assertEquals(HttpStatus.BAD_REQUEST, response.getStatusCode());
        assertNotNull(response.getBody());
        assertEquals(400, response.getBody().status());
        assertTrue(response.getBody().message().contains("email: must not be blank"));
        assertEquals("/api/v1/test", response.getBody().path());
    }

    @Test
    void handleMalformedJson_ReturnsBadRequestWithCode() {
        HttpMessageNotReadableException ex =
                new HttpMessageNotReadableException(
                        "Unexpected character", (HttpInputMessage) null);
        ResponseEntity<ErrorResponse> response = exceptionHandler.handleMalformedJson(ex, request);

        assertEquals(HttpStatus.BAD_REQUEST, response.getStatusCode());
        assertNotNull(response.getBody());
        assertEquals("MALFORMED_JSON_REQUEST", response.getBody().code());
        assertEquals(400, response.getBody().status());
    }

    @Test
    void handleParameterException_ReturnsBadRequestWithCode() {
        MissingServletRequestParameterException ex =
                new MissingServletRequestParameterException("stationId", "Long");
        ResponseEntity<ErrorResponse> response =
                exceptionHandler.handleParameterException(ex, request);

        assertEquals(HttpStatus.BAD_REQUEST, response.getStatusCode());
        assertNotNull(response.getBody());
        assertEquals("INVALID_REQUEST_PARAMETER", response.getBody().code());
    }

    @Test
    void handleDataIntegrityViolation_ReturnsConflictWithoutLeakingSql() {
        DataIntegrityViolationException ex =
                new DataIntegrityViolationException(
                        "Duplicate entry 'ST-01' for key 'stations.uk_code'");
        ResponseEntity<ErrorResponse> response =
                exceptionHandler.handleDataIntegrityViolation(ex, request);

        assertEquals(HttpStatus.CONFLICT, response.getStatusCode());
        assertNotNull(response.getBody());
        assertEquals("DATA_INTEGRITY_CONFLICT", response.getBody().code());
        assertFalse(response.getBody().message().contains("uk_code"));
    }
}
