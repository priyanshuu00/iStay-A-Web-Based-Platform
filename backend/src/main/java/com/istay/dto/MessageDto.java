package com.istay.dto;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@Builder
public class MessageDto {
    private Long id;
    private Long senderId;
    private String senderName;
    private Long receiverId;
    private String receiverName;
    private Long propertyId;
    private String propertyTitle;
    private String content;
    private LocalDateTime timestamp;
    private boolean isRead;
}
