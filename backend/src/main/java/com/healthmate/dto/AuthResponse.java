package com.healthmate.dto;

import com.healthmate.model.User;
import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class AuthResponse {
    private String message;
    private String token;
    private UserDTO user;
    
    @Data
    @Builder
    public static class UserDTO {
        private Long id;
        private String firstName;
        private String lastName;
        private String email;
        private String phone;
        private String role;
        private Boolean emailVerified;
        private String profileImageUrl;
        
        public static UserDTO fromUser(User user) {
            return UserDTO.builder()
                    .id(user.getId())
                    .firstName(user.getFirstName())
                    .lastName(user.getLastName())
                    .email(user.getEmail())
                    .phone(user.getPhone())
                    .role(user.getRole().name())
                    .emailVerified(user.getEmailVerified())
                    .profileImageUrl(user.getProfileImageUrl())
                    .build();
        }
    }
}
