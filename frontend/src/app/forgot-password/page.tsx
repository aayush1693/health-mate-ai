"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Mail, Lock, Eye, EyeOff, Heart, ArrowRight, Loader2, KeyRound, CheckCircle } from "lucide-react";
import toast from "react-hot-toast";
import { ThemeToggle } from "@/components/theme-toggle";

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [step, setStep] = useState<"email" | "verify" | "reset">("email");
  const [email, setEmail] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [passwords, setPasswords] = useState({
    password: "",
    confirmPassword: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const response = await fetch("http://localhost:8080/api/auth/forgot-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (response.ok) {
        toast.success("Verification code sent to your email!");
        setStep("verify");
      } else {
        toast.error(data.message || "Failed to send code");
      }
    } catch (error) {
      toast.error("Connection error. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const response = await fetch("http://localhost:8080/api/auth/verify-reset-code", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, code: verificationCode }),
      });

      const data = await response.json();

      if (response.ok) {
        toast.success("Code verified!");
        setStep("reset");
      } else {
        toast.error(data.message || "Invalid code");
      }
    } catch (error) {
      toast.error("Connection error. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (passwords.password !== passwords.confirmPassword) {
      toast.error("Passwords don't match");
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch("http://localhost:8080/api/auth/reset-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          code: verificationCode,
          newPassword: passwords.password,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        toast.success("Password reset successfully!");
        router.push("/login");
      } else {
        toast.error(data.message || "Failed to reset password");
      }
    } catch (error) {
      toast.error("Connection error. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 via-white to-accent-50 dark:from-slate-900 dark:via-slate-900 dark:to-slate-800 px-4">
      <div className="absolute top-6 right-6">
        <ThemeToggle />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        <div className="glass-card rounded-3xl p-8 shadow-2xl">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-3 mb-8 justify-center">
            <div className="w-12 h-12 bg-gradient-to-br from-primary-500 to-accent-500 rounded-2xl flex items-center justify-center shadow-lg">
              <Heart className="w-6 h-6 text-white" />
            </div>
            <div>
              <span className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary-600 to-accent-600 dark:from-primary-400 dark:to-accent-400">
                HealthMate
              </span>
              <span className="text-2xl font-light text-slate-600 dark:text-slate-300">
                AI
              </span>
            </div>
          </Link>

          {/* Progress Steps */}
          <div className="flex items-center justify-center gap-2 mb-8">
            {["email", "verify", "reset"].map((s, i) => (
              <div key={s} className="flex items-center">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-all ${
                    step === s
                      ? "bg-primary-500 text-white"
                      : ["email", "verify", "reset"].indexOf(step) > i
                      ? "bg-green-500 text-white"
                      : "bg-slate-200 dark:bg-slate-700 text-slate-500"
                  }`}
                >
                  {["email", "verify", "reset"].indexOf(step) > i ? (
                    <CheckCircle size={16} />
                  ) : (
                    i + 1
                  )}
                </div>
                {i < 2 && (
                  <div
                    className={`w-12 h-1 mx-1 rounded ${
                      ["email", "verify", "reset"].indexOf(step) > i
                        ? "bg-green-500"
                        : "bg-slate-200 dark:bg-slate-700"
                    }`}
                  />
                )}
              </div>
            ))}
          </div>

          {step === "email" && (
            <>
              <div className="text-center mb-8">
                <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center">
                  <KeyRound className="w-8 h-8 text-primary-600 dark:text-primary-400" />
                </div>
                <h2 className="text-2xl font-bold text-slate-800 dark:text-white mb-2">
                  Forgot Password?
                </h2>
                <p className="text-slate-600 dark:text-slate-400">
                  No worries! Enter your email and we&apos;ll send you a reset code.
                </p>
              </div>

              <form onSubmit={handleSendCode} className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="input-field pl-12"
                      placeholder="you@example.com"
                      required
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full btn-primary flex items-center justify-center gap-2"
                >
                  {isLoading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      Send Reset Code
                      <ArrowRight size={20} />
                    </>
                  )}
                </button>
              </form>
            </>
          )}

          {step === "verify" && (
            <>
              <div className="text-center mb-8">
                <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-accent-100 dark:bg-accent-900/30 flex items-center justify-center">
                  <Mail className="w-8 h-8 text-accent-600 dark:text-accent-400" />
                </div>
                <h2 className="text-2xl font-bold text-slate-800 dark:text-white mb-2">
                  Check Your Email
                </h2>
                <p className="text-slate-600 dark:text-slate-400">
                  We&apos;ve sent a verification code to{" "}
                  <span className="font-medium text-primary-600 dark:text-primary-400">
                    {email}
                  </span>
                </p>
              </div>

              <form onSubmit={handleVerifyCode} className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Verification Code
                  </label>
                  <input
                    type="text"
                    value={verificationCode}
                    onChange={(e) => setVerificationCode(e.target.value)}
                    className="input-field text-center text-2xl tracking-widest"
                    placeholder="000000"
                    maxLength={6}
                    required
                  />
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full btn-primary flex items-center justify-center gap-2"
                >
                  {isLoading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      Verify Code
                      <ArrowRight size={20} />
                    </>
                  )}
                </button>
              </form>

              <button
                onClick={() => setStep("email")}
                className="mt-4 w-full text-center text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
              >
                ← Back to email
              </button>
            </>
          )}

          {step === "reset" && (
            <>
              <div className="text-center mb-8">
                <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                  <Lock className="w-8 h-8 text-green-600 dark:text-green-400" />
                </div>
                <h2 className="text-2xl font-bold text-slate-800 dark:text-white mb-2">
                  Reset Password
                </h2>
                <p className="text-slate-600 dark:text-slate-400">
                  Create a new password for your account
                </p>
              </div>

              <form onSubmit={handleResetPassword} className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    New Password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <input
                      type={showPassword ? "text" : "password"}
                      value={passwords.password}
                      onChange={(e) =>
                        setPasswords({ ...passwords, password: e.target.value })
                      }
                      className="input-field pl-12 pr-12"
                      placeholder="••••••••"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                    >
                      {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Confirm New Password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <input
                      type={showPassword ? "text" : "password"}
                      value={passwords.confirmPassword}
                      onChange={(e) =>
                        setPasswords({
                          ...passwords,
                          confirmPassword: e.target.value,
                        })
                      }
                      className="input-field pl-12"
                      placeholder="••••••••"
                      required
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full btn-primary flex items-center justify-center gap-2"
                >
                  {isLoading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      Reset Password
                      <CheckCircle size={20} />
                    </>
                  )}
                </button>
              </form>
            </>
          )}

          <p className="mt-8 text-center text-slate-600 dark:text-slate-400">
            Remember your password?{" "}
            <Link
              href="/login"
              className="font-medium text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300"
            >
              Sign in
            </Link>
          </p>
        </div>
      </motion.div>
    </div>
  );
}
