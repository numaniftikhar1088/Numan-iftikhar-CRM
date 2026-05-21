/* NumanOS — tiny API client shared by the login + dashboard pages. */
(function () {
  const API_BASE =
    localStorage.getItem('numanos_api') ||
    (location.hostname === 'localhost' || location.hostname === '127.0.0.1'
      ? 'http://localhost:5050/api'
      : '/api');

  const TOKEN_KEY = 'numanos_token';
  const USER_KEY = 'numanos_user';

  const tokenStore = {
    get: () => localStorage.getItem(TOKEN_KEY),
    set: (t) => localStorage.setItem(TOKEN_KEY, t),
    clear: () => {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
    },
  };

  function setUser(u) {
    localStorage.setItem(USER_KEY, JSON.stringify(u));
  }
  function getUser() {
    try {
      return JSON.parse(localStorage.getItem(USER_KEY));
    } catch {
      return null;
    }
  }

  async function request(method, path, body, isForm) {
    const headers = {};
    const token = tokenStore.get();
    if (token) headers['Authorization'] = 'Bearer ' + token;
    let payload;
    if (isForm) {
      payload = body; // FormData
    } else if (body !== undefined) {
      headers['Content-Type'] = 'application/json';
      payload = JSON.stringify(body);
    }

    let res;
    try {
      res = await fetch(API_BASE + path, { method, headers, body: payload });
    } catch (e) {
      throw new Error('Cannot reach the API. Is the backend running on :5000?');
    }

    if (res.status === 401 && !path.startsWith('/auth/login') && !path.startsWith('/auth/mfa')) {
      tokenStore.clear();
      if (!location.pathname.endsWith('login.html')) location.href = 'login.html';
      throw new Error('Session expired.');
    }

    const ct = res.headers.get('content-type') || '';
    const data = ct.includes('application/json') ? await res.json() : await res.text();
    if (!res.ok) {
      throw new Error((data && data.error) || 'Request failed (' + res.status + ')');
    }
    return data;
  }

  window.API = {
    base: API_BASE,
    token: tokenStore,
    setUser,
    getUser,
    get: (p) => request('GET', p),
    post: (p, b) => request('POST', p, b),
    put: (p, b) => request('PUT', p, b),
    patch: (p, b) => request('PATCH', p, b),
    del: (p) => request('DELETE', p),
    upload: (p, formData) => request('POST', p, formData, true),
    downloadUrl: (p) => API_BASE + p,
    isAuthed: () => !!tokenStore.get(),
  };
})();
