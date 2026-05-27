package com.istay.controller;

import com.istay.dto.PropertyRequest;
import com.istay.model.Property;
import com.istay.service.PropertyService;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/properties")
@CrossOrigin(origins = "*")
public class PropertyController {

    @Autowired
    private PropertyService propertyService;

    // Add a new property (authenticated)
    @PostMapping
    public ResponseEntity<Map<String, Object>> addProperty(
            @Valid @RequestBody PropertyRequest request,
            Authentication authentication) {
        Property property = propertyService.addProperty(request, authentication.getName());

        Map<String, Object> response = new HashMap<>();
        response.put("message", "Property added successfully");
        response.put("propertyId", property.getId());
        return new ResponseEntity<>(response, HttpStatus.CREATED);
    }

    // Update a property (authenticated, owner only)
    @PutMapping("/{id}")
    public ResponseEntity<Map<String, Object>> updateProperty(
            @PathVariable Long id,
            @Valid @RequestBody PropertyRequest request,
            Authentication authentication) {
        Property property = propertyService.updateProperty(id, request, authentication.getName());

        Map<String, Object> response = new HashMap<>();
        response.put("message", "Property updated successfully");
        response.put("propertyId", property.getId());
        return ResponseEntity.ok(response);
    }

    // Get all properties (public, paginated)
    @GetMapping
    public ResponseEntity<Map<String, Object>> getAllProperties(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "12") int size,
            @RequestParam(defaultValue = "createdAt") String sortBy,
            @RequestParam(defaultValue = "desc") String direction) {

        Page<Property> propertyPage = propertyService.getAllProperties(page, size, sortBy, direction);
        return ResponseEntity.ok(buildPageResponse(propertyPage));
    }

    // Get property by ID (public)
    @GetMapping("/{id}")
    public ResponseEntity<Property> getPropertyById(@PathVariable Long id) {
        Property property = propertyService.getPropertyById(id);
        return ResponseEntity.ok(property);
    }

    // Search properties with filters (public, paginated)
    @GetMapping("/search")
    public ResponseEntity<Map<String, Object>> searchProperties(
            @RequestParam(required = false) String location,
            @RequestParam(required = false) BigDecimal minPrice,
            @RequestParam(required = false) BigDecimal maxPrice,
            @RequestParam(required = false) Integer rooms,
            @RequestParam(required = false) String type,
            @RequestParam(required = false) String amenities,
            @RequestParam(required = false) String suitableFor,
            @RequestParam(required = false) String category,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "12") int size,
            @RequestParam(defaultValue = "createdAt") String sortBy,
            @RequestParam(defaultValue = "desc") String direction,
            @RequestParam(required = false) Long userId) {

        Page<Property> propertyPage = propertyService.searchProperties(
                location, minPrice, maxPrice, rooms, type, amenities, suitableFor, category, page, size, sortBy, direction, userId);
        return ResponseEntity.ok(buildPageResponse(propertyPage));
    }

    // Get recommendations for user (public)
    @GetMapping("/recommend/{userId}")
    public ResponseEntity<List<Property>> getRecommendations(@PathVariable Long userId) {
        List<Property> properties = propertyService.getRecommendations(userId);
        return ResponseEntity.ok(properties);
    }

    // Get properties by owner (authenticated)
    @GetMapping("/owner")
    public ResponseEntity<List<Property>> getOwnerProperties(Authentication authentication) {
        List<Property> properties = propertyService.getPropertiesByOwner(authentication.getName());
        return ResponseEntity.ok(properties);
    }

    // Delete property (authenticated, owner only)
    @DeleteMapping("/{id}")
    public ResponseEntity<Map<String, String>> deleteProperty(
            @PathVariable Long id,
            Authentication authentication) {
        propertyService.deleteProperty(id, authentication.getName());

        Map<String, String> response = new HashMap<>();
        response.put("message", "Property deleted successfully");
        return ResponseEntity.ok(response);
    }

    // Helper: build paginated response
    private Map<String, Object> buildPageResponse(Page<Property> page) {
        Map<String, Object> response = new HashMap<>();
        response.put("properties", page.getContent());
        response.put("currentPage", page.getNumber());
        response.put("totalItems", page.getTotalElements());
        response.put("totalPages", page.getTotalPages());
        return response;
    }
}
