package com.istay.service;

import com.istay.dto.PropertyRequest;
import com.istay.exception.ResourceNotFoundException;
import com.istay.exception.UnauthorizedActionException;
import com.istay.model.Property;
import com.istay.model.User;
import com.istay.model.SearchHistory;
import com.istay.repository.PropertyRepository;
import com.istay.repository.SearchHistoryRepository;
import com.istay.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;

@Service
public class PropertyService {

    @Autowired
    private PropertyRepository propertyRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private SearchHistoryRepository searchHistoryRepository;

    @Transactional
    public Property addProperty(PropertyRequest request, String ownerEmail) {
        User owner = userRepository.findByEmail(ownerEmail)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        Property property = Property.builder()
                .title(request.getTitle())
                .description(request.getDescription())
                .location(request.getLocation())
                .price(request.getPrice())
                .rooms(request.getRooms())
                .type(Property.PropertyType.valueOf(request.getType().toUpperCase()))
                .category(request.getCategory() != null ? Property.PropertyCategory.valueOf(request.getCategory().toUpperCase()) : Property.PropertyCategory.HOUSE)
                .area(request.getArea())
                .areaUnit(request.getAreaUnit())
                .suitableFor(request.getSuitableFor() != null ? Property.SuitableFor.valueOf(request.getSuitableFor().toUpperCase()) : Property.SuitableFor.ANY)
                .amenities(request.getAmenities())
                .imageUrls(request.getImageUrls() != null ? request.getImageUrls() : new ArrayList<>())
                .latitude(request.getLatitude())
                .longitude(request.getLongitude())
                .owner(owner)
                .build();

        return propertyRepository.save(property);
    }

    @Transactional
    public Property updateProperty(Long id, PropertyRequest request, String ownerEmail) {
        Property property = propertyRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Property not found with id: " + id));

        if (!property.getOwner().getEmail().equals(ownerEmail)) {
            throw new UnauthorizedActionException("You can only edit your own properties");
        }

        property.setTitle(request.getTitle());
        property.setDescription(request.getDescription());
        property.setLocation(request.getLocation());
        property.setPrice(request.getPrice());
        property.setRooms(request.getRooms() != null ? request.getRooms() : 0);
        property.setType(Property.PropertyType.valueOf(request.getType().toUpperCase()));
        property.setCategory(request.getCategory() != null ? Property.PropertyCategory.valueOf(request.getCategory().toUpperCase()) : Property.PropertyCategory.HOUSE);
        property.setArea(request.getArea());
        property.setAreaUnit(request.getAreaUnit());
        property.setSuitableFor(request.getSuitableFor() != null ? Property.SuitableFor.valueOf(request.getSuitableFor().toUpperCase()) : Property.SuitableFor.ANY);
        property.setAmenities(request.getAmenities());
        property.setImageUrls(request.getImageUrls() != null ? request.getImageUrls() : new ArrayList<>());
        property.setLatitude(request.getLatitude());
        property.setLongitude(request.getLongitude());

        return propertyRepository.save(property);
    }

    @Transactional(readOnly = true)
    public Page<Property> getAllProperties(int page, int size, String sortBy, String direction) {
        Sort sort = direction.equalsIgnoreCase("desc")
                ? Sort.by(sortBy).descending()
                : Sort.by(sortBy).ascending();
        Pageable pageable = PageRequest.of(page, size, sort);
        return propertyRepository.findAll(pageable);
    }

    @Transactional(readOnly = true)
    public Property getPropertyById(Long id) {
        return propertyRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Property not found with id: " + id));
    }

    @Transactional
    public Page<Property> searchProperties(String location, BigDecimal minPrice, BigDecimal maxPrice,
                                            Integer rooms, String type, String amenities, String suitableForStr, String categoryStr,
                                            int page, int size, String sortBy, String direction, Long userId) {
        Property.PropertyType propertyType = null;
        if (type != null && !type.isEmpty()) {
            propertyType = Property.PropertyType.valueOf(type.toUpperCase());
        }

        Property.SuitableFor suitableFor = null;
        if (suitableForStr != null && !suitableForStr.isEmpty()) {
            suitableFor = Property.SuitableFor.valueOf(suitableForStr.toUpperCase());
        }

        Property.PropertyCategory category = null;
        if (categoryStr != null && !categoryStr.isEmpty()) {
            category = Property.PropertyCategory.valueOf(categoryStr.toUpperCase());
        }

        Sort sort = direction.equalsIgnoreCase("desc")
                ? Sort.by(sortBy).descending()
                : Sort.by(sortBy).ascending();
        Pageable pageable = PageRequest.of(page, size, sort);

        if (userId != null) {
            // Only log if at least one meaningful filter is applied
            if (location != null || minPrice != null || maxPrice != null || rooms != null) {
                SearchHistory history = SearchHistory.builder()
                        .userId(userId)
                        .location(location)
                        .minPrice(minPrice)
                        .maxPrice(maxPrice)
                        .rooms(rooms)
                        .build();
                searchHistoryRepository.save(history);
            }
        }

        return propertyRepository.searchProperties(
                location, minPrice, maxPrice, rooms, propertyType, amenities, suitableFor, category, pageable
        );
    }

    @Transactional(readOnly = true)
    public List<Property> getPropertiesByOwner(String ownerEmail) {
        User owner = userRepository.findByEmail(ownerEmail)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
        return propertyRepository.findByOwnerId(owner.getId());
    }

    @Transactional
    public void deleteProperty(Long id, String ownerEmail) {
        Property property = propertyRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Property not found with id: " + id));

        if (!property.getOwner().getEmail().equals(ownerEmail)) {
            throw new UnauthorizedActionException("You can only delete your own properties");
        }

        propertyRepository.delete(property);
    }

    @Transactional(readOnly = true)
    public List<Property> getRecommendations(Long userId) {
        java.util.Optional<SearchHistory> historyOpt = searchHistoryRepository.findFirstByUserIdOrderByTimestampDesc(userId);
        
        if (historyOpt.isPresent()) {
            SearchHistory history = historyOpt.get();
            
            String location = history.getLocation();
            BigDecimal minPrice = history.getMinPrice();
            BigDecimal maxPrice = history.getMaxPrice();
            Integer rooms = history.getRooms();
            
            // Relax parameters slightly for better results
            if (minPrice != null) {
                minPrice = minPrice.multiply(new BigDecimal("0.8")); // 20% lower
            }
            if (maxPrice != null) {
                maxPrice = maxPrice.multiply(new BigDecimal("1.2")); // 20% higher
            }
            
            // Use existing repository method to fetch relaxed recommendations
            Pageable pageable = PageRequest.of(0, 4, Sort.by("createdAt").descending());
            Page<Property> results = propertyRepository.searchProperties(
                    location, minPrice, maxPrice, rooms, null, null, null, null, pageable
            );
            
            if (!results.isEmpty()) {
                return results.getContent();
            }
        }
        
        // Fallback: Latest properties
        Pageable latestPageable = PageRequest.of(0, 4, Sort.by("createdAt").descending());
        return propertyRepository.findAll(latestPageable).getContent();
    }
}
