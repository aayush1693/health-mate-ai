"use client";

import { useEffect, useMemo, useState } from "react";
import { mlService } from "@/lib/api";
import toast from "react-hot-toast";
import { ThemeToggle } from "@/components/theme-toggle";
import { useRouter } from "next/navigation";
import {
  Plus,
  Trash2,
  Upload,
  Pencil,
  LogOut,
} from "lucide-react";

const ADMIN_USER = "admin";
const ADMIN_PASS = "admin";

const emptyForm = {
  name: "",
  hospital: "",
  mobile_number: "",
  city: "",
  province: "",
  clinic_part_time: "",
  degree: "",
  nmc_no: "",
  department: "",
  interests: "",
  hospital_address: "",
  hospital_phone: "",
  experience_years: "",
  rating: "",
  notes: "",
};

export default function AdminPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isAuthed, setIsAuthed] = useState(false);
  const [hasActiveUserSession, setHasActiveUserSession] = useState(false);
  const [entries, setEntries] = useState<any[]>([]);
  const [form, setForm] = useState<any>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);

  const canSubmit = useMemo(() => form.name && form.hospital && form.city && form.province, [form]);

  useEffect(() => {
    const checkUserSession = () => {
      const user = localStorage.getItem("user");
      const token = localStorage.getItem("token");
      setHasActiveUserSession(Boolean(user || token));
    };

    checkUserSession();
    window.addEventListener("storage", checkUserSession);
    window.addEventListener("focus", checkUserSession);

    return () => {
      window.removeEventListener("storage", checkUserSession);
      window.removeEventListener("focus", checkUserSession);
    };
  }, []);

  const login = async () => {
    try {
      const res = await mlService.adminLogin(username, password);
      if (res?.success) {
        setIsAuthed(true);
        toast.success("Admin login successful");
      } else {
        toast.error("Invalid admin credentials");
      }
    } catch {
      toast.error("Login failed");
    }
  };

  const loadEntries = async () => {
    try {
      const res = await mlService.adminListEntries(ADMIN_USER, ADMIN_PASS);
      if (res?.success) setEntries(res.entries || []);
    } catch {
      toast.error("Could not load entries");
    }
  };

  useEffect(() => {
    if (isAuthed) loadEntries();
  }, [isAuthed]);

  const normalizePayload = () => ({
    ...form,
    department: form.department
      .split(",")
      .map((item: string) => item.trim())
      .filter(Boolean),
    interests: form.interests
      .split(",")
      .map((item: string) => item.trim())
      .filter(Boolean),
    experience_years: Number(form.experience_years || 0),
    rating: Number(form.rating || 4.2),
  });

  const submitEntry = async () => {
    if (!canSubmit) {
      toast.error("Please fill required fields.");
      return;
    }

    try {
      if (editingId) {
        await mlService.adminUpdateEntry(ADMIN_USER, ADMIN_PASS, editingId, normalizePayload());
        toast.success("Entry updated");
      } else {
        await mlService.adminAddEntry(ADMIN_USER, ADMIN_PASS, normalizePayload());
        toast.success("Entry added");
      }
      setForm(emptyForm);
      setEditingId(null);
      loadEntries();
    } catch {
      toast.error("Save failed");
    }
  };

  const startEdit = (entry: any) => {
    setEditingId(entry.id);
    setForm({
      ...entry,
      department: (entry.department || []).join(", "),
      interests: (entry.interests || []).join(", "),
      experience_years: String(entry.experience_years || ""),
      rating: String(entry.rating || ""),
    });
  };

  const logoutAdmin = () => {
    setIsAuthed(false);
    setUsername("");
    setPassword("");
    setForm(emptyForm);
    setEditingId(null);
    toast.success("Logged out");
  };

  const removeEntry = async (id: string) => {
    try {
      await mlService.adminDeleteEntry(ADMIN_USER, ADMIN_PASS, id);
      toast.success("Entry removed");
      loadEntries();
    } catch {
      toast.error("Delete failed");
    }
  };

  const uploadJsonFile = async (file: File) => {
    try {
      const res = await mlService.adminUploadJson(ADMIN_USER, ADMIN_PASS, file);
      if (res?.success) {
        toast.success(`Dataset replaced (${res.count} entries)`);
        loadEntries();
      } else {
        toast.error(res?.error || "Upload failed");
      }
    } catch {
      toast.error("Upload failed");
    }
  };

  const logoutUserProfile = () => {
    localStorage.removeItem("user");
    localStorage.removeItem("token");
    setHasActiveUserSession(false);
    toast.success("User profile logged out. You can access admin now.");
  };

  if (hasActiveUserSession) {
    return (
      <main className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center px-4">
        <div className="w-full max-w-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-6 shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Admin Access Restricted</h1>
            <ThemeToggle />
          </div>
          <p className="text-slate-600 dark:text-slate-300 mt-2">
            A user profile is currently logged in. Please log out from the user profile first, then access the admin page.
          </p>
          <div className="mt-5 flex gap-3 flex-wrap">
            <button
              onClick={logoutUserProfile}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-primary-500 to-accent-500 text-white font-semibold"
            >
              Logout User Profile
            </button>
            <button
              onClick={() => router.push("/dashboard")}
              className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-slate-200"
            >
              Go to Dashboard
            </button>
          </div>
        </div>
      </main>
    );
  }

  if (!isAuthed) {
    return (
      <main className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center px-4">
        <div className="w-full max-w-md bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-6 shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Admin Login</h1>
            <ThemeToggle />
          </div>
          <p className="text-slate-600 dark:text-slate-300 mt-2">Use admin/admin to manage doctors dataset.</p>
          <div className="space-y-3 mt-5">
            <input
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              placeholder="Username"
              className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900"
            />
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Password"
              className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900"
            />
            <button
              onClick={login}
              className="w-full px-4 py-2 rounded-xl bg-gradient-to-r from-primary-500 to-accent-500 text-white font-semibold"
            >
              Login
            </button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      <div>
        <header className="sticky top-0 z-30 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-b border-slate-200 dark:border-slate-700">
          <div className="flex items-center justify-between px-4 lg:px-8 py-4">
            <div>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Recommendation Admin</h1>
              <p className="text-slate-600 dark:text-slate-300 text-sm">Add, edit, delete doctors and upload doctors.json</p>
            </div>
            <div className="flex items-center gap-2">
              <ThemeToggle />
              <button
                onClick={logoutAdmin}
                className="px-3 py-2 rounded-xl text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors flex items-center gap-2"
              >
                <LogOut size={18} />
                <span className="font-medium">Sign Out</span>
              </button>
            </div>
          </div>
        </header>

        <main className="p-4 lg:p-8 space-y-6">
          <section className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-6 shadow-lg">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div>
                <h2 className="text-xl font-bold text-slate-900 dark:text-white">Dataset Controls</h2>
                <p className="text-slate-600 dark:text-slate-300 mt-1">Bulk upload replaces the current doctors dataset.</p>
              </div>
              <label className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-slate-200 cursor-pointer flex items-center gap-2">
                <Upload size={16} /> Upload doctors.json
                <input
                  type="file"
                  accept="application/json"
                  className="hidden"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file) uploadJsonFile(file);
                  }}
                />
              </label>
            </div>
          </section>

          <section className="grid lg:grid-cols-2 gap-6">
            <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-6 shadow-lg">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-4">{editingId ? "Edit Entry" : "Add New Entry"}</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {Object.keys(emptyForm).map((key) => (
                  <input
                    key={key}
                    value={form[key] ?? ""}
                    onChange={(event) => setForm((prev: any) => ({ ...prev, [key]: event.target.value }))}
                    placeholder={key}
                    className="px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900"
                  />
                ))}
              </div>
              <div className="flex gap-2 mt-4">
                <button
                  onClick={submitEntry}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-primary-500 to-accent-500 text-white font-semibold flex items-center gap-2"
                >
                  <Plus size={16} /> {editingId ? "Update" : "Add"}
                </button>
                {editingId && (
                  <button
                    onClick={() => {
                      setEditingId(null);
                      setForm(emptyForm);
                    }}
                    className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-700"
                  >
                    Cancel Edit
                  </button>
                )}
              </div>
            </div>

            <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-6 shadow-lg">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-4">Entries ({entries.length})</h2>
              <div className="space-y-3 max-h-[540px] overflow-auto pr-1">
                {entries.map((entry) => (
                  <div key={entry.id} className="p-3 rounded-xl bg-slate-50 dark:bg-slate-700/30 border border-slate-200 dark:border-slate-700">
                    <p className="font-semibold text-slate-900 dark:text-white">{entry.name}</p>
                    <p className="text-sm text-slate-600 dark:text-slate-300">{entry.hospital} • {entry.city}, {entry.province}</p>
                    <p className="text-sm text-slate-600 dark:text-slate-300">{(entry.department || []).join(", ")}</p>
                    <div className="flex gap-2 mt-3">
                      <button
                        onClick={() => startEdit(entry)}
                        className="px-3 py-1 rounded-lg bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200 text-sm flex items-center gap-1"
                      >
                        <Pencil size={14} /> Edit
                      </button>
                      <button
                        onClick={() => removeEntry(entry.id)}
                        className="px-3 py-1 rounded-lg bg-red-500 text-white text-sm flex items-center gap-1"
                      >
                        <Trash2 size={14} /> Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}
