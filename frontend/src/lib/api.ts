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
    query?: string;
    filters?: any;
  }) => {
    const response = await mlApi.post("/recommendations/hospitals", params);
    return response.data;
  },

  getDoctorRecommendations: async (params: {
    specialty?: string;
    query?: string;
    filters?: any;
  }) => {
    const response = await mlApi.post("/recommendations/doctors", params);
    return response.data;
  },
};

export default { authService, mlService };
