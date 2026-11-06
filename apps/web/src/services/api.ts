import axios from "axios";

const baseURL = (
  import.meta.env.VITE_API_BASE_URL ||
  (import.meta.env.DEV ? "/api" : "http://localhost:5000/api")
).replace(/\/$/, "");

export const api = axios.create({
  baseURL,
  withCredentials: true,
  headers: { "Content-Type": "application/json" },
});

api.interceptors.request.use((config) => {
  // Let the browser set multipart boundary for FormData uploads.
  if (typeof FormData !== "undefined" && config.data instanceof FormData) {
    config.headers.delete("Content-Type");
  }
  return config;
});
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const message =
      error.response?.data?.error?.message ||
      error.message ||
      "Request failed";
    return Promise.reject(new Error(message));
  }
);

export type ApiSuccess<T> = { success: true; data: T };

export async function getData<T>(promise: Promise<{ data: ApiSuccess<T> }>) {
  const { data } = await promise;
  return data.data;
}
