package com.istay.service;

import com.istay.dto.ChatRequest;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.*;

@Service
public class ChatService {

    @Value("${app.gemini.api-key}")
    private String geminiApiKey;

    private final RestTemplate restTemplate = new RestTemplate();

    private static final String GEMINI_URL =
            "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent";

    private static final String SYSTEM_INSTRUCTION = """
            You are **iStay Assistant**, the official AI helper for the iStay property platform — a modern real-estate marketplace in India.

            **About iStay:**
            - Users can browse, list, buy, rent, and sell properties (Houses, Rooms, and Lands).
            - Property types: RENT or SALE.
            - Categories: HOUSE, ROOM, LAND.
            - Suitability filters: FAMILY, SOLO_STUDENT, SOLO_EMPLOYEE, ANY.
            - Amenities include: WiFi, Parking, AC, Gym, Swimming Pool, Garden, Security, Power Backup, Elevator, Furnished, etc.
            - Sellers list properties with title, description, location, price, rooms, images, latitude/longitude, and amenities.
            - Buyers can search by location, price range, type, category, amenities, and suitability.
            - Users can message property owners directly through the platform inbox.
            - The platform supports JWT-based authentication with Buyer and Seller roles.

            **Your role:**
            - Help buyers find properties, explain search filters, and answer questions about listings.
            - Help sellers understand how to list properties, set competitive prices, and manage their listings.
            - Provide general real-estate advice relevant to the Indian market (rental agreements, legal tips, pricing guidance).
            - Answer questions about how the iStay platform works (registration, login, messaging, dashboard).
            - Be friendly, concise, and helpful. Use emojis sparingly for warmth.
            - If you don't know something specific about a listing, suggest the user check the relevant page or contact the seller.
            - Keep responses focused and under 200 words unless the user asks for detailed guidance.
            - NEVER reveal technical details about the backend, API, database, or security implementation.
            """;

    public String chat(ChatRequest request) {
        try {
            String url = GEMINI_URL + "?key=" + geminiApiKey;

            Map<String, Object> body = buildRequestBody(request);

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);

            HttpEntity<Map<String, Object>> entity = new HttpEntity<>(body, headers);

            ResponseEntity<Map> response = restTemplate.postForEntity(url, entity, Map.class);

            return extractReply(response.getBody());
        } catch (org.springframework.web.client.HttpClientErrorException e) {
            System.err.println("Gemini API HTTP Error: " + e.getStatusCode());
            System.err.println("Response body: " + e.getResponseBodyAsString());
            e.printStackTrace();
            return "I'm sorry, I'm having trouble connecting right now. Please try again in a moment! 🔄";
        } catch (Exception e) {
            System.err.println("Gemini API Error: " + e.getMessage());
            e.printStackTrace();
            return "I'm sorry, I'm having trouble connecting right now. Please try again in a moment! 🔄";
        }
    }

    private Map<String, Object> buildRequestBody(ChatRequest request) {
        Map<String, Object> body = new LinkedHashMap<>();

        // System instruction
        Map<String, Object> systemInstruction = new LinkedHashMap<>();
        systemInstruction.put("parts", List.of(Map.of("text", SYSTEM_INSTRUCTION)));
        body.put("system_instruction", systemInstruction);

        // Build contents array with history + current message
        List<Map<String, Object>> contents = new ArrayList<>();

        // Add conversation history
        if (request.getHistory() != null) {
            for (ChatRequest.ChatMessage msg : request.getHistory()) {
                Map<String, Object> content = new LinkedHashMap<>();
                content.put("role", msg.getRole());
                content.put("parts", List.of(Map.of("text", msg.getContent())));
                contents.add(content);
            }
        }

        // Add current user message
        Map<String, Object> userMessage = new LinkedHashMap<>();
        userMessage.put("role", "user");
        userMessage.put("parts", List.of(Map.of("text", request.getMessage())));
        contents.add(userMessage);

        body.put("contents", contents);

        // Generation config
        Map<String, Object> generationConfig = new LinkedHashMap<>();
        generationConfig.put("temperature", 0.7);
        generationConfig.put("topP", 0.95);
        generationConfig.put("maxOutputTokens", 1024);
        body.put("generationConfig", generationConfig);

        return body;
    }

    @SuppressWarnings("unchecked")
    private String extractReply(Map<String, Object> responseBody) {
        if (responseBody == null) {
            return "I couldn't process that request. Please try again.";
        }
        try {
            List<Map<String, Object>> candidates = (List<Map<String, Object>>) responseBody.get("candidates");
            Map<String, Object> content = (Map<String, Object>) candidates.get(0).get("content");
            List<Map<String, Object>> parts = (List<Map<String, Object>>) content.get("parts");
            return (String) parts.get(0).get("text");
        } catch (Exception e) {
            return "I couldn't process that request. Please try again.";
        }
    }
}
