export async function api(path, { method = 'GET', body } = {}) {
  const token = localStorage.getItem('token');
  const res = await fetch('/api' + path, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: 'Bearer ' + token } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => null);
  if (res.status === 401 && path !== '/auth/login') { localStorage.clear(); location.href = '/login'; }
  if (!res.ok) { const e = new Error(data?.error || res.statusText); e.status = res.status; e.data = data; throw e; }
  return data;
}

export const slotLabels = (cfg) => {
  const [h, m] = cfg.startTime.split(':').map(Number);
  return Array.from({ length: cfg.slotsPerDay }, (_, i) => {
    const t = h * 60 + m + i * cfg.slotMinutes;
    return `${String(Math.floor(t / 60) % 24).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`;
  });
};
