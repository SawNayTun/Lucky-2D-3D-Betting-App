import { API_BASE_URL } from '../constants';

export const fetchApi = async (endpoint: string, options: RequestInit = {}) => {
  const token = localStorage.getItem('token');
  
  const headers = new Headers(options.headers || {});
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
    credentials: 'include', // Keep this for web compatibility
  });

  return response;
};
