package com.healthmate.service;

import com.healthmate.model.User;
import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.mail.MailException;

@Service
@RequiredArgsConstructor
@Slf4j
public class EmailService {

    private final JavaMailSender mailSender;

    @Value("${spring.mail.username}")
    private String fromEmail;

    @Async
    public void sendVerificationEmail(User user, String code) {
        String subject = "Verify Your HealthMate AI Account";
        String htmlContent = getVerificationEmailTemplate(user.getFirstName(), code);
        sendEmail(user.getEmail(), subject, htmlContent);
    }

    @Async
    public void sendPasswordResetEmail(User user, String code) {
        String subject = "Reset Your HealthMate AI Password";
        String htmlContent = getPasswordResetEmailTemplate(user.getFirstName(), code);
        sendEmail(user.getEmail(), subject, htmlContent);
    }

    private void sendEmail(String to, String subject, String htmlContent) {
        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");
            
            helper.setFrom(fromEmail);
            helper.setTo(to);
            helper.setSubject(subject);
            helper.setText(htmlContent, true);
            
            mailSender.send(message);
            log.info("Email sent successfully to: {}", to);
        } catch (MessagingException e) {
            log.error("Failed to build email for: {}", to, e);
        } catch (MailException e) {
            log.error("Failed to send email to: {} (mail server error). Check SMTP credentials or provider settings.", to, e);
        }
    }

    private String getVerificationEmailTemplate(String name, String code) {
        return """
            <!DOCTYPE html>
            <html>
            <head>
                <style>
                    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; }
                    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                    .header { background: linear-gradient(135deg, #06b6d4, #d946ef); padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
                    .header h1 { color: white; margin: 0; font-size: 28px; }
                    .content { background: #f8fafc; padding: 30px; border-radius: 0 0 10px 10px; }
                    .code { background: linear-gradient(135deg, #06b6d4, #d946ef); color: white; font-size: 32px; font-weight: bold; padding: 15px 30px; border-radius: 10px; display: inline-block; letter-spacing: 5px; margin: 20px 0; }
                    .footer { text-align: center; margin-top: 20px; color: #64748b; font-size: 14px; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>🏥 HealthMate AI</h1>
                    </div>
                    <div class="content">
                        <h2>Hello, %s! 👋</h2>
                        <p>Thank you for signing up for HealthMate AI. To complete your registration, please use the verification code below:</p>
                        <div style="text-align: center;">
                            <div class="code">%s</div>
                        </div>
                        <p>This code will expire in 15 minutes.</p>
                        <p>If you didn't create an account with HealthMate AI, please ignore this email.</p>
                    </div>
                    <div class="footer">
                        <p>© 2024 HealthMate AI. All rights reserved.</p>
                    </div>
                </div>
            </body>
            </html>
            """.formatted(name, code);
    }

    private String getPasswordResetEmailTemplate(String name, String code) {
        return """
            <!DOCTYPE html>
            <html>
            <head>
                <style>
                    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; }
                    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                    .header { background: linear-gradient(135deg, #06b6d4, #d946ef); padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
                    .header h1 { color: white; margin: 0; font-size: 28px; }
                    .content { background: #f8fafc; padding: 30px; border-radius: 0 0 10px 10px; }
                    .code { background: linear-gradient(135deg, #06b6d4, #d946ef); color: white; font-size: 32px; font-weight: bold; padding: 15px 30px; border-radius: 10px; display: inline-block; letter-spacing: 5px; margin: 20px 0; }
                    .footer { text-align: center; margin-top: 20px; color: #64748b; font-size: 14px; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>🏥 HealthMate AI</h1>
                    </div>
                    <div class="content">
                        <h2>Hello, %s! 🔐</h2>
                        <p>We received a request to reset your password. Use the code below to reset it:</p>
                        <div style="text-align: center;">
                            <div class="code">%s</div>
                        </div>
                        <p>This code will expire in 15 minutes.</p>
                        <p>If you didn't request a password reset, please ignore this email or contact support if you have concerns.</p>
                    </div>
                    <div class="footer">
                        <p>© 2024 HealthMate AI. All rights reserved.</p>
                    </div>
                </div>
            </body>
            </html>
            """.formatted(name, code);
    }
}
