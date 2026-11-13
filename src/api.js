// Cliente da API + Socket.IO. Se o back-end estiver offline, as páginas usam os dados de demonstração (mockData.js).
import { useCallback, useEffect, useState } from 'react';
import { io } from 'socket.io-client';

export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
const TOKEN_KEY = 'cs2hub_token';

export const getToken = () => {
  try { return localStorage.getItem(TOKEN_KEY); } catch { return null; }
};
export const setToken = (token) => {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  } catch { /* storage indisponível */ }
};

export async function api(path, { method = 'GET', body, form } = {}) {
  const headers = {};
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  let payload;
  if (form) payload = form;
  else if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
    payload = JSON.stringify(body);
  }
  let res;
  try {
    res = await fetch(API_URL + path, { method, headers, body: payload });
  } catch {
    const err = new Error('Servidor indisponível. Rode o back-end para usar dados reais.');
    err.offline = true;
    throw err;
  }
  let data = null;
  try { data = await res.json(); } catch { /* sem corpo */ }
  if (!res.ok) {
    const d = data?.detail;
    const err = new Error(typeof d === 'string' ? d : d?.[0]?.msg || `Erro ${res.status}`);
    err.status = res.status;
    throw err;
  }
  return data;
}

/** GET com fallback de demonstração quando o back-end está offline. */
export function useFetch(path, fallback, enabled = true) {
  const [state, setState] = useState({ data: null, loading: enabled, offline: false, error: null });

  const reload = useCallback(async () => {
    if (!enabled || !path) {
      setState({ data: null, loading: false, offline: true, error: null });
      return;
    }
    setState((s) => ({ ...s, loading: true }));
    try {
      const data = await api(path);
      setState({ data, loading: false, offline: false, error: null });
    } catch (err) {
      setState({ data: null, loading: false, offline: !!err.offline || err.status === 401, error: err.message });
    }
  }, [path, enabled]);

  useEffect(() => { reload(); }, [reload]);

  return { ...state, data: state.data ?? (state.offline ? fallback : null), reload };
}

export const createSocket = () => io(API_URL, { auth: { token: getToken() }, transports: ['websocket', 'polling'] });

export const ROLES = ['IGL', 'AWPer', 'Entry Fragger', 'Rifler', 'Support', 'Lurker'];
