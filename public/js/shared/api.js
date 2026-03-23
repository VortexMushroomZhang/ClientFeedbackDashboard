// Shared API wrapper for all frontend pages
const API = {
  baseUrl: '/api',

  async get(endpoint, params = {}) {
    const url = new URL(this.baseUrl + endpoint, window.location.origin);
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined && v !== null && v !== '') url.searchParams.set(k, v);
    }
    const res = await fetch(url);
    if (!res.ok) throw new Error(`API error: ${res.status}`);
    return res.json();
  },

  async put(endpoint, body) {
    const res = await fetch(this.baseUrl + endpoint, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(`API error: ${res.status}`);
    return res.json();
  },

  async uploadFile(file, source) {
    const formData = new FormData();
    formData.append('file', file);
    if (source) formData.append('source', source);
    const res = await fetch(this.baseUrl + '/upload', {
      method: 'POST',
      body: formData,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Upload failed' }));
      throw new Error(err.error || 'Upload failed');
    }
    return res.json();
  },

  // Convenience methods
  getFeedback(params) { return this.get('/feedback', params); },
  getThemes() { return this.get('/themes'); },
  getActions() { return this.get('/actions'); },
  getImports() { return this.get('/imports'); },
  updateAction(id, data) { return this.put('/actions/' + id, data); },
};
