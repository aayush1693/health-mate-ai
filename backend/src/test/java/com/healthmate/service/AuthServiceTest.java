package com.healthmate.service;

import com.healthmate.dto.AuthResponse;
import com.healthmate.dto.LoginRequest;
import com.healthmate.exception.AccountLockedException;
import com.healthmate.model.User;
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
}
