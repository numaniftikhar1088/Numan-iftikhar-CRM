/* NumanOS — login page logic (sign-in + MFA step). */
(function () {
  const form = document.getElementById('loginForm');
  if (!form) return;

  const emailEl = document.getElementById('email');
  const pwEl = document.getElementById('password');
  const errEl = document.getElementById('authError');
  const btn = document.getElementById('loginBtn');
  const togglePw = document.getElementById('togglePw');
  const mfaWrap = document.getElementById('mfaStep');
  const mfaCode = document.getElementById('mfaCode');
  const credStep = document.getElementById('credStep');

  let mfaToken = null;

  function showError(msg) {
    errEl.textContent = msg;
    errEl.style.display = 'block';
  }
  function clearError() {
    errEl.style.display = 'none';
  }
  function loading(on, label) {
    btn.disabled = on;
    btn.innerHTML = on
      ? '<i class="fas fa-circle-notch fa-spin"></i> ' + (label || 'Please wait…')
      : btn.dataset.label;
  }

  if (togglePw) {
    togglePw.addEventListener('click', () => {
      const showing = pwEl.type === 'text';
      pwEl.type = showing ? 'password' : 'text';
      togglePw.innerHTML = showing ? '<i class="fas fa-eye"></i>' : '<i class="fas fa-eye-slash"></i>';
    });
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearError();

    // MFA step
    if (mfaToken) {
      loading(true, 'Verifying…');
      try {
        const res = await API.post('/auth/mfa/verify', { mfa_token: mfaToken, code: mfaCode.value.trim() });
        finish(res);
      } catch (err) {
        showError(err.message);
        loading(false);
      }
      return;
    }

    // Credentials step
    loading(true, 'Signing in…');
    try {
      const res = await API.post('/auth/login', {
        email: emailEl.value.trim(),
        password: pwEl.value,
      });
      if (res.mfa_required) {
        mfaToken = res.mfa_token;
        credStep.style.display = 'none';
        mfaWrap.style.display = 'block';
        btn.dataset.label = '<i class="fas fa-shield-halved"></i> Verify code';
        loading(false);
        mfaCode.focus();
        return;
      }
      finish(res);
    } catch (err) {
      showError(err.message);
      loading(false);
    }
  });

  function finish(res) {
    API.token.set(res.token);
    API.setUser(res.user);
    location.href = 'dashboard.html';
  }

  // If already signed in, skip to the dashboard.
  if (API.isAuthed()) location.href = 'dashboard.html';
})();
