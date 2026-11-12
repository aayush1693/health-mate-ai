import axios from "axios";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";
const ML_API_URL = process.env.NEXT_PUBLIC_ML_API_URL || "http://localhost:5000";

// Auth API
export const authApi = axios.create({
  baseURL: `${API_BASE_URL}/api/auth`,
  headers: {
    "Content-Type": "application/json",
  },
});

// ML API
export const mlApi = axios.create({
  baseURL: `${ML_API_URL}/api`,
  headers: {
    "Content-Type": "application/json",
  },
});

// Add auth token to requests
authApi.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Auth Services
export const authService = {
  login: async (email: string, password: string) => {
    const response = await authApi.post("/login", { email, password });
    return response.data;
  },

  register: async (data: {
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
    password: string;
  }) => {
    const response = await authApi.post("/register", data);
    return response.data;
  },

  verifyEmail: async (email: string, code: string) => {
    const response = await authApi.post("/verify", { email, code });
    return response.data;
  },

  forgotPassword: async (email: string) => {
    const response = await authApi.post("/forgot-password", { email });
    return response.data;
  },

  resetPassword: async (email: string, code: string, newPassword: string) => {
    const response = await authApi.post("/reset-password", {
      email,
      code,
      newPassword,
    });
    return response.data;
  },

  resendCode: async (email: string) => {
    const response = await authApi.post("/resend-code", { email });
    return response.data;
  },
};

// ML Services
export const mlService = {
  predictDisease: async (file: File, modelType: string) => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("model_type", modelType);
    
    const response = await mlApi.post("/predict", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
    return response.data;
  },

  chat: async (message: string, history: Array<{ role: string; content: string }>) => {
    const response = await mlApi.post("/chat", { message, history });
    return response.data;
  },

  getHospitalRecommendations: async (params: {
    specialty?: string;
    city?: string;
    lat?: number;
    lng?: number;
    limit?: number;
  }) => {
    const response = await mlApi.get("/recommendations/hospitals", { params });
    return response.data;
  },

  getDoctorRecommendations: async (params: {
    specialty?: string;
    min_experience?: number;
    limit?: number;
  }) => {
    const response = await mlApi.get("/recommendations/doctors", { params });
    return response.data;
  },

  getRecommendationCatalog: async (params: {
    query?: string;
    city?: string;
    province?: string;
    department?: string;
    limit?: number;
  }) => {
    const response = await mlApi.get("/recommendations/catalog", { params });
    return response.data;
  },

  getContentBasedRecommendations: async (payload: {
    diagnostic_output: any;
    lat?: number;
    lng?: number;
    city?: string;
    limit?: number;
  }) => {
    const response = await mlApi.post("/recommendations/content-based", payload);
    return response.data;
  },

  getAiDoctorHospitalAdvice: async (payload: {
    message: string;
    diagnosis?: any;
    lat?: number;
    lng?: number;
    city?: string;
    limit?: number;
  }) => {
    const response = await mlApi.post("/recommendations/ai-assist", payload);
    return response.data;
  },

  adminLogin: async (username: string, password: string) => {
    const response = await mlApi.post("/recommendations/admin/login", {
      username,
      password,
    });
    return response.data;
  },

  adminListEntries: async (username: string, password: string) => {
    const response = await mlApi.post("/recommendations/admin/entries", {
      username,
      password,
    });
    return response.data;
  },

  adminAddEntry: async (username: string, password: string, entry: any) => {
    const response = await mlApi.post("/recommendations/admin/entry", {
      username,
      password,
      entry,
    });
    return response.data;
  },

  adminUpdateEntry: async (
    username: string,
    password: string,
    id: string,
    entry: any
  ) => {
    const response = await mlApi.put(`/recommendations/admin/entry/${id}`, {
      username,
      password,
      entry,
    });
    return response.data;
  },

  adminDeleteEntry: async (username: string, password: string, id: string) => {
    const response = await mlApi.delete(`/recommendations/admin/entry/${id}`, {
      data: { username, password },
    });
    return response.data;
  },

  adminUploadJson: async (username: string, password: string, file: File) => {
    const formData = new FormData();
    formData.append("username", username);
    formData.append("password", password);
    formData.append("file", file);

    const response = await mlApi.post("/recommendations/admin/upload", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
    return response.data;
  },
};

export default { authService, mlService };
