// src/api/auth.js
import axios from "axios";

export const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL, // np. http://localhost:5000
    withCredentials: true,
});

// === AUTH ===
export const signup = (email, password) =>
    api.post("/auth/signup", { email, password });

export const login = (email, password) =>
    api.post("/auth/login", { email, password });

export const me = () => api.get("/auth/me");

export const logout = () => api.post("/auth/logout");

// === FAMILIES ===
export const createFamily = (name) => api.post("/families", { name });

export const getMyFamilies = () => api.get("/families/me");
