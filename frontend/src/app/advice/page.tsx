"use client";

import { useEffect, useMemo, useState } from "react";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { mlService } from "@/lib/api";
import { useAuthGuard } from "@/lib/use-auth-guard";
import toast from "react-hot-toast";
import { AlertCircle, Stethoscope, Building2 } from "lucide-react";
import ReactMarkdown from "react-markdown";

type AdviceResult = {
  response?: string;
  doctors?: Array<Record<string, any>>;
  hospitals?: Array<Record<string, any>>;
};

export default function AdvicePage() {
  const isAuthorized = useAuthGuard();
  const [diagnosis, setDiagnosis] = useState<any>(null);
  const [city, setCity] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AdviceResult>({});

  useEffect(() => {
    const raw = localStorage.getItem("latestDiagnosis");
    if (!raw) return;
    try {
      setDiagnosis(JSON.parse(raw));
    } catch {
      setDiagnosis(null);
    }
  }, []);

  const quickMessage = useMemo(() => {
    if (!diagnosis?.prediction) return "Recommend suitable doctor and hospital.";
    return `I was diagnosed with ${diagnosis.prediction}. Recommend suitable doctors and hospitals nearby.`;
  }, [diagnosis]);

  const getAdvice = async (selectedCity?: string) => {
    if (!diagnosis) return;

    setLoading(true);
    try {
      const data = await mlService.getAiDoctorHospitalAdvice({
        message: quickMessage,
        diagnosis: diagnosis || undefined,
        city: (selectedCity ?? city).trim() || undefined,
        limit: 6,
      });

      if (data?.success === false) {
        toast.error(data?.error || "Failed to fetch advice");
        return;
      }

      setResult({
        response: data?.response || data?.message || "",
        doctors: Array.isArray(data?.doctors) ? data.doctors : [],
        hospitals: Array.isArray(data?.hospitals) ? data.hospitals : [],
      });
    } catch {
      toast.error("Could not load advice right now.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!diagnosis) return;
    getAdvice("");
  }, [diagnosis]);

  if (!isAuthorized) return null;

  return (
    <main className="min-h-screen bg-slate-50 dark:bg-slate-900">
      <Navbar />
      <div className="pt-24 pb-16">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-6 shadow-lg mb-6">
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Advice</h1>
            <p className="text-slate-600 dark:text-slate-300 mt-2">
              Personalized recommendation after your diagnosis result.
            </p>

            {!diagnosis ? (
              <div className="mt-4 p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 flex items-start gap-2">
                <AlertCircle size={18} className="mt-0.5" />
                <span>No recent diagnosis found. Please run AI diagnosis first.</span>
              </div>
            ) : (
              <div className="mt-4 p-4 rounded-xl bg-primary-50 dark:bg-primary-900/20 border border-primary-100 dark:border-primary-900/30">
                <p className="font-semibold text-slate-800 dark:text-white">
                  Prediction: <span className="text-primary-600">{diagnosis.prediction}</span>
                </p>
                <p className="text-sm text-slate-600 dark:text-slate-300 mt-1">
                  Confidence: {Number(diagnosis.confidence || 0).toFixed(1)}%
                </p>
              </div>
            )}

            <div className="grid md:grid-cols-2 gap-3 mt-5">
              <input
                value={city}
                onChange={(event) => setCity(event.target.value)}
                placeholder="City (optional)"
                className="px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200"
              />
              <button
                onClick={() => getAdvice(city)}
                disabled={loading || !diagnosis}
                className="px-4 py-2 rounded-lg bg-gradient-to-r from-primary-500 to-accent-500 text-white font-semibold disabled:opacity-60"
              >
                {loading ? "Loading..." : "Refresh Advice"}
              </button>
            </div>
          </div>

          <div className="grid lg:grid-cols-2 gap-6">
            <section className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-6 shadow-lg">
              <h2 className="text-xl font-bold text-slate-800 dark:text-white mb-3">AI Recommendation</h2>
              <div className="text-slate-700 dark:text-slate-300 leading-relaxed">
                {result.response ? (
                  <ReactMarkdown
                    components={{
                      h1: ({ ...props }) => <h1 className="text-2xl font-bold text-slate-900 dark:text-white mt-4 mb-3" {...props} />,
                      h2: ({ ...props }) => <h2 className="text-xl font-semibold text-slate-900 dark:text-white mt-4 mb-2" {...props} />,
                      h3: ({ ...props }) => <h3 className="text-lg font-semibold text-slate-900 dark:text-white mt-3 mb-2" {...props} />,
                      p: ({ ...props }) => <p className="mb-3 text-slate-700 dark:text-slate-300" {...props} />,
                      ul: ({ ...props }) => <ul className="list-disc pl-5 mb-3 space-y-1" {...props} />,
                      ol: ({ ...props }) => <ol className="list-decimal pl-5 mb-3 space-y-1" {...props} />,
                      li: ({ ...props }) => <li className="text-slate-700 dark:text-slate-300" {...props} />,
                      strong: ({ ...props }) => <strong className="font-semibold text-slate-900 dark:text-white" {...props} />,
                      blockquote: ({ ...props }) => (
                        <blockquote
                          className="border-l-4 border-primary-300 dark:border-primary-700 pl-4 italic text-slate-600 dark:text-slate-300 my-3"
                          {...props}
                        />
                      ),
                      code: ({ ...props }) => (
                        <code
                          className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-slate-100 text-sm"
                          {...props}
                        />
                      ),
                    }}
                  >
                    {result.response}
                  </ReactMarkdown>
                ) : (
                  <p>Advice will appear here.</p>
                )}
              </div>
            </section>

            <section className="space-y-6">
              <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-6 shadow-lg">
                <h3 className="text-lg font-semibold text-slate-800 dark:text-white mb-3 flex items-center gap-2">
                  <Stethoscope size={18} /> Recommended Doctors
                </h3>
                <div className="space-y-3 max-h-[320px] overflow-auto pr-1">
                  {(result.doctors || []).map((doc: any) => (
                    <div key={doc.id} className="p-3 rounded-xl bg-slate-50 dark:bg-slate-700/40 border border-slate-200 dark:border-slate-700">
                      <p className="font-semibold text-slate-900 dark:text-white">{doc.name}</p>
                      <p className="text-sm text-slate-600 dark:text-slate-300">{doc.hospital} • {doc.city}</p>
                      <p className="text-sm text-slate-600 dark:text-slate-300">{(doc.department || []).join(", ")}</p>
                      <p className="text-sm text-slate-600 dark:text-slate-300">{doc.mobile_number}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-6 shadow-lg">
                <h3 className="text-lg font-semibold text-slate-800 dark:text-white mb-3 flex items-center gap-2">
                  <Building2 size={18} /> Recommended Hospitals
                </h3>
                <div className="space-y-3 max-h-[280px] overflow-auto pr-1">
                  {(result.hospitals || []).map((hospital: any) => (
                    <div key={hospital.id} className="p-3 rounded-xl bg-slate-50 dark:bg-slate-700/40 border border-slate-200 dark:border-slate-700">
                      <p className="font-semibold text-slate-900 dark:text-white">{hospital.name}</p>
                      <p className="text-sm text-slate-600 dark:text-slate-300">{hospital.city}, {hospital.state}</p>
                      <p className="text-sm text-slate-600 dark:text-slate-300">{(hospital.specialties || []).join(", ")}</p>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          </div>
        </div>
      </div>
      <Footer />
    </main>
  );
}
