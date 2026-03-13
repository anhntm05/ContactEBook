import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

api.interceptors.request.use(
  (config) => {
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    const status = error.response?.status;
    const errorCode = error.response?.data?.errorCode;

    if (status === 401 && errorCode === "TOKEN_EXPIRED") {
      if (window.location.pathname !== "/auth-failed") {
        window.location.replace("/auth-failed");
      }
    }

    return Promise.reject(error);
  }
);

export default api;
