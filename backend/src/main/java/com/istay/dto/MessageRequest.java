package com.istay.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class MessageRequest {
    @NotNull(message = "Receiver ID is required")
    private Long receiverId;

    @NotNull(message = "Property ID is required")
    private Long propertyId;

    @NotBlank(message = "Content cannot be empty")
    private String content;
}
