package com.istay.service;

import com.istay.dto.MessageDto;
import com.istay.dto.MessageRequest;
import com.istay.exception.ResourceNotFoundException;
import com.istay.model.Message;
import com.istay.model.Property;
import com.istay.model.User;
import com.istay.repository.MessageRepository;
import com.istay.repository.PropertyRepository;
import com.istay.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
public class MessageService {

    @Autowired
    private MessageRepository messageRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PropertyRepository propertyRepository;

    @Transactional
    public MessageDto sendMessage(MessageRequest request, String senderEmail) {
        User sender = userRepository.findByEmail(senderEmail)
                .orElseThrow(() -> new ResourceNotFoundException("Sender not found"));
        
        User receiver = userRepository.findById(request.getReceiverId())
                .orElseThrow(() -> new ResourceNotFoundException("Receiver not found"));
                
        Property property = propertyRepository.findById(request.getPropertyId())
                .orElseThrow(() -> new ResourceNotFoundException("Property not found"));

        Message message = Message.builder()
                .sender(sender)
                .receiver(receiver)
                .property(property)
                .content(request.getContent())
                .isRead(false)
                .build();

        Message savedMessage = messageRepository.save(message);
        return convertToDto(savedMessage);
    }

    @Transactional
    public List<MessageDto> getChatHistory(Long propertyId, Long otherUserId, String currentUserEmail) {
        User currentUser = userRepository.findByEmail(currentUserEmail)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
        
        List<Message> messages = messageRepository.findChatHistory(propertyId, currentUser.getId(), otherUserId);
        
        // Mark messages as read if the current user is the receiver
        boolean hasUnread = false;
        for (Message m : messages) {
            if (!m.isRead() && m.getReceiver().getId().equals(currentUser.getId())) {
                m.setRead(true);
                hasUnread = true;
            }
        }
        if (hasUnread) {
            messageRepository.saveAll(messages);
        }

        return messages.stream().map(this::convertToDto).collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<MessageDto> getInbox(String currentUserEmail) {
        User currentUser = userRepository.findByEmail(currentUserEmail)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
                
        List<Message> messages = messageRepository.findInboxForUser(currentUser.getId());
        
        // Sort by timestamp descending
        messages.sort((m1, m2) -> m2.getTimestamp().compareTo(m1.getTimestamp()));
        
        return messages.stream().map(this::convertToDto).collect(Collectors.toList());
    }

    private MessageDto convertToDto(Message message) {
        return MessageDto.builder()
                .id(message.getId())
                .senderId(message.getSender().getId())
                .senderName(message.getSender().getName())
                .receiverId(message.getReceiver().getId())
                .receiverName(message.getReceiver().getName())
                .propertyId(message.getProperty().getId())
                .propertyTitle(message.getProperty().getTitle())
                .content(message.getContent())
                .timestamp(message.getTimestamp())
                .isRead(message.isRead())
                .build();
    }
}
