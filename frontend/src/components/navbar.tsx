"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";
import {
  Menu,
  X,
  Heart,
  Home,
  LayoutDashboard,
  Stethoscope,
  Sparkles,
  MessageCircle,
  Building2,
  LogIn,
  UserPlus,
  LogOut,
  Video,
} from "lucide-react";

const navLinks = [
  { href: "/", label: "Home", icon: Home },
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/detect", label: "AI Diagnosis", icon: Stethoscope },
  { href: "/chat", label: "HealthMate Chat", icon: MessageCircle },
  { href: "/advice", label: "Health Advice", icon: Sparkles },
  { href: "/live", label: "Live Consultation", icon: Video },
  { href: "/recommendations", label: "Find Care", icon: Building2 },
];

export function Navbar() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [user, setUser] = useState<any | null>(null);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement | null>(null);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const stored = localStorage.getItem("user");
    if (stored) setUser(JSON.parse(stored));
    const handleStorage = () => {
      const s = localStorage.getItem("user");
      setUser(s ? JSON.parse(s) : null);
    };
    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("user");
    localStorage.removeItem("token");
    setUser(null);
    setIsUserMenuOpen(false);
    toast.success("Logged out");
    router.push("/");
  };

  const toggleUserMenu = () => setIsUserMenuOpen((v) => !v);
  const closeUserMenu = () => setIsUserMenuOpen(false);

  useEffect(() => {
    const onClickOutside = (event: MouseEvent) => {
      if (!userMenuRef.current) return;
      if (!userMenuRef.current.contains(event.target as Node)) {
        setIsUserMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  useEffect(() => {
    setIsMobileMenuOpen(false);
    setIsUserMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <>
      <motion.header
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.45, ease: "easeOut" }}
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
          isScrolled
            ? "bg-white/75 dark:bg-slate-950/80 backdrop-blur-2xl border-b border-slate-200/60 dark:border-slate-800/70 shadow-[0_10px_35px_-18px_rgba(15,23,42,0.55)]"
            : "bg-transparent"
        }`}
      >
        <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
          <div className="flex items-center justify-between gap-2 rounded-2xl border border-slate-200/70 dark:border-slate-800/80 bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl px-3 sm:px-4 h-16 shadow-[0_8px_25px_-16px_rgba(15,23,42,0.45)]">
            <Link href="/" className="flex items-center gap-3 group shrink-0">
              <div className="relative">
                <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-accent-500 rounded-2xl flex items-center justify-center shadow-lg shadow-primary-500/25 transition-all duration-300 group-hover:shadow-primary-500/40 group-hover:-translate-y-0.5">
                  <Heart className="w-5 h-5 text-white" />
                </div>
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-white dark:border-slate-900 animate-pulse"></div>
              </div>
              <div className="hidden sm:block leading-tight">
                <span className="text-lg font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary-600 to-accent-600 dark:from-primary-400 dark:to-accent-400">
                  HealthMate
                </span>
                <span className="text-lg font-light text-slate-600 dark:text-slate-300 ml-0.5">
                  AI
                </span>
              </div>
            </Link>

            <div className="hidden xl:flex items-center gap-1 rounded-2xl bg-slate-100/85 dark:bg-slate-800/80 p-1 border border-slate-200/80 dark:border-slate-700/80 overflow-hidden">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`relative px-2.5 2xl:px-3 py-2 rounded-xl transition-all duration-300 flex items-center gap-1.5 2xl:gap-2 font-medium text-xs 2xl:text-sm whitespace-nowrap ${
                    pathname === link.href
                      ? "bg-white dark:bg-slate-900 text-primary-600 dark:text-primary-400 shadow-sm"
                      : "text-slate-600 dark:text-slate-300 hover:text-primary-600 dark:hover:text-primary-400 hover:bg-primary-50/80 dark:hover:bg-primary-900/20"
                  }`}
                >
                  <link.icon size={16} />
                  {link.label}
                  {pathname === link.href && (
                    <motion.span
                      layoutId="nav-active-indicator"
                      className="absolute inset-x-2 -bottom-0.5 h-0.5 rounded-full bg-gradient-to-r from-primary-500 to-accent-500"
                    />
                  )}
                </Link>
              ))}
            </div>

            <div className="flex items-center gap-3">
              {user ? (
                <div ref={userMenuRef} className="hidden md:flex items-center gap-2 relative">
                  <button
                    onClick={toggleUserMenu}
                    className={`rounded-full p-0.5 bg-slate-100/85 dark:bg-slate-800/85 border border-slate-200/80 dark:border-slate-700/80 transition-all ${
                      isUserMenuOpen ? "ring-2 ring-primary-500/40" : ""
                    }`}
                    aria-label="Open profile menu"
                  >
                    <div className="w-8 h-8 rounded-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-sm font-semibold text-slate-700 dark:text-slate-200">
                      {(user.name ? user.name[0] : user.email[0]).toUpperCase()}
                    </div>
                  </button>

                  <AnimatePresence>
                    {isUserMenuOpen && (
                      <motion.div
                        initial={{ opacity: 0, y: 8, scale: 0.98 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 6, scale: 0.98 }}
                        transition={{ duration: 0.18 }}
                        className="absolute right-0 top-14 mt-2 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl py-2 w-48 z-50"
                      >
                      <div className="px-4 pb-2 mb-2 border-b border-slate-200 dark:border-slate-700">
                        <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{user.email}</p>
                      </div>
                      <Link href="/dashboard" className="block px-4 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800">
                        <LayoutDashboard size={14} className="inline mr-2" />
                        Dashboard
                      </Link>
                      <button onClick={handleLogout} className="w-full text-left px-4 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800">
                        <LogOut size={14} className="inline mr-2" />
                        Logout
                      </button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ) : (
                <div className="hidden md:flex items-center gap-2">
                  <Link
                    href="/login"
                    className="px-3 py-2 rounded-xl text-slate-600 dark:text-slate-300 hover:text-primary-600 dark:hover:text-primary-400 hover:bg-slate-100 dark:hover:bg-slate-800 font-medium transition-colors flex items-center gap-2 text-sm"
                  >
                    <LogIn size={16} />
                    Login
                  </Link>
                  <Link
                    href="/signup"
                    className="px-4 py-2 bg-gradient-to-r from-primary-500 to-accent-500 text-white font-semibold rounded-xl shadow-md shadow-primary-500/30 text-sm flex items-center gap-2 hover:opacity-95 transition-opacity whitespace-nowrap shrink-0"
                  >
                    <UserPlus size={16} />
                    Sign Up
                  </Link>
                </div>
              )} 

              {/* Mobile Menu Button */}
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="xl:hidden p-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                aria-label="Toggle navigation menu"
              >
                {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
              </button>
            </div>
          </div>
        </nav>

        <AnimatePresence>
          {isMobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
              className="xl:hidden"
            >
              <div className="mx-4 mt-1 mb-4 rounded-2xl bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border border-slate-200 dark:border-slate-700 p-4 shadow-xl">
                <div className="space-y-1">
                {navLinks.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 font-medium ${
                      pathname === link.href
                        ? "bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400"
                        : "text-slate-600 dark:text-slate-300 hover:text-primary-600 dark:hover:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-900/20"
                    }`}
                  >
                    <link.icon size={20} />
                    {link.label}
                  </Link>
                ))}
                </div>
                <div className="pt-4 border-t border-slate-200 dark:border-slate-700 flex gap-2">
                  {user ? (
                    <>
                      <Link
                        href="/dashboard"
                        onClick={() => {
                          setIsMobileMenuOpen(false);
                          closeUserMenu();
                        }}
                        className="flex-1 py-2.5 text-center rounded-xl border-2 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-medium hover:border-primary-500 transition-colors"
                      >
                        Dashboard
                      </Link>
                      <button
                        onClick={() => {
                          handleLogout();
                          setIsMobileMenuOpen(false);
                        }}
                        className="flex-1 py-2.5 text-center rounded-xl bg-gradient-to-r from-primary-500 to-accent-500 text-white font-medium"
                      >
                        Logout
                      </button>
                    </>
                  ) : (
                    <>
                      <Link
                        href="/login"
                        onClick={() => setIsMobileMenuOpen(false)}
                        className="flex-1 py-2.5 text-center rounded-xl border-2 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-medium hover:border-primary-500 transition-colors"
                      >
                        Login
                      </Link>
                      <Link
                        href="/signup"
                        onClick={() => setIsMobileMenuOpen(false)}
                        className="flex-1 py-2.5 text-center rounded-xl bg-gradient-to-r from-primary-500 to-accent-500 text-white font-medium whitespace-nowrap"
                      >
                        Sign Up
                      </Link>
                    </>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.header>
    </>
  );
}
