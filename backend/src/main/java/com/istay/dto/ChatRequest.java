package com.istay.dto;

import java.util.List;

import lombok.Data;

@Data
public class ChatRequest {
    private String message;
    private List<ChatMessage> history;

    @Data
    public static class ChatMessage {
        private String role; // "user" or "model"
        private String content;
    }
}
