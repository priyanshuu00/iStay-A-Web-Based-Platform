package com.istay.controller;

import com.istay.dto.ChatRequest;
import com.istay.dto.ChatResponse;
import com.istay.service.ChatService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/chat")
public class ChatController {

    @Autowired
    private ChatService chatService;

    @PostMapping
    public ResponseEntity<ChatResponse> chat(@RequestBody ChatRequest request) {
        String reply = chatService.chat(request);
        return ResponseEntity.ok(new ChatResponse(reply));
    }
}
