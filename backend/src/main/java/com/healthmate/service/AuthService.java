package com.healthmate.service;

import com.healthmate.dto.*;
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
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

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

    @Transactional
    public AuthResponse login(LoginRequest request) {
        authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(request.getEmail(), request.getPassword())
        );

        User user = userRepository.findByEmail(request.getEmail())
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

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

    @Transactional
    public ApiResponse verifyEmail(VerifyEmailRequest request) {
        User user = userRepository.findByEmail(request.getEmail())
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        VerificationCode verificationCode = verificationCodeRepository
                .findByUserAndCodeAndType(user, request.getCode(), VerificationCode.CodeType.EMAIL_VERIFICATION)
                .orElseThrow(() -> new BadRequestException("Invalid verification code"));

        if (!verificationCode.isValid()) {
            throw new BadRequestException("Verification code has expired or already been used");
        }

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

    @Transactional
    public ApiResponse verifyResetCode(VerifyEmailRequest request) {
        User user = userRepository.findByEmail(request.getEmail())
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        VerificationCode verificationCode = verificationCodeRepository
                .findByUserAndCodeAndType(user, request.getCode(), VerificationCode.CodeType.PASSWORD_RESET)
                .orElseThrow(() -> new BadRequestException("Invalid verification code"));

        if (!verificationCode.isValid()) {
            throw new BadRequestException("Verification code has expired or already been used");
        }

        return ApiResponse.success("Code verified successfully");
    }

    @Transactional
    public ApiResponse resetPassword(ResetPasswordRequest request) {
        User user = userRepository.findByEmail(request.getEmail())
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        VerificationCode verificationCode = verificationCodeRepository
                .findByUserAndCodeAndType(user, request.getCode(), VerificationCode.CodeType.PASSWORD_RESET)
                .orElseThrow(() -> new BadRequestException("Invalid verification code"));

        if (!verificationCode.isValid()) {
            throw new BadRequestException("Verification code has expired or already been used");
        }

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
