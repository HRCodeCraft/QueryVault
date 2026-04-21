import axios from 'axios';
import { getToken, removeToken } from './auth';

const api = axios.create({
  baseURL: 'http://localhost:8000/api',
  timeout: 60000,
});

api.interceptors.request.use((config) => {
  const token = getToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Auto-logout when the server rejects our token (fire once)
let loggingOut = false;
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401 && !loggingOut) {
      loggingOut = true;
      removeToken();
      window.dispatchEvent(new Event('qv:logout'));
      setTimeout(() => { loggingOut = false; }, 2000);
    }
    return Promise.reject(err);
  }
);

export const uploadDocument = (file, onProgress) => {
  const formData = new FormData();
  formData.append('file', file);
  return api.post('/documents/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    onUploadProgress: (e) => {
      if (onProgress) onProgress(Math.round((e.loaded * 100) / e.total));
    },
  });
};

export const listDocuments  = () => api.get('/documents/');
export const deleteDocument = (docId) => api.delete(`/documents/${docId}`);
export const listProviders  = () => api.get('/chat/providers');
export const askQuestion    = (question, provider = 'groq', docId = null) =>
  api.post('/chat/', { question, provider, doc_id: docId });

export const compareDocuments = (question, docIdA, docIdB, provider = 'groq') =>
  api.post('/chat/compare', { question, doc_id_a: docIdA, doc_id_b: docIdB, provider });

// User profile / settings / sessions (backend-stored)
export const getProfile     = () => api.get('/user/profile');
export const updateProfile  = (data) => api.put('/user/profile', data);
export const getSettings    = () => api.get('/user/settings');
export const updateSettings = (data) => api.put('/user/settings', data);
export const getSessions    = () => api.get('/user/sessions');
export const upsertSession  = (session) => api.post('/user/sessions', session);
export const deleteSession  = (id) => api.delete(`/user/sessions/${id}`);
export const clearSessions  = () => api.delete('/user/sessions');

// API Key management
export const listApiKeys   = () => api.get('/keys/');
export const createApiKey  = (name) => api.post('/keys/', { name });
export const deleteApiKey  = (id) => api.delete(`/keys/${id}`);

// Team Vaults
export const listTeams       = () => api.get('/teams/');
export const createTeam      = (name) => api.post('/teams/', { name });
export const joinTeam        = (invite_code) => api.post('/teams/join', { invite_code });
export const deleteOrLeave   = (teamId) => api.delete(`/teams/${teamId}`);
export const listTeamMembers = (teamId) => api.get(`/teams/${teamId}/members`);
export const listTeamDocs    = (teamId) => api.get(`/teams/${teamId}/documents`);
export const addTeamDoc      = (teamId, doc_id, doc_name) => api.post(`/teams/${teamId}/documents`, { doc_id, doc_name });
export const removeTeamDoc   = (teamId, docId) => api.delete(`/teams/${teamId}/documents/${docId}`);
