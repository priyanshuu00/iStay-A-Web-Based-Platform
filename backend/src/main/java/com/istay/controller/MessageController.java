package com.istay.controller;

import com.istay.dto.MessageDto;
import com.istay.dto.MessageRequest;
import com.istay.service.MessageService;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/messages")
@CrossOrigin(origins = "*")
public class MessageController {

    @Autowired
    private MessageService messageService;

    // Send a new message
    @PostMapping
    public ResponseEntity<MessageDto> sendMessage(@Valid @RequestBody MessageRequest request, Authentication authentication) {
        MessageDto message = messageService.sendMessage(request, authentication.getName());
        return new ResponseEntity<>(message, HttpStatus.CREATED);
    }

    // Get chat history for a specific property and user
    @GetMapping("/{propertyId}/{otherUserId}")
    public ResponseEntity<List<MessageDto>> getChatHistory(
            @PathVariable Long propertyId, 
            @PathVariable Long otherUserId, 
            Authentication authentication) {
        List<MessageDto> history = messageService.getChatHistory(propertyId, otherUserId, authentication.getName());
        return ResponseEntity.ok(history);
    }

    // Get all conversations for the logged in user (inbox)
    @GetMapping("/inbox")
    public ResponseEntity<List<MessageDto>> getInbox(Authentication authentication) {
        List<MessageDto> inbox = messageService.getInbox(authentication.getName());
        return ResponseEntity.ok(inbox);
    }
}
