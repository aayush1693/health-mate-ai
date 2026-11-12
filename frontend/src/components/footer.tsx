"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Heart, Mail, Phone, MapPin, Github, Twitter, Linkedin } from "lucide-react";
import { ThemeToggle } from "./theme-toggle";

const footerLinks = {
  product: [
    { label: "AI Diagnosis", href: "/detect" },
    { label: "Health Chat", href: "/chat" },
    { label: "Find Doctors", href: "/recommendations" },
    { label: "Health Advice", href: "/advice" },
    { label: "Dashboard", href: "/dashboard" },
  ],
  support: [
    { label: "Live Consultation", href: "/live" },
    { label: "Login", href: "/login" },
    { label: "Sign Up", href: "/signup" },
    { label: "Admin", href: "/admin" },
  ],
};

export function Footer() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    const syncSession = () => {
      const hasUser = Boolean(localStorage.getItem("user"));
      const hasToken = Boolean(localStorage.getItem("token"));
      setIsLoggedIn(hasUser && hasToken);
    };

    syncSession();
    window.addEventListener("storage", syncSession);
    window.addEventListener("focus", syncSession);

    return () => {
      window.removeEventListener("storage", syncSession);
      window.removeEventListener("focus", syncSession);
    };
  }, []);

  const supportLinks = useMemo(() => {
    if (!isLoggedIn) return footerLinks.support;
    return footerLinks.support.filter((link) => link.href !== "/login" && link.href !== "/signup");
  }, [isLoggedIn]);

  return (
    <footer className="bg-slate-900 dark:bg-slate-950 text-white relative overflow-hidden border-t border-slate-800">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute inset-0" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }} />
      </div>

      {/* Main Footer */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 relative">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10">
          {/* Brand */}
          <div className="lg:col-span-2">
            <Link href="/" className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 bg-gradient-to-br from-primary-500 to-accent-500 rounded-2xl flex items-center justify-center shadow-lg shadow-primary-500/20">
                <Heart className="w-6 h-6 text-white" />
              </div>
              <div>
                <span className="text-2xl font-bold text-white">HealthMate</span>
                <span className="text-2xl font-light text-primary-400">AI</span>
              </div>
            </Link>
            <p className="text-slate-400 mb-6 leading-relaxed max-w-lg">
              Your intelligent medical companion powered by cutting-edge AI technology. 
              Making healthcare accessible, understandable, and personalized for everyone.
            </p>
            <div className="space-y-3">
              <div className="flex items-center gap-3 text-slate-400">
                <Mail size={18} className="text-primary-400" />
                <span>be2021se750@gces.edu.np</span>
              </div>
              <div className="flex items-center gap-3 text-slate-400">
                <Phone size={18} className="text-primary-400" />
                <span>+977 9867697963</span>
              </div>
              <div className="flex items-center gap-3 text-slate-400">
                <MapPin size={18} className="text-primary-400" />
                <span>Pokhara, Nepal 33700</span>
              </div>
            </div>
          </div>

          {/* Product Links */}
          <div>
            <h4 className="text-lg font-semibold mb-6">Product</h4>
            <ul className="space-y-3">
              {footerLinks.product.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-slate-400 hover:text-primary-400 transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Support Links */}
          <div>
            <h4 className="text-lg font-semibold mb-6">Support</h4>
            <ul className="space-y-3">
              {supportLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-slate-400 hover:text-primary-400 transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-12 pt-6 border-t border-slate-800 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-slate-500 text-sm">
            © {new Date().getFullYear()} HealthMate AI. All rights reserved.
          </p>
          <div className="flex items-center gap-4">
            <ThemeToggle />
            <a href="#" className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center text-slate-400 hover:bg-primary-500 hover:text-white transition-all">
              <Twitter size={18} />
            </a>
            <a href="#" className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center text-slate-400 hover:bg-primary-500 hover:text-white transition-all">
              <Github size={18} />
            </a>
            <a href="#" className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center text-slate-400 hover:bg-primary-500 hover:text-white transition-all">
              <Linkedin size={18} />
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
