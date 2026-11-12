"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useDropzone } from "react-dropzone";
import {
  Brain,
  Upload,
  X,
  Loader2,
  CheckCircle,
  AlertTriangle,
  Info,
  ChevronRight,
  FileImage,
  Activity,
  TrendingUp,
  Shield,
  Zap,
} from "lucide-react";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import toast from "react-hot-toast";
import { useAuthGuard } from "@/lib/use-auth-guard";

const diseaseModels = [
  {
    id: "pneumonia",
    name: "Pneumonia Detection",
    description: "Analyze chest X-ray images to detect signs of pneumonia",
    icon: "🫁",
    imageType: "Chest X-Ray",
    accuracy: "98.5%",
    color: "from-blue-500 to-cyan-500",
    details: [
      "Detects viral and bacterial pneumonia",
      "Trained on 5,000+ chest X-ray images",
      "Results in under 5 seconds",
    ],
  },
  {
    id: "lung_cancer",
    name: "Lung Cancer Screening",
    description: "Detect early signs of lung cancer from CT scan images",
    icon: "🔬",
    imageType: "Thoracic CT Scan",
    accuracy: "97.8%",
    color: "from-purple-500 to-pink-500",
    details: [
      "Early-stage cancer detection",
      "Nodule classification",
      "Multi-class analysis",
    ],
  },
  {
    id: "alzheimer",
    name: "Alzheimer's Assessment",
    description: "Analyze MRI scans to assess Alzheimer's disease progression",
    icon: "🧠",
    imageType: "Brain MRI",
    accuracy: "96.2%",
    color: "from-orange-500 to-red-500",
    details: [
      "4-stage classification",
      "Progression tracking",
      "Early warning indicators",
    ],
  },
];

interface PredictionResult {
  prediction: string;
  confidence: number;
  recommendation?: string;
  all_predictions?: Array<{ label: string; confidence: number }>;
}

export default function DetectPage() {
  const isAuthorized = useAuthGuard();
  const router = useRouter();
  const [selectedModel, setSelectedModel] = useState<string | null>(null);
  const [uploadedImage, setUploadedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<PredictionResult | null>(null);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (file) {
      setUploadedImage(file);
      setImagePreview(URL.createObjectURL(file));
      setResult(null);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "image/*": [".png", ".jpg", ".jpeg", ".dcm"],
    },
    maxFiles: 1,
  });

  if (!isAuthorized) return null;

  const clearImage = () => {
    setUploadedImage(null);
    setImagePreview(null);
    setResult(null);
  };

  const analyzeImage = async () => {
    if (!uploadedImage || !selectedModel) return;

    setIsAnalyzing(true);
    setResult(null);

    const formData = new FormData();
    formData.append("file", uploadedImage);
    formData.append("model_type", selectedModel);

    try {
      const response = await fetch("http://localhost:5000/api/predict", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (response.ok) {
        const normalizedResult = {
          ...data,
          model_type: selectedModel,
          condition: data?.prediction,
        };
        setResult(normalizedResult);
        localStorage.setItem("latestDiagnosis", JSON.stringify(normalizedResult));
        toast.success("Analysis complete!");
      } else {
        toast.error(data.error || "Analysis failed");
      }
    } catch (error) {
      toast.error("Connection error. Please try again.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const selectedModelData = diseaseModels.find((m) => m.id === selectedModel);

  return (
    <main className="min-h-screen bg-slate-50 dark:bg-slate-900">
      <Navbar />

      <div className="pt-24 pb-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-12"
          >
            <span className="inline-block px-4 py-2 rounded-full bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 text-sm font-medium mb-4">
              AI-Powered Diagnostics
            </span>
            <h1 className="text-4xl lg:text-5xl font-bold text-slate-800 dark:text-white mb-4">
              Disease Detection with{" "}
              <span className="gradient-text">Advanced AI</span>
            </h1>
            <p className="text-xl text-slate-600 dark:text-slate-300 max-w-2xl mx-auto">
              Upload your medical scans and get instant AI-powered analysis with high accuracy detection.
            </p>
          </motion.div>

          {/* Model Selection */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="mb-12"
          >
            <h2 className="text-2xl font-bold text-slate-800 dark:text-white mb-6 text-center">
              Select Detection Model
            </h2>
            <div className="grid md:grid-cols-3 gap-6">
              {diseaseModels.map((model, index) => (
                <motion.button
                  key={model.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 + index * 0.1 }}
                  onClick={() => {
                    setSelectedModel(model.id);
                    setResult(null);
                  }}
                  className={`relative p-6 rounded-2xl text-left transition-all duration-300 ${
                    selectedModel === model.id
                      ? "bg-white dark:bg-slate-800 shadow-2xl ring-2 ring-primary-500 scale-[1.02]"
                      : "bg-white dark:bg-slate-800 shadow-lg hover:shadow-xl hover:scale-[1.01]"
                  } border border-slate-200 dark:border-slate-700`}
                >
                  {selectedModel === model.id && (
                    <div className="absolute top-4 right-4">
                      <CheckCircle className="w-6 h-6 text-primary-500" />
                    </div>
                  )}
                  <div className="text-4xl mb-4">{model.icon}</div>
                  <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-2">
                    {model.name}
                  </h3>
                  <p className="text-slate-600 dark:text-slate-300 mb-4">
                    {model.description}
                  </p>
                  <div className="flex items-center gap-4 text-sm">
                    <span className="px-3 py-1 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                      {model.imageType}
                    </span>
                    <span className="px-3 py-1 rounded-lg bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 font-medium">
                      {model.accuracy} Accuracy
                    </span>
                  </div>
                </motion.button>
              ))}
            </div>
          </motion.div>

          {/* Upload Section */}
          <AnimatePresence mode="wait">
            {selectedModel && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="grid lg:grid-cols-2 gap-8"
              >
                {/* Upload Area */}
                <div className="bg-white dark:bg-slate-800 rounded-3xl p-8 shadow-xl border border-slate-200 dark:border-slate-700">
                  <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-6 flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${selectedModelData?.color} flex items-center justify-center`}>
                      <Upload className="w-5 h-5 text-white" />
                    </div>
                    Upload {selectedModelData?.imageType}
                  </h3>

                  {!uploadedImage ? (
                    <div
                      {...getRootProps()}
                      className={`border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer transition-all duration-300 ${
                        isDragActive
                          ? "border-primary-500 bg-primary-50 dark:bg-primary-900/20"
                          : "border-slate-300 dark:border-slate-600 hover:border-primary-500 hover:bg-slate-50 dark:hover:bg-slate-700/50"
                      }`}
                    >
                      <input {...getInputProps()} />
                      <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-slate-100 dark:bg-slate-700 flex items-center justify-center">
                        <FileImage className="w-8 h-8 text-slate-400" />
                      </div>
                      <p className="text-lg font-medium text-slate-800 dark:text-white mb-2">
                        {isDragActive
                          ? "Drop your image here"
                          : "Drag & drop your scan here"}
                      </p>
                      <p className="text-slate-500 dark:text-slate-400 mb-4">
                        or click to browse files
                      </p>
                      <p className="text-sm text-slate-400">
                        Supports: PNG, JPG, JPEG, DICOM
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="relative rounded-2xl overflow-hidden bg-slate-100 dark:bg-slate-700">
                        <img
                          src={imagePreview!}
                          alt="Uploaded scan"
                          className="w-full h-64 object-contain"
                        />
                        <button
                          onClick={clearImage}
                          className="absolute top-4 right-4 p-2 rounded-xl bg-red-500 text-white hover:bg-red-600 transition-colors"
                        >
                          <X size={20} />
                        </button>
                      </div>
                      <div className="flex items-center justify-between p-4 rounded-xl bg-slate-50 dark:bg-slate-700/50">
                        <div className="flex items-center gap-3">
                          <FileImage className="w-5 h-5 text-slate-400" />
                          <span className="text-slate-600 dark:text-slate-300 truncate max-w-[200px]">
                            {uploadedImage.name}
                          </span>
                        </div>
                        <span className="text-sm text-slate-500">
                          {(uploadedImage.size / 1024).toFixed(1)} KB
                        </span>
                      </div>
                      <button
                        onClick={analyzeImage}
                        disabled={isAnalyzing}
                        className="w-full btn-primary flex items-center justify-center gap-2"
                      >
                        {isAnalyzing ? (
                          <>
                            <Loader2 className="w-5 h-5 animate-spin" />
                            Analyzing...
                          </>
                        ) : (
                          <>
                            <Brain className="w-5 h-5" />
                            Analyze with AI
                          </>
                        )}
                      </button>
                    </div>
                  )}

                  {/* Model Details */}
                  <div className="mt-6 p-4 rounded-xl bg-slate-50 dark:bg-slate-700/50">
                    <h4 className="font-medium text-slate-800 dark:text-white mb-3 flex items-center gap-2">
                      <Info size={18} className="text-primary-500" />
                      Model Information
                    </h4>
                    <ul className="space-y-2">
                      {selectedModelData?.details.map((detail, index) => (
                        <li
                          key={index}
                          className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300"
                        >
                          <CheckCircle size={14} className="text-green-500" />
                          {detail}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* Results Area */}
                <div className="bg-white dark:bg-slate-800 rounded-3xl p-8 shadow-xl border border-slate-200 dark:border-slate-700">
                  <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-6 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center">
                      <Activity className="w-5 h-5 text-white" />
                    </div>
                    Analysis Results
                  </h3>

                  {!result && !isAnalyzing && (
                    <div className="text-center py-16">
                      <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center">
                        <Brain className="w-12 h-12 text-slate-300 dark:text-slate-500" />
                      </div>
                      <p className="text-lg font-medium text-slate-600 dark:text-slate-300 mb-2">
                        No analysis yet
                      </p>
                      <p className="text-slate-500 dark:text-slate-400">
                        Upload an image and click analyze to see results
                      </p>
                    </div>
                  )}

                  {isAnalyzing && (
                    <div className="text-center py-16">
                      <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center animate-pulse">
                        <Loader2 className="w-12 h-12 text-primary-500 animate-spin" />
                      </div>
                      <p className="text-lg font-medium text-slate-800 dark:text-white mb-2">
                        Analyzing your scan...
                      </p>
                      <p className="text-slate-500 dark:text-slate-400">
                        Our AI is processing your image
                      </p>
                    </div>
                  )}

                  {result && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="space-y-6"
                    >
                      {/* Main Result */}
                      <div
                        className={`p-6 rounded-2xl ${
                          result.prediction === "Normal" ||
                          result.prediction === "NonDemented"
                            ? "bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800"
                            : "bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800"
                        }`}
                      >
                        <div className="flex items-center gap-4 mb-4">
                          {result.prediction === "Normal" ||
                          result.prediction === "NonDemented" ? (
                            <CheckCircle className="w-12 h-12 text-green-500" />
                          ) : (
                            <AlertTriangle className="w-12 h-12 text-amber-500" />
                          )}
                          <div>
                            <p className="text-sm text-slate-500 dark:text-slate-400">
                              Prediction Result
                            </p>
                            <p className="text-2xl font-bold text-slate-800 dark:text-white">
                              {result.prediction}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-3 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                            <div
                              className={`h-full rounded-full ${
                                result.prediction === "Normal" ||
                                result.prediction === "NonDemented"
                                  ? "bg-green-500"
                                  : "bg-amber-500"
                              }`}
                              style={{ width: `${result.confidence}%` }}
                            />
                          </div>
                          <span className="font-bold text-slate-800 dark:text-white">
                            {result.confidence.toFixed(1)}%
                          </span>
                        </div>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">
                          Confidence Score
                        </p>
                      </div>

                      {/* Disclaimer */}
                      <div className="p-4 rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
                        <div className="flex items-start gap-3">
                          <Shield className="w-5 h-5 text-blue-500 mt-0.5" />
                          <div>
                            <p className="font-medium text-blue-800 dark:text-blue-300 mb-1">
                              Medical Disclaimer
                            </p>
                            <p className="text-sm text-blue-600 dark:text-blue-400">
                              This AI analysis is for informational purposes only and should not replace professional medical advice. Please consult with a healthcare provider for proper diagnosis and treatment.
                            </p>
                          </div>
                        </div>
                      </div>

                      <button
                        onClick={() => router.push("/advice")}
                        className="w-full px-5 py-3 rounded-xl bg-gradient-to-r from-primary-500 to-accent-500 text-white font-semibold hover:opacity-95 transition-opacity"
                      >
                        View Advice
                      </button>
                    </motion.div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Features */}
          {!selectedModel && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="mt-16"
            >
              <h2 className="text-2xl font-bold text-slate-800 dark:text-white mb-8 text-center">
                Why Choose HealthMate AI Detection?
              </h2>
              <div className="grid md:grid-cols-3 gap-8">
                {[
                  {
                    icon: Zap,
                    title: "Lightning Fast",
                    description: "Get results in seconds with our optimized AI models",
                    color: "from-yellow-500 to-orange-500",
                  },
                  {
                    icon: Shield,
                    title: "Highly Accurate",
                    description: "Trained on thousands of medical images for reliable results",
                    color: "from-green-500 to-emerald-500",
                  },
                  {
                    icon: TrendingUp,
                    title: "Continuously Learning",
                    description: "Our models improve with each analysis to provide better insights",
                    color: "from-blue-500 to-cyan-500",
                  },
                ].map((feature, index) => (
                  <div
                    key={index}
                    className="text-center p-8 bg-white dark:bg-slate-800 rounded-2xl shadow-lg border border-slate-200 dark:border-slate-700"
                  >
                    <div
                      className={`w-16 h-16 mx-auto mb-6 rounded-2xl bg-gradient-to-br ${feature.color} flex items-center justify-center`}
                    >
                      <feature.icon className="w-8 h-8 text-white" />
                    </div>
                    <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-3">
                      {feature.title}
                    </h3>
                    <p className="text-slate-600 dark:text-slate-300">
                      {feature.description}
                    </p>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </div>
      </div>

      <Footer />
    </main>
  );
}
