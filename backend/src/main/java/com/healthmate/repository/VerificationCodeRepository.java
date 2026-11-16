package com.healthmate.repository;

import com.healthmate.model.User;
import com.healthmate.model.VerificationCode;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface VerificationCodeRepository extends JpaRepository<VerificationCode, Long> {
    
    Optional<VerificationCode> findByUserAndCodeAndType(User user, String code, VerificationCode.CodeType type);

    Optional<VerificationCode> findFirstByUserAndTypeAndUsedFalseOrderByCreatedAtDesc(
            User user, VerificationCode.CodeType type);

    Optional<VerificationCode> findByCodeAndType(String code, VerificationCode.CodeType type);
    
    void deleteAllByUserAndType(User user, VerificationCode.CodeType type);
}
