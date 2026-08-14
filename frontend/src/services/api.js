import axios from "axios";

const api = axios.create({
    baseURL: "baseURL: "https://projectpulse-api-024o.onrender.com"",
});

api.interceptors.request.use((config) => {
    const token = localStorage.getItem("access_token");
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
}, (error) => {
    return Promise.reject(error);
});

api.interceptors.response.use(
    (response) => response,
    async (error) => {
        if (error.response && error.response.status === 401) {
            // Unauthenticated
        }
        return Promise.reject(error);
    }
);

export default api;
