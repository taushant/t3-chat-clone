import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from "axios";
import { ApiError } from "@t3-chat/types";

class ApiClient {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL:
        process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api/v1",
      timeout: 10000,
      headers: {
        "Content-Type": "application/json",
      },
    });

    this.setupInterceptors();
  }

  private setupInterceptors(): void {
    // Request interceptor to add auth token
    this.client.interceptors.request.use(
      (config) => {
        if (typeof window !== "undefined") {
          const token = localStorage.getItem("accessToken");
          if (token) {
            config.headers.Authorization = `Bearer ${token}`;
          }
        }
        return config;
      },
      (error) => {
        return Promise.reject(error);
      },
    );

    // Response interceptor to handle errors
    this.client.interceptors.response.use(
      (response: AxiosResponse) => {
        return response;
      },
      (error) => {
        if (error.response?.status === 401) {
          // Handle unauthorized access
          if (typeof window !== "undefined") {
            localStorage.removeItem("accessToken");
            window.location.href = "/auth/login";
          }
        }
        return Promise.reject(this.handleError(error));
      },
    );
  }

  private handleError(error: unknown): ApiError {
    // Type guard for axios error
    const isAxiosError = (
      err: unknown,
    ): err is {
      response?: {
        status: number;
        data?: { message?: string; error?: string };
      };
      request?: unknown;
      config?: { url?: string };
      message?: string;
    } => {
      return typeof err === "object" && err !== null;
    };

    if (isAxiosError(error)) {
      if (error.response) {
        // Server responded with error status
        return {
          message: error.response.data?.message || "An error occurred",
          statusCode: error.response.status,
          error: error.response.data?.error || "Request failed",
          timestamp: new Date().toISOString(),
          path: error.config?.url || "",
        };
      } else if (error.request) {
        // Request was made but no response received
        return {
          message: "Network error - please check your connection",
          statusCode: 0,
          error: "Network Error",
          timestamp: new Date().toISOString(),
          path: error.config?.url || "",
        };
      } else {
        // Something else happened
        return {
          message: error.message || "An unexpected error occurred",
          statusCode: 500,
          error: "Unknown Error",
          timestamp: new Date().toISOString(),
          path: "",
        };
      }
    }

    // Fallback for non-axios errors
    return {
      message: "An unexpected error occurred",
      statusCode: 500,
      error: "Unknown Error",
      timestamp: new Date().toISOString(),
      path: "",
    };
  }

  // Generic request methods
  async get<T = unknown>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.get<T>(url, config);
    return response.data;
  }

  async post<T = unknown>(
    url: string,
    data?: unknown,
    config?: AxiosRequestConfig,
  ): Promise<T> {
    const response = await this.client.post<T>(url, data, config);
    return response.data;
  }

  async put<T = unknown>(
    url: string,
    data?: unknown,
    config?: AxiosRequestConfig,
  ): Promise<T> {
    const response = await this.client.put<T>(url, data, config);
    return response.data;
  }

  async patch<T = unknown>(
    url: string,
    data?: unknown,
    config?: AxiosRequestConfig,
  ): Promise<T> {
    const response = await this.client.patch<T>(url, data, config);
    return response.data;
  }

  async delete<T = unknown>(
    url: string,
    config?: AxiosRequestConfig,
  ): Promise<T> {
    const response = await this.client.delete<T>(url, config);
    return response.data;
  }

  // Set auth token
  setAuthToken(token: string): void {
    if (typeof window !== "undefined") {
      localStorage.setItem("accessToken", token);
    }
    this.client.defaults.headers.Authorization = `Bearer ${token}`;
  }

  // Clear auth token
  clearAuthToken(): void {
    if (typeof window !== "undefined") {
      localStorage.removeItem("accessToken");
    }
    delete this.client.defaults.headers.Authorization;
  }

  // Get the underlying axios instance for advanced usage
  getClient(): AxiosInstance {
    return this.client;
  }
}

// Create and export a singleton instance
export const apiClient = new ApiClient();
export default apiClient;
