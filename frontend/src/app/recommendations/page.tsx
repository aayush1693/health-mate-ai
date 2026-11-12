"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { mlService } from "@/lib/api";
import { useAuthGuard } from "@/lib/use-auth-guard";
import toast from "react-hot-toast";
import { Building2, Search, Send, Stethoscope } from "lucide-react";
import ReactMarkdown from "react-markdown";

type CatalogResponse = {
  doctors: any[];
  specialties: string[];
};

export default function RecommendationsPage() {
  const isAuthorized = useAuthGuard();
  const [query, setQuery] = useState("");
  const [city, setCity] = useState("");
  const [province, setProvince] = useState("");
  const [department, setDepartment] = useState("");
  const [catalog, setCatalog] = useState<CatalogResponse>({ doctors: [], specialties: [] });
  const [loading, setLoading] = useState(false);

  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [aiText, setAiText] = useState("");
  const [aiDoctors, setAiDoctors] = useState<any[]>([]);
  const [aiHospitals, setAiHospitals] = useState<any[]>([]);

  const fetchCatalog = useCallback(async () => {
    setLoading(true);
    try {
      const data = await mlService.getRecommendationCatalog({
        query: query || undefined,
        city: city || undefined,
        province: province || undefined,
        department: department || undefined,
        limit: 120,
      });
      if (data?.success) {
        setCatalog({ doctors: data.doctors || [], specialties: data.specialties || [] });
      }
    } catch {
      toast.error("Unable to load recommendations right now.");
    } finally {
      setLoading(false);
    }
  }, [query, city, province, department]);

  useEffect(() => {
    fetchCatalog();
  }, [fetchCatalog]);

  const handleAiAsk = async () => {
    if (!chatInput.trim()) return;
    setChatLoading(true);
    try {
      const data = await mlService.getAiDoctorHospitalAdvice({
        message: chatInput.trim(),
        city: city || undefined,
        limit: 6,
      });
      if (data?.success) {
        setAiText(data.response || "");
        setAiDoctors(data.doctors || []);
        setAiHospitals(data.hospitals || []);
      } else {
        toast.error(data?.error || "Failed to get AI recommendation.");
      }
    } catch {
      toast.error("AI recommendation unavailable right now.");
    } finally {
      setChatLoading(false);
    }
  };

  const uniqueHospitals = useMemo(() => {
    const map = new Map<string, { hospital: string; city: string; province: string; phone: string; departments: Set<string> }>();
    for (const doc of catalog.doctors) {
      const key = `${doc.hospital}-${doc.city}-${doc.province}`;
      if (!map.has(key)) {
        map.set(key, {
          hospital: doc.hospital,
          city: doc.city,
          province: doc.province,
          phone: doc.hospital_phone,
          departments: new Set(doc.department || []),
        });
      } else {
        (doc.department || []).forEach((dep: string) => map.get(key)?.departments.add(dep));
      }
    }
    return Array.from(map.values()).map((item) => ({
      ...item,
      departments: Array.from(item.departments),
    }));
  }, [catalog.doctors]);

  if (!isAuthorized) return null;

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900">
      <Navbar />
      <div className="pt-24 pb-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
          <section className="bg-white/90 dark:bg-slate-900/70 backdrop-blur-sm border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-xl shadow-slate-200/40 dark:shadow-slate-950/40">
            <h1 className="text-3xl lg:text-4xl font-bold text-slate-900 dark:text-white">Doctors & Hospitals</h1>
            <p className="text-slate-600 dark:text-slate-300 mt-2">
              Search and browse healthcare providers, then ask Gemini for personalized recommendations.
            </p>

            <div className="grid md:grid-cols-5 gap-3 mt-5">
              <div className="md:col-span-2 relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search doctor, hospital, interest"
                  className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-primary-500/30"
                />
              </div>
              <input
                value={city}
                onChange={(event) => setCity(event.target.value)}
                placeholder="City"
                className="px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-primary-500/30"
              />
              <input
                value={province}
                onChange={(event) => setProvince(event.target.value)}
                placeholder="Province"
                className="px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-primary-500/30"
              />
              <button
                onClick={fetchCatalog}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-primary-500 to-accent-500 text-white font-semibold"
              >
                {loading ? "Loading..." : "Apply"}
              </button>
            </div>

            <div className="mt-3 grid md:grid-cols-1 gap-3">
              <select
                value={department}
                onChange={(event) => setDepartment(event.target.value)}
                className="px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-primary-500/30"
              >
                <option value="">All departments</option>
                {catalog.specialties.map((spec) => (
                  <option key={spec} value={spec}>{spec}</option>
                ))}
              </select>
            </div>
          </section>

          <section className="grid lg:grid-cols-2 gap-6">
            <div className="bg-white/90 dark:bg-slate-900/70 backdrop-blur-sm border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-lg">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2 mb-4">
                <Stethoscope size={18} /> Doctors ({catalog.doctors.length})
              </h2>
              <div className="space-y-3 max-h-[520px] overflow-auto pr-1">
                {catalog.doctors.map((doc) => (
                  <div key={doc.id} className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-800">
                    <p className="font-semibold text-slate-900 dark:text-white">{doc.name}</p>
                    <p className="text-sm text-slate-600 dark:text-slate-300">{doc.hospital} • {doc.city}, {doc.province}</p>
                    <p className="text-sm text-slate-600 dark:text-slate-300">{(doc.department || []).join(", ")}</p>
                    <p className="text-sm text-slate-600 dark:text-slate-300">Interests: {(doc.interests || []).join(", ")}</p>
                    <p className="text-sm text-slate-600 dark:text-slate-300">{doc.degree} • NMC: {doc.nmc_no}</p>
                    <p className="text-sm text-slate-600 dark:text-slate-300">Contact: {doc.mobile_number}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-6">
              <div className="bg-white/90 dark:bg-slate-900/70 backdrop-blur-sm border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-lg">
                <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2 mb-4">
                  <Building2 size={18} /> Hospitals ({uniqueHospitals.length})
                </h2>
                <div className="space-y-3 max-h-[260px] overflow-auto pr-1">
                  {uniqueHospitals.map((hospital) => (
                    <div key={`${hospital.hospital}-${hospital.city}`} className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-800">
                      <p className="font-semibold text-slate-900 dark:text-white">{hospital.hospital}</p>
                      <p className="text-sm text-slate-600 dark:text-slate-300">{hospital.city}, {hospital.province}</p>
                      <p className="text-sm text-slate-600 dark:text-slate-300">{hospital.departments.join(", ")}</p>
                      <p className="text-sm text-slate-600 dark:text-slate-300">{hospital.phone}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-white/90 dark:bg-slate-900/70 backdrop-blur-sm border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-lg">
                <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-4">AI Health Recommendation</h2>
                <div className="flex gap-2">
                  <input
                    value={chatInput}
                    onChange={(event) => setChatInput(event.target.value)}
                    placeholder="Ask for doctor/hospital recommendation or generic health advice"
                    className="flex-1 px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-primary-500/30"
                  />
                  <button
                    onClick={handleAiAsk}
                    className="px-4 py-2 rounded-xl bg-gradient-to-r from-primary-500 to-accent-500 text-white"
                  >
                    {chatLoading ? "..." : <Send size={16} />}
                  </button>
                </div>

                <div className="mt-4 p-4 rounded-xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-800 min-h-[120px]">
                  {aiText ? (
                    <div className="text-sm leading-relaxed text-slate-700 dark:text-slate-200 space-y-2 [&>h1]:text-xl [&>h1]:font-bold [&>h1]:text-slate-900 dark:[&>h1]:text-white [&>h2]:text-lg [&>h2]:font-semibold [&>h2]:text-slate-900 dark:[&>h2]:text-white [&>h3]:font-semibold [&>ul]:list-disc [&>ul]:pl-5 [&>ol]:list-decimal [&>ol]:pl-5 [&>p]:mb-2 [&>blockquote]:border-l-2 [&>blockquote]:border-primary-500/40 [&>blockquote]:pl-3 [&>code]:px-1 [&>code]:py-0.5 [&>code]:rounded [&>code]:bg-slate-200 dark:[&>code]:bg-slate-700">
                      <ReactMarkdown>{aiText}</ReactMarkdown>
                    </div>
                  ) : (
                    <p className="text-sm text-slate-700 dark:text-slate-300">
                      AI recommendation will appear here.
                    </p>
                  )}
                </div>

                {(aiDoctors.length > 0 || aiHospitals.length > 0) && (
                  <div className="grid md:grid-cols-2 gap-3 mt-4 text-sm">
                    <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-700/30 border border-slate-200 dark:border-slate-700">
                      <p className="font-semibold text-slate-800 dark:text-white mb-2">AI Suggested Doctors</p>
                      {aiDoctors.map((doc) => (
                        <p key={doc.id} className="text-slate-600 dark:text-slate-300">• {doc.name} ({doc.hospital})</p>
                      ))}
                    </div>
                    <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-700/30 border border-slate-200 dark:border-slate-700">
                      <p className="font-semibold text-slate-800 dark:text-white mb-2">AI Suggested Hospitals</p>
                      {aiHospitals.map((hospital) => (
                        <p key={hospital.id} className="text-slate-600 dark:text-slate-300">• {hospital.name} ({hospital.city})</p>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </section>
        </div>
      </div>
      <Footer />
    </main>
  );
}
