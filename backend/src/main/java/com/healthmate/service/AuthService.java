package com.healthmate.service;

import com.healthmate.dto.*;
import com.healthmate.exception.AccountLockedException;
import com.healthmate.exception.BadRequestException;
import com.healthmate.exception.ResourceNotFoundException;
import com.healthmate.model.User;
import com.healthmate.model.VerificationCode;
import com.healthmate.repository.UserRepository;
import com.healthmate.repository.VerificationCodeRepository;
import com.healthmate.security.CustomUserDetails;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.time.LocalDateTime;

@Service
@RequiredArgsConstructor
@Slf4j
public class AuthService {

    private final UserRepository userRepository;
    private final VerificationCodeRepository verificationCodeRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final AuthenticationManager authenticationManager;
    private final EmailService emailService;

    private static final SecureRandom random = new SecureRandom();
    private static final int CODE_EXPIRATION_MINUTES = 15;
    private static final int MAX_VERIFICATION_CODE_ATTEMPTS = 5;
    private static final int MAX_FAILED_LOGIN_ATTEMPTS = 5;
    private static final int LOCK_DURATION_MINUTES = 15;

    @Transactional
    public AuthResponse register(RegisterRequest request) {
        if (userRepository.existsByEmail(request.getEmail())) {
            throw new BadRequestException("Email already registered");
        }

        User user = User.builder()
                .firstName(request.getFirstName())
                .lastName(request.getLastName())
                .email(request.getEmail())
                .phone(request.getPhone())
                .password(passwordEncoder.encode(request.getPassword()))
                .emailVerified(false)
                .build();

        user = userRepository.save(user);

        // Generate and send verification code
        String code = generateVerificationCode();
        saveVerificationCode(user, code, VerificationCode.CodeType.EMAIL_VERIFICATION);
        emailService.sendVerificationEmail(user, code);

        log.info("User registered successfully: {}", user.getEmail());

        return AuthResponse.builder()
                .message("Registration successful. Please check your email for verification code.")
                .user(AuthResponse.UserDTO.fromUser(user))
                .build();
    }

    @Transactional(noRollbackFor = BadCredentialsException.class)
    public AuthResponse login(LoginRequest request) {
        User user = userRepository.findByEmail(request.getEmail()).orElse(null);

        if (user != null && user.getLockedUntil() != null) {
            if (user.getLockedUntil().isAfter(LocalDateTime.now())) {
                throw new AccountLockedException(
                        "Account temporarily locked due to repeated failed logins. Please try again later.");
            }
            user.setLockedUntil(null);
            user.setFailedLoginAttempts(0);
        }

        try {
            authenticationManager.authenticate(
                    new UsernamePasswordAuthenticationToken(request.getEmail(), request.getPassword())
            );
        } catch (BadCredentialsException ex) {
            if (user != null) {
                user.setFailedLoginAttempts(user.getFailedLoginAttempts() + 1);
                if (user.getFailedLoginAttempts() >= MAX_FAILED_LOGIN_ATTEMPTS) {
                    user.setLockedUntil(LocalDateTime.now().plusMinutes(LOCK_DURATION_MINUTES));
                }
                userRepository.save(user);
            }
            throw new BadCredentialsException("Invalid email or password");
        }

        if (user == null) {
            throw new BadCredentialsException("Invalid email or password");
        }

        user.setFailedLoginAttempts(0);
        user.setLockedUntil(null);

        if (!user.getEmailVerified()) {
            // Resend verification code
            String code = generateVerificationCode();
            saveVerificationCode(user, code, VerificationCode.CodeType.EMAIL_VERIFICATION);
            emailService.sendVerificationEmail(user, code);
            throw new BadRequestException("Email not verified. A new verification code has been sent.");
        }

        CustomUserDetails userDetails = new CustomUserDetails(user);
        String token = jwtService.generateToken(userDetails);

        log.info("User logged in: {}", user.getEmail());

        return AuthResponse.builder()
                .message("Login successful")
                .token(token)
                .user(AuthResponse.UserDTO.fromUser(user))
                .build();
    }

    @Transactional(noRollbackFor = BadRequestException.class)
    public ApiResponse verifyEmail(VerifyEmailRequest request) {
        User user = userRepository.findByEmail(request.getEmail())
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        VerificationCode verificationCode = loadValidVerificationCode(
                user, request.getCode(), VerificationCode.CodeType.EMAIL_VERIFICATION);

        user.setEmailVerified(true);
        userRepository.save(user);

        verificationCode.setUsed(true);
        verificationCodeRepository.save(verificationCode);

        log.info("Email verified for user: {}", user.getEmail());

        return ApiResponse.success("Email verified successfully");
    }

    @Transactional
    public ApiResponse forgotPassword(ForgotPasswordRequest request) {
        User user = userRepository.findByEmail(request.getEmail())
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        String code = generateVerificationCode();
        saveVerificationCode(user, code, VerificationCode.CodeType.PASSWORD_RESET);
        emailService.sendPasswordResetEmail(user, code);

        log.info("Password reset code sent to: {}", user.getEmail());

        return ApiResponse.success("Password reset code sent to your email");
    }

    @Transactional(noRollbackFor = BadRequestException.class)
    public ApiResponse verifyResetCode(VerifyEmailRequest request) {
        User user = userRepository.findByEmail(request.getEmail())
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        loadValidVerificationCode(user, request.getCode(), VerificationCode.CodeType.PASSWORD_RESET);

        return ApiResponse.success("Code verified successfully");
    }

    @Transactional(noRollbackFor = BadRequestException.class)
    public ApiResponse resetPassword(ResetPasswordRequest request) {
        User user = userRepository.findByEmail(request.getEmail())
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        VerificationCode verificationCode = loadValidVerificationCode(
                user, request.getCode(), VerificationCode.CodeType.PASSWORD_RESET);

        user.setPassword(passwordEncoder.encode(request.getNewPassword()));
        userRepository.save(user);

        verificationCode.setUsed(true);
        verificationCodeRepository.save(verificationCode);

        log.info("Password reset successful for user: {}", user.getEmail());

        return ApiResponse.success("Password reset successfully");
    }

    @Transactional
    public ApiResponse resendCode(ForgotPasswordRequest request) {
        User user = userRepository.findByEmail(request.getEmail())
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        String code = generateVerificationCode();
        
        if (!user.getEmailVerified()) {
            saveVerificationCode(user, code, VerificationCode.CodeType.EMAIL_VERIFICATION);
            emailService.sendVerificationEmail(user, code);
        } else {
            saveVerificationCode(user, code, VerificationCode.CodeType.PASSWORD_RESET);
            emailService.sendPasswordResetEmail(user, code);
        }

        return ApiResponse.success("Verification code resent");
    }

    private VerificationCode loadValidVerificationCode(
            User user, String code, VerificationCode.CodeType type) {
        VerificationCode verificationCode = verificationCodeRepository
                .findFirstByUserAndTypeAndUsedFalseOrderByCreatedAtDesc(user, type)
                .orElseThrow(() -> new BadRequestException("Invalid verification code"));

        if (verificationCode.isExpired()) {
            throw new BadRequestException("Verification code has expired or already been used");
        }

        if (code == null || !codesMatch(verificationCode.getCode(), code)) {
            int attempts = verificationCode.getAttempts() + 1;
            verificationCode.setAttempts(attempts);

            if (attempts >= MAX_VERIFICATION_CODE_ATTEMPTS) {
                verificationCode.setUsed(true);
                verificationCodeRepository.save(verificationCode);
                throw new BadRequestException(
                        "Too many failed verification attempts. Please request a new verification code.");
            }

            verificationCodeRepository.save(verificationCode);
            throw new BadRequestException("Invalid verification code");
        }

        return verificationCode;
    }

    private boolean codesMatch(String expected, String provided) {
        return MessageDigest.isEqual(
                expected.getBytes(StandardCharsets.UTF_8),
                provided.getBytes(StandardCharsets.UTF_8));
    }

    private String generateVerificationCode() {
        int code = 100000 + random.nextInt(900000);
        return String.valueOf(code);
    }

    private void saveVerificationCode(User user, String code, VerificationCode.CodeType type) {
        // Delete existing codes of the same type
        verificationCodeRepository.deleteAllByUserAndType(user, type);

        VerificationCode verificationCode = VerificationCode.builder()
                .user(user)
                .code(code)
                .type(type)
                .expiresAt(LocalDateTime.now().plusMinutes(CODE_EXPIRATION_MINUTES))
                .build();

        verificationCodeRepository.save(verificationCode);
    }
}
