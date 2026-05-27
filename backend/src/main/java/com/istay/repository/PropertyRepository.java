package com.istay.repository;

import com.istay.model.Property;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import java.math.BigDecimal;
import java.util.List;

@Repository
public interface PropertyRepository extends JpaRepository<Property, Long> {

    List<Property> findByOwnerId(Long ownerId);

    @Query("SELECT p FROM Property p WHERE " +
           "(:location IS NULL OR LOWER(p.location) LIKE LOWER(CONCAT('%', :location, '%'))) AND " +
           "(:minPrice IS NULL OR p.price >= :minPrice) AND " +
           "(:maxPrice IS NULL OR p.price <= :maxPrice) AND " +
           "(:rooms IS NULL OR p.rooms = :rooms) AND " +
           "(:type IS NULL OR p.type = :type) AND " +
           "(:amenities IS NULL OR LOWER(p.amenities) LIKE LOWER(CONCAT('%', :amenities, '%'))) AND " +
           "(:suitableFor IS NULL OR p.suitableFor = :suitableFor) AND " +
           "(:category IS NULL OR p.category = :category)")
    Page<Property> searchProperties(
            @Param("location") String location,
            @Param("minPrice") BigDecimal minPrice,
            @Param("maxPrice") BigDecimal maxPrice,
            @Param("rooms") Integer rooms,
            @Param("type") Property.PropertyType type,
            @Param("amenities") String amenities,
            @Param("suitableFor") Property.SuitableFor suitableFor,
            @Param("category") Property.PropertyCategory category,
            Pageable pageable
    );

    Page<Property> findAll(Pageable pageable);
}
