package com.istay.repository;

import com.istay.model.Message;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface MessageRepository extends JpaRepository<Message, Long> {

    @Query("SELECT m FROM Message m WHERE m.property.id = :propertyId AND " +
           "((m.sender.id = :userId1 AND m.receiver.id = :userId2) OR " +
           "(m.sender.id = :userId2 AND m.receiver.id = :userId1)) " +
           "ORDER BY m.timestamp ASC")
    List<Message> findChatHistory(@Param("propertyId") Long propertyId, 
                                  @Param("userId1") Long userId1, 
                                  @Param("userId2") Long userId2);

    @Query("SELECT m FROM Message m WHERE m.id IN (" +
           "SELECT MAX(m2.id) FROM Message m2 WHERE m2.sender.id = :userId OR m2.receiver.id = :userId " +
           "GROUP BY m2.property.id, " +
           "CASE WHEN m2.sender.id = :userId THEN m2.receiver.id ELSE m2.sender.id END)")
    List<Message> findInboxForUser(@Param("userId") Long userId);
}
