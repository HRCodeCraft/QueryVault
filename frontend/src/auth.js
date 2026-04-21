import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:8000/api/auth',
  timeout: 15000,
});

export const register = (email, password) =>
  api.post('/register', { email, password });

export const login = (email, password) =>
  api.post('/login', { email, password });

export const verifyEmail = (token) =>
  api.get(`/verify-email?token=${token}`);

export const saveToken = (token) => localStorage.setItem('qv_token', token);
export const getToken = () => localStorage.getItem('qv_token');
export const removeToken = () => localStorage.removeItem('qv_token');

export const isLoggedIn = () => {
  const token = localStorage.getItem('qv_token');
  if (!token) return false;
  try {
    const { exp } = JSON.parse(atob(token.split('.')[1]));
    if (exp && Date.now() / 1000 > exp) {
      localStorage.removeItem('qv_token'); // clear expired token
      return false;
    }
    return true;
  } catch { return false; }
};

export const getUserEmail = () => {
  try {
    const token = localStorage.getItem('qv_token');
    if (!token) return '';
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.sub || '';
  } catch { return ''; }
};
