package com.healthmate.controller;

import com.healthmate.dto.ApiResponse;
import com.healthmate.security.CustomUserDetails;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/user")
@RequiredArgsConstructor
public class UserController {

    @GetMapping("/me")
    public ResponseEntity<ApiResponse> getCurrentUser(@AuthenticationPrincipal CustomUserDetails userDetails) {
        return ResponseEntity.ok(ApiResponse.builder()
                .success(true)
                .message("User retrieved successfully")
                .data(Map.of(
                        "id", userDetails.getId(),
                        "email", userDetails.getEmail(),
                        "firstName", userDetails.getUser().getFirstName(),
                        "lastName", userDetails.getUser().getLastName(),
                        "phone", userDetails.getUser().getPhone() != null ? userDetails.getUser().getPhone() : "",
                        "role", userDetails.getUser().getRole().name(),
                        "emailVerified", userDetails.getUser().getEmailVerified(),
                        "profileImageUrl", userDetails.getUser().getProfileImageUrl() != null ? userDetails.getUser().getProfileImageUrl() : ""
                ))
                .build());
    }
}
