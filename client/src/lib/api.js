import axios from 'axios';

const baseURL = (import.meta.env.VITE_API_URL || 'http://localhost:5000/api').replace(/\/$/, '');

export const api = axios.create({
  baseURL,
  timeout: 20000,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('taskpulse_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const url = error.config?.url || '';
    const hasToken = Boolean(localStorage.getItem('taskpulse_token'));
    if (error.response?.status === 401 && hasToken && !url.includes('/auth/login')) {
      window.dispatchEvent(new Event('taskpulse:unauthorized'));
    }
    return Promise.reject(error);
  }
);

export function getApiErrorMessage(error) {
  if (error?.response?.data?.error?.message) {
    return error.response.data.error.message;
  }
  if (error?.code === 'ECONNABORTED') {
    return 'The request timed out. Please try again.';
  }
  if (!error?.response) {
    return 'Cannot reach the server. Make sure the API is running and try again.';
  }
  return 'Something went wrong. Please try again.';
}

export function getApiErrorDetails(error) {
  const details = error?.response?.data?.error?.details;
  return Array.isArray(details) ? details : [];
}

export default api;
