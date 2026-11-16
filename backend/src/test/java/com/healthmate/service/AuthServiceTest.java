package com.healthmate.service;

import com.healthmate.dto.ApiResponse;
import com.healthmate.dto.AuthResponse;
import com.healthmate.dto.LoginRequest;
import com.healthmate.dto.ResetPasswordRequest;
import com.healthmate.dto.VerifyEmailRequest;
import com.healthmate.exception.AccountLockedException;
import com.healthmate.exception.BadRequestException;
import com.healthmate.model.User;
import com.healthmate.model.VerificationCode;
import com.healthmate.repository.UserRepository;
import com.healthmate.repository.VerificationCodeRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.time.LocalDateTime;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AuthServiceTest {

    private static final String EMAIL = "ada@example.com";

    @Mock
    private UserRepository userRepository;
    @Mock
    private VerificationCodeRepository verificationCodeRepository;
    @Mock
    private PasswordEncoder passwordEncoder;
    @Mock
    private JwtService jwtService;
    @Mock
    private AuthenticationManager authenticationManager;
    @Mock
    private EmailService emailService;

    @InjectMocks
    private AuthService authService;

    private User user(int failedAttempts, LocalDateTime lockedUntil) {
        return User.builder()
                .id(1L)
                .firstName("Ada")
                .lastName("Lovelace")
                .email(EMAIL)
                .password("hashed-password")
                .emailVerified(true)
                .enabled(true)
                .failedLoginAttempts(failedAttempts)
                .lockedUntil(lockedUntil)
                .build();
    }

    private LoginRequest loginRequest() {
        LoginRequest request = new LoginRequest();
        request.setEmail(EMAIL);
        request.setPassword("wrong-password");
        return request;
    }

    private VerificationCode verificationCode(
            User user, String code, VerificationCode.CodeType type, LocalDateTime expiresAt, int attempts) {
        return VerificationCode.builder()
                .id(1L)
                .user(user)
                .code(code)
                .type(type)
                .expiresAt(expiresAt)
                .used(false)
                .attempts(attempts)
                .build();
    }

    private VerifyEmailRequest verifyEmailRequest(String code) {
        VerifyEmailRequest request = new VerifyEmailRequest();
        request.setEmail(EMAIL);
        request.setCode(code);
        return request;
    }

    private ResetPasswordRequest resetPasswordRequest(String code, String newPassword) {
        ResetPasswordRequest request = new ResetPasswordRequest();
        request.setEmail(EMAIL);
        request.setCode(code);
        request.setNewPassword(newPassword);
        return request;
    }

    @Test
    void locksAccountAfterFiveFailedAttempts() {
        User user = user(4, null);
        when(userRepository.findByEmail(EMAIL)).thenReturn(Optional.of(user));
        when(authenticationManager.authenticate(any()))
                .thenThrow(new BadCredentialsException("Invalid email or password"));

        assertThatThrownBy(() -> authService.login(loginRequest()))
                .isInstanceOf(BadCredentialsException.class)
                .hasMessage("Invalid email or password");

        assertThat(user.getFailedLoginAttempts()).isEqualTo(5);
        assertThat(user.getLockedUntil()).isAfter(LocalDateTime.now());
        verify(userRepository).save(user);
    }

    @Test
    void lockLastsFifteenMinutes() {
        User user = user(4, null);
        when(userRepository.findByEmail(EMAIL)).thenReturn(Optional.of(user));
        when(authenticationManager.authenticate(any()))
                .thenThrow(new BadCredentialsException("Invalid email or password"));

        LocalDateTime before = LocalDateTime.now();
        assertThatThrownBy(() -> authService.login(loginRequest()))
                .isInstanceOf(BadCredentialsException.class);

        assertThat(user.getLockedUntil())
                .isAfter(before.plusMinutes(14))
                .isBefore(before.plusMinutes(16));
    }

    @Test
    void rejectsLoginWhileAccountIsLocked() {
        User user = user(5, LocalDateTime.now().plusMinutes(10));
        when(userRepository.findByEmail(EMAIL)).thenReturn(Optional.of(user));

        assertThatThrownBy(() -> authService.login(loginRequest()))
                .isInstanceOf(AccountLockedException.class);

        assertThat(user.getFailedLoginAttempts()).isEqualTo(5);
        verifyNoInteractions(authenticationManager);
    }

    @Test
    void successfulLoginResetsFailureState() {
        User user = user(3, LocalDateTime.now().minusMinutes(1));
        when(userRepository.findByEmail(EMAIL)).thenReturn(Optional.of(user));
        when(authenticationManager.authenticate(any()))
                .thenReturn(new UsernamePasswordAuthenticationToken(EMAIL, "password"));
        when(jwtService.generateToken(any())).thenReturn("jwt-token");

        AuthResponse response = authService.login(loginRequest());

        assertThat(response.getToken()).isEqualTo("jwt-token");
        assertThat(user.getFailedLoginAttempts()).isZero();
        assertThat(user.getLockedUntil()).isNull();
    }

    @Test
    void verifiesEmailWithCorrectCode() {
        User user = user(0, null);
        user.setEmailVerified(false);
        VerificationCode code = verificationCode(
                user, "123456", VerificationCode.CodeType.EMAIL_VERIFICATION,
                LocalDateTime.now().plusMinutes(10), 0);
        when(userRepository.findByEmail(EMAIL)).thenReturn(Optional.of(user));
        when(verificationCodeRepository.findFirstByUserAndTypeAndUsedFalseOrderByCreatedAtDesc(
                user, VerificationCode.CodeType.EMAIL_VERIFICATION)).thenReturn(Optional.of(code));

        ApiResponse response = authService.verifyEmail(verifyEmailRequest("123456"));

        assertThat(response.isSuccess()).isTrue();
        assertThat(user.getEmailVerified()).isTrue();
        assertThat(code.getUsed()).isTrue();
        assertThat(code.getAttempts()).isZero();
        verify(userRepository).save(user);
        verify(verificationCodeRepository).save(code);
    }

    @Test
    void incrementsAttemptsForWrongCode() {
        User user = user(0, null);
        VerificationCode code = verificationCode(
                user, "123456", VerificationCode.CodeType.EMAIL_VERIFICATION,
                LocalDateTime.now().plusMinutes(10), 0);
        when(userRepository.findByEmail(EMAIL)).thenReturn(Optional.of(user));
        when(verificationCodeRepository.findFirstByUserAndTypeAndUsedFalseOrderByCreatedAtDesc(
                user, VerificationCode.CodeType.EMAIL_VERIFICATION)).thenReturn(Optional.of(code));

        assertThatThrownBy(() -> authService.verifyEmail(verifyEmailRequest("654321")))
                .isInstanceOf(BadRequestException.class)
                .hasMessage("Invalid verification code");

        assertThat(code.getAttempts()).isEqualTo(1);
        assertThat(code.getUsed()).isFalse();
        verify(verificationCodeRepository).save(code);
        verify(userRepository, never()).save(any());
    }

    @Test
    void invalidatesCodeAfterFifthFailedAttempt() {
        User user = user(0, null);
        VerificationCode code = verificationCode(
                user, "123456", VerificationCode.CodeType.EMAIL_VERIFICATION,
                LocalDateTime.now().plusMinutes(10), 4);
        when(userRepository.findByEmail(EMAIL)).thenReturn(Optional.of(user));
        when(verificationCodeRepository.findFirstByUserAndTypeAndUsedFalseOrderByCreatedAtDesc(
                user, VerificationCode.CodeType.EMAIL_VERIFICATION)).thenReturn(Optional.of(code));

        assertThatThrownBy(() -> authService.verifyEmail(verifyEmailRequest("654321")))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("request a new verification code");

        assertThat(code.getAttempts()).isEqualTo(5);
        assertThat(code.getUsed()).isTrue();
        verify(verificationCodeRepository).save(code);
        verify(userRepository, never()).save(any());
    }

    @Test
    void rejectsExpiredCode() {
        User user = user(0, null);
        VerificationCode code = verificationCode(
                user, "123456", VerificationCode.CodeType.EMAIL_VERIFICATION,
                LocalDateTime.now().minusMinutes(1), 0);
        when(userRepository.findByEmail(EMAIL)).thenReturn(Optional.of(user));
        when(verificationCodeRepository.findFirstByUserAndTypeAndUsedFalseOrderByCreatedAtDesc(
                user, VerificationCode.CodeType.EMAIL_VERIFICATION)).thenReturn(Optional.of(code));

        assertThatThrownBy(() -> authService.verifyEmail(verifyEmailRequest("123456")))
                .isInstanceOf(BadRequestException.class)
                .hasMessage("Verification code has expired or already been used");

        assertThat(code.getAttempts()).isZero();
        assertThat(code.getUsed()).isFalse();
        verify(verificationCodeRepository, never()).save(any());
        verify(userRepository, never()).save(any());
    }

    @Test
    void verifiesResetCodeWithoutConsumingIt() {
        User user = user(0, null);
        VerificationCode code = verificationCode(
                user, "123456", VerificationCode.CodeType.PASSWORD_RESET,
                LocalDateTime.now().plusMinutes(10), 0);
        when(userRepository.findByEmail(EMAIL)).thenReturn(Optional.of(user));
        when(verificationCodeRepository.findFirstByUserAndTypeAndUsedFalseOrderByCreatedAtDesc(
                user, VerificationCode.CodeType.PASSWORD_RESET)).thenReturn(Optional.of(code));

        ApiResponse response = authService.verifyResetCode(verifyEmailRequest("123456"));

        assertThat(response.isSuccess()).isTrue();
        assertThat(code.getUsed()).isFalse();
        verify(verificationCodeRepository, never()).save(any());
    }

    @Test
    void resetsPasswordWithCorrectCodeAndConsumesIt() {
        User user = user(0, null);
        VerificationCode code = verificationCode(
                user, "123456", VerificationCode.CodeType.PASSWORD_RESET,
                LocalDateTime.now().plusMinutes(10), 0);
        when(userRepository.findByEmail(EMAIL)).thenReturn(Optional.of(user));
        when(verificationCodeRepository.findFirstByUserAndTypeAndUsedFalseOrderByCreatedAtDesc(
                user, VerificationCode.CodeType.PASSWORD_RESET)).thenReturn(Optional.of(code));
        when(passwordEncoder.encode("new-password")).thenReturn("encoded-password");

        ApiResponse response = authService.resetPassword(resetPasswordRequest("123456", "new-password"));

        assertThat(response.isSuccess()).isTrue();
        assertThat(user.getPassword()).isEqualTo("encoded-password");
        assertThat(code.getUsed()).isTrue();
        verify(userRepository).save(user);
        verify(verificationCodeRepository).save(code);
    }

    @Test
    void incrementsAttemptsForWrongResetCode() {
        User user = user(0, null);
        VerificationCode code = verificationCode(
                user, "123456", VerificationCode.CodeType.PASSWORD_RESET,
                LocalDateTime.now().plusMinutes(10), 0);
        when(userRepository.findByEmail(EMAIL)).thenReturn(Optional.of(user));
        when(verificationCodeRepository.findFirstByUserAndTypeAndUsedFalseOrderByCreatedAtDesc(
                user, VerificationCode.CodeType.PASSWORD_RESET)).thenReturn(Optional.of(code));

        assertThatThrownBy(() -> authService.resetPassword(
                resetPasswordRequest("654321", "new-password")))
                .isInstanceOf(BadRequestException.class)
                .hasMessage("Invalid verification code");

        assertThat(code.getAttempts()).isEqualTo(1);
        assertThat(code.getUsed()).isFalse();
        verify(verificationCodeRepository).save(code);
        verify(passwordEncoder, never()).encode(any());
        verify(userRepository, never()).save(any());
    }
}
