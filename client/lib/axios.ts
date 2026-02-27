import axios, { AxiosInstance, AxiosError } from "axios";

/**
 * Axios instance for API calls
 * Includes JWT token management and error handling
 */

const API_BASE = "/api";
const TOKEN_KEY = "selfistar_token";

// Create axios instance
export const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE,
  headers: {
    "Content-Type": "application/json",
    "Accept": "application/json",
  },
  timeout: 30000, // 30 seconds
});

// Request interceptor: Add JWT token to requests
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem(TOKEN_KEY);
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor: Handle errors and token refresh
apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    if (error.response?.status === 401) {
      // Only redirect if it's not a login/register endpoint
      // Login/register 401 errors should be handled by the form
      const isAuthEndpoint = error.config?.url?.includes("/auth/login") || 
                             error.config?.url?.includes("/auth/register");
      
      if (!isAuthEndpoint) {
        // Token expired or invalid for protected routes
        localStorage.removeItem(TOKEN_KEY);
        // Redirect to login if not already there
        if (window.location.pathname !== "/login") {
          window.location.href = "/login";
        }
      }
    }
    return Promise.reject(error);
  }
);

// Token management helpers
export const tokenStorage = {
  get: () => localStorage.getItem(TOKEN_KEY),
  set: (token: string) => localStorage.setItem(TOKEN_KEY, token),
  remove: () => localStorage.removeItem(TOKEN_KEY),
};

// Export axios for direct use if needed
export { axios };
