"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  Heart,
  Activity,
  Brain,
  Stethoscope,
  MessageCircle,
  Building2,
  FileText,
  Calendar,
  Bell,
  Settings,
  LogOut,
  TrendingUp,
  Users,
  ChevronRight,
  BarChart3,
  Clock,
  CheckCircle2,
  AlertCircle,
  Search,
  Menu,
  X,
  LayoutDashboard,
  Video,
  Sparkles,
} from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { useAuthGuard } from "@/lib/use-auth-guard";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
} from "recharts";

const healthData = [
  { date: "Mon", heartRate: 72, bloodPressure: 120, steps: 8500 },
  { date: "Tue", heartRate: 75, bloodPressure: 118, steps: 10200 },
  { date: "Wed", heartRate: 70, bloodPressure: 122, steps: 7800 },
  { date: "Thu", heartRate: 73, bloodPressure: 119, steps: 9100 },
  { date: "Fri", heartRate: 71, bloodPressure: 121, steps: 11000 },
  { date: "Sat", heartRate: 68, bloodPressure: 117, steps: 6500 },
  { date: "Sun", heartRate: 74, bloodPressure: 120, steps: 8900 },
];

const analysisHistory = [
  { type: "Pneumonia", result: "Normal", date: "2024-01-15", confidence: 98.5 },
  { type: "Lung Cancer", result: "Normal", date: "2024-01-10", confidence: 97.2 },
  { type: "Alzheimer's", result: "Normal", date: "2024-01-05", confidence: 96.8 },
];

const activityData = [
  { name: "Scans", value: 12, color: "#06b6d4" },
  { name: "Chats", value: 24, color: "#8b5cf6" },
  { name: "Recommendations", value: 8, color: "#10b981" },
];

const quickActions = [
  {
    title: "AI Disease Detection",
    description: "Upload scans for instant analysis",
    icon: Brain,
    href: "/detect",
    color: "from-blue-500 to-cyan-500",
  },
  {
    title: "Chat with HealthMate",
    description: "Get personalized health advice",
    icon: MessageCircle,
    href: "/chat",
    color: "from-purple-500 to-pink-500",
  },
  {
    title: "Find Doctors",
    description: "Discover healthcare providers",
    icon: Building2,
    href: "/recommendations",
    color: "from-orange-500 to-red-500",
  },
  {
    title: "Health Reports",
    description: "View your medical history",
    icon: FileText,
    href: "/reports",
    color: "from-green-500 to-emerald-500",
  },
];

const upcomingAppointments = [
  { doctor: "Dr. Sarah Johnson", specialty: "Cardiologist", date: "Jan 20, 2024", time: "10:00 AM" },
  { doctor: "Dr. Michael Chen", specialty: "Neurologist", date: "Jan 25, 2024", time: "2:30 PM" },
];

const notifications = [
  { message: "Your scan results are ready", time: "2 hours ago", read: false },
  { message: "Appointment reminder for tomorrow", time: "5 hours ago", read: false },
  { message: "New health tip available", time: "1 day ago", read: true },
];

const statCards = [
  {
    label: "Heart Rate",
    value: "72 BPM",
    icon: Heart,
    change: "+2%",
    iconBgClass: "bg-red-100 dark:bg-red-900/30",
    iconTextClass: "text-red-500",
  },
  {
    label: "Blood Pressure",
    value: "120/80",
    icon: Activity,
    change: "-3%",
    iconBgClass: "bg-blue-100 dark:bg-blue-900/30",
    iconTextClass: "text-blue-500",
  },
  {
    label: "Total Scans",
    value: "12",
    icon: Brain,
    change: "+4",
    iconBgClass: "bg-purple-100 dark:bg-purple-900/30",
    iconTextClass: "text-purple-500",
  },
  {
    label: "Health Score",
    value: "92/100",
    icon: TrendingUp,
    change: "+5",
    iconBgClass: "bg-green-100 dark:bg-green-900/30",
    iconTextClass: "text-green-500",
  },
];

export default function DashboardPage() {
  const isAuthorized = useAuthGuard();
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<any>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);

  useEffect(() => {
    const userData = localStorage.getItem("user");
    if (userData) {
      setUser(JSON.parse(userData));
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    router.push("/login");
  };

  const sidebarLinks = [
    { label: "Dashboard", icon: LayoutDashboard, href: "/dashboard" },
    { label: "AI Detection", icon: Brain, href: "/detect" },
    { label: "Health Chat", icon: MessageCircle, href: "/chat" },
    { label: "Health Advice", icon: Sparkles, href: "/advice" },
    { label: "Live Consultation", icon: Video, href: "/live" },
    { label: "Find Care", icon: Building2, href: "/recommendations" },
    { label: "Admin", icon: Settings, href: "/admin" },
  ];

  if (!isAuthorized) return null;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 z-50 h-full w-72 bg-white dark:bg-slate-800 border-r border-slate-200 dark:border-slate-700 transform transition-transform duration-300 lg:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="p-6 border-b border-slate-200 dark:border-slate-700">
            <Link href="/" className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-accent-500 rounded-xl flex items-center justify-center">
                <Heart className="w-5 h-5 text-white" />
              </div>
              <div>
                <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary-600 to-accent-600 dark:from-primary-400 dark:to-accent-400">
                  HealthMate
                </span>
                <span className="text-xl font-light text-slate-600 dark:text-slate-300">
                  AI
                </span>
              </div>
            </Link>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
            {sidebarLinks.map((link, index) => (
              (() => {
                const isActive = pathname === link.href;
                return (
              <Link
                key={index}
                href={link.href}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 ${
                  isActive
                    ? "bg-primary-50 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400"
                    : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
                }`}
              >
                <link.icon size={20} />
                <span className="font-medium">{link.label}</span>
                {isActive && (
                  <div className="ml-auto w-2 h-2 rounded-full bg-primary-500" />
                )}
              </Link>
                );
              })()
            ))}
          </nav>

          {/* User Section */}
          <div className="p-4 border-t border-slate-200 dark:border-slate-700">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center text-white font-bold">
                {user?.firstName?.[0] || "U"}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-slate-800 dark:text-white truncate">
                  {user?.firstName} {user?.lastName}
                </p>
                <p className="text-sm text-slate-500 dark:text-slate-400 truncate">
                  {user?.email || "user@example.com"}
                </p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
            >
              <LogOut size={20} />
              <span className="font-medium">Sign Out</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="lg:pl-72">
        {/* Header */}
        <header className="sticky top-0 z-30 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-b border-slate-200 dark:border-slate-700">
          <div className="flex items-center justify-between px-4 lg:px-8 py-4">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setSidebarOpen(true)}
                className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 lg:hidden"
              >
                <Menu size={20} />
              </button>
              <div className="hidden md:block">
                <h1 className="text-2xl font-bold text-slate-800 dark:text-white">
                  Welcome back, {user?.firstName || "User"}! 👋
                </h1>
                <p className="text-slate-500 dark:text-slate-400">
                  Here&apos;s your health overview for today
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {/* Search */}
              <div className="hidden lg:flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800">
                <Search size={18} className="text-slate-400" />
                <input
                  type="text"
                  placeholder="Search..."
                  className="w-48 bg-transparent outline-none text-slate-600 dark:text-slate-300 placeholder:text-slate-400"
                />
              </div>

              {/* Notifications */}
              <div className="relative">
                <button
                  onClick={() => setShowNotifications(!showNotifications)}
                  className="relative p-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                >
                  <Bell size={20} className="text-slate-600 dark:text-slate-300" />
                  <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
                </button>

                {showNotifications && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="absolute right-0 mt-2 w-80 bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 overflow-hidden"
                  >
                    <div className="p-4 border-b border-slate-200 dark:border-slate-700">
                      <h3 className="font-semibold text-slate-800 dark:text-white">
                        Notifications
                      </h3>
                    </div>
                    <div className="max-h-64 overflow-y-auto">
                      {notifications.map((notif, i) => (
                        <div
                          key={i}
                          className={`p-4 border-b border-slate-100 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50 cursor-pointer ${
                            !notif.read ? "bg-primary-50/50 dark:bg-primary-900/20" : ""
                          }`}
                        >
                          <p className="text-sm text-slate-800 dark:text-white">
                            {notif.message}
                          </p>
                          <p className="text-xs text-slate-500 mt-1">
                            {notif.time}
                          </p>
                        </div>
                      ))}
                    </div>
                    <div className="p-3">
                      <button className="w-full py-2 text-center text-sm font-medium text-primary-600 dark:text-primary-400 hover:underline">
                        View all notifications
                      </button>
                    </div>
                  </motion.div>
                )}
              </div>

              <ThemeToggle />
            </div>
          </div>
        </header>

        {/* Dashboard Content */}
        <main className="p-4 lg:p-8">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {statCards.map((stat, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-lg border border-slate-200 dark:border-slate-700"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${stat.iconBgClass}`}>
                    <stat.icon className={`w-6 h-6 ${stat.iconTextClass}`} />
                  </div>
                  <span className={`text-sm font-medium ${stat.change.startsWith("+") ? "text-green-500" : "text-red-500"}`}>
                    {stat.change}
                  </span>
                </div>
                <h3 className="text-2xl font-bold text-slate-800 dark:text-white mb-1">
                  {stat.value}
                </h3>
                <p className="text-slate-500 dark:text-slate-400">{stat.label}</p>
              </motion.div>
            ))}
          </div>

          {/* Quick Actions */}
          <div className="mb-8">
            <h2 className="text-xl font-bold text-slate-800 dark:text-white mb-4">
              Quick Actions
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {quickActions.map((action, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 + index * 0.1 }}
                >
                  <Link
                    href={action.href}
                    className="group block p-6 bg-white dark:bg-slate-800 rounded-2xl shadow-lg border border-slate-200 dark:border-slate-700 hover:shadow-xl transition-all duration-300 card-hover"
                  >
                    <div
                      className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${action.color} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300`}
                    >
                      <action.icon className="w-7 h-7 text-white" />
                    </div>
                    <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-1">
                      {action.title}
                    </h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                      {action.description}
                    </p>
                    <div className="mt-4 flex items-center text-primary-600 dark:text-primary-400 font-medium group-hover:gap-2 transition-all">
                      <span>Get started</span>
                      <ChevronRight size={18} />
                    </div>
                  </Link>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Charts Section */}
          <div className="grid lg:grid-cols-3 gap-6 mb-8">
            {/* Heart Rate Chart */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="lg:col-span-2 bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-lg border border-slate-200 dark:border-slate-700"
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-bold text-slate-800 dark:text-white">
                  Weekly Health Trends
                </h3>
                <select className="px-3 py-2 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 outline-none">
                  <option>This Week</option>
                  <option>Last Week</option>
                  <option>This Month</option>
                </select>
              </div>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={healthData}>
                    <defs>
                      <linearGradient id="colorHeart" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="date" stroke="#94a3b8" />
                    <YAxis stroke="#94a3b8" />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#1e293b",
                        border: "none",
                        borderRadius: "12px",
                        color: "#fff",
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="heartRate"
                      stroke="#06b6d4"
                      strokeWidth={3}
                      fill="url(#colorHeart)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </motion.div>

            {/* Activity Distribution */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-lg border border-slate-200 dark:border-slate-700"
            >
              <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-6">
                Activity Distribution
              </h3>
              <div className="h-52">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={activityData}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      dataKey="value"
                    >
                      {activityData.map((entry, index) => (
                        <Cell key={index} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex justify-center gap-4 mt-4">
                {activityData.map((item, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: item.color }}
                    />
                    <span className="text-sm text-slate-600 dark:text-slate-300">
                      {item.name}
                    </span>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>

          {/* Recent Analysis & Appointments */}
          <div className="grid lg:grid-cols-2 gap-6">
            {/* Recent Analysis */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-lg border border-slate-200 dark:border-slate-700"
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-bold text-slate-800 dark:text-white">
                  Recent AI Analysis
                </h3>
                <Link
                  href="/reports"
                  className="text-primary-600 dark:text-primary-400 text-sm font-medium hover:underline"
                >
                  View all
                </Link>
              </div>
              <div className="space-y-4">
                {analysisHistory.map((analysis, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-4 rounded-xl bg-slate-50 dark:bg-slate-700/50"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center">
                        <Stethoscope className="w-5 h-5 text-primary-600 dark:text-primary-400" />
                      </div>
                      <div>
                        <p className="font-medium text-slate-800 dark:text-white">
                          {analysis.type} Scan
                        </p>
                        <p className="text-sm text-slate-500 dark:text-slate-400">
                          {analysis.date}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 text-sm font-medium">
                        <CheckCircle2 size={14} />
                        {analysis.result}
                      </span>
                      <p className="text-xs text-slate-500 mt-1">
                        {analysis.confidence}% confidence
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>

            {/* Upcoming Appointments */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7 }}
              className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-lg border border-slate-200 dark:border-slate-700"
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-bold text-slate-800 dark:text-white">
                  Upcoming Appointments
                </h3>
                <Link
                  href="/appointments"
                  className="text-primary-600 dark:text-primary-400 text-sm font-medium hover:underline"
                >
                  View all
                </Link>
              </div>
              <div className="space-y-4">
                {upcomingAppointments.map((appointment, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-4 rounded-xl bg-slate-50 dark:bg-slate-700/50"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-accent-100 dark:bg-accent-900/30 flex items-center justify-center">
                        <Calendar className="w-5 h-5 text-accent-600 dark:text-accent-400" />
                      </div>
                      <div>
                        <p className="font-medium text-slate-800 dark:text-white">
                          {appointment.doctor}
                        </p>
                        <p className="text-sm text-slate-500 dark:text-slate-400">
                          {appointment.specialty}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-medium text-slate-800 dark:text-white">
                        {appointment.date}
                      </p>
                      <p className="text-sm text-slate-500 dark:text-slate-400">
                        {appointment.time}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
              <button className="w-full mt-4 py-3 rounded-xl border-2 border-dashed border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:border-primary-500 hover:text-primary-600 dark:hover:text-primary-400 transition-all">
                + Schedule New Appointment
              </button>
            </motion.div>
          </div>
        </main>
      </div>
    </div>
  );
}
