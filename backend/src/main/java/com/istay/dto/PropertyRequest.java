package com.istay.dto;

import jakarta.validation.constraints.*;
import lombok.*;
import java.math.BigDecimal;
import java.util.List;

@Getter @Setter
@NoArgsConstructor @AllArgsConstructor
public class PropertyRequest {

    @NotBlank(message = "Title is required")
    @Size(max = 200)
    private String title;

    private String description;

    @NotBlank(message = "Location is required")
    @Size(max = 255)
    private String location;

    @NotNull(message = "Price is required")
    @Min(value = 0, message = "Price cannot be negative")
    private BigDecimal price;

    private Integer rooms;

    @NotBlank(message = "Property type is required (RENT or SALE)")
    private String type;

    private String amenities;

    private List<String> imageUrls;

    private Double latitude;

    private Double longitude;

    private String category;

    private Double area;

    private String areaUnit;

    private String suitableFor;
}
