    import { initializeApp } from "./app-client.js";
    import { getAuth, createUserWithEmailAndPassword, onAuthStateChanged } from "./app-client.js";
    import { getDatabase, ref, set, get } from "./app-client.js";

  const appConfig = window.__CYRUS_DATA__?.appConfig || {};

    const app = initializeApp(appConfig);
    const auth = getAuth(app);
    const db = getDatabase(app);

    onAuthStateChanged(auth, (user) => {
      if (user) window.location.href = 'home.php';
    });

    let pendingUsername = '';
    let pendingEmail = '';
    let pendingPassword = '';
    let createdUser = null;

    window.checkUsername = (input) => {
      const val = input.value.trim();
      const hint = document.getElementById('usernameHint');
      const ok = /^[a-zA-Z0-9_]{3,20}$/.test(val);
      input.classList.toggle('valid', ok);
      input.classList.toggle('invalid', val.length > 0 && !ok);
      hint.textContent = ok ?
        '✓ Username looks good' :
        val.length < 3 ? '3–20 characters, letters, numbers, underscores only' :
        val.length > 20 ? 'Too long — max 20 characters' :
        'Only letters, numbers, and underscores allowed';
      hint.className = 'field-hint' + (ok ? ' ok' : val.length > 0 ? ' bad' : '');
    };

    window.checkPwStrength = (pw) => {
      const wrap = document.getElementById('pwStrengthWrap');
      const fill = document.getElementById('pwStrengthFill');
      const lbl = document.getElementById('pwStrengthLabel');
      if (!pw) { wrap.style.display = 'none'; return; }
      wrap.style.display = 'block';

      let score = 0;
      if (pw.length >= 8) score++;
      if (pw.length >= 12) score++;
      if (/[A-Z]/.test(pw)) score++;
      if (/[0-9]/.test(pw)) score++;
      if (/[^A-Za-z0-9]/.test(pw)) score++;

      const levels = [
        { pct: 20, color: '#f43f5e', label: 'Very Weak' },
        { pct: 40, color: '#fb923c', label: 'Weak' },
        { pct: 60, color: '#facc15', label: 'Fair' },
        { pct: 80, color: '#4ade80', label: 'Strong' },
        { pct: 100, color: '#22d3a5', label: 'Very Strong' },
      ];
      const lvl = levels[Math.min(score, 4)];
      fill.style.width = lvl.pct + '%';
      fill.style.background = lvl.color;
      lbl.textContent = lvl.label;
      lbl.style.color = lvl.color;
    };

    window.proceedToVerify = async () => {
      const username = document.getElementById('regUsername').value.trim();
      const email = document.getElementById('regEmail').value.trim();
      const pw = document.getElementById('regPassword').value;
      const cpw = document.getElementById('regConfirmPw').value;

      if (!username || !/^[a-zA-Z0-9_]{3,20}$/.test(username)) {
        showAlert('step1Alert', 'Please enter a valid username (3–20 chars, letters/numbers/underscores).', 'error');
        return;
      }
      if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        showAlert('step1Alert', 'Please enter a valid email address.', 'error');
        return;
      }
      if (pw.length < 8) {
        showAlert('step1Alert', 'Password must be at least 8 characters.', 'error');
        return;
      }
      if (pw !== cpw) {
        showAlert('step1Alert', 'Passwords do not match.', 'error');
        return;
      }

      const btn = document.getElementById('proceedBtn');
      btn.disabled = true;
      btn.innerHTML = '<span class="loading-spinner"></span>Creating account...';

      try {

        pendingUsername = username;
        pendingEmail = email;
        pendingPassword = pw;

        const result = await createUserWithEmailAndPassword(auth, email, pw, username);
        createdUser = result.user;

        document.getElementById('welcomeName').textContent = pendingUsername;
        goToStep(2);
      } catch (err) {
        let msg = err.message || 'Something went wrong. Please try again.';
        if (err.code === 'auth/email-already-in-use') msg = 'An account with this email already exists. Try signing in.';
        else if (err.code === 'auth/weak-password') msg = 'Password is too weak. Please use a stronger password.';
        showAlert('step1Alert', msg, 'error');
        console.error(err);
      } finally {
        btn.disabled = false;
        btn.innerHTML = 'Continue';
      }
    };

    window.goToStep = (n) => {
      document.querySelectorAll('.step').forEach(s => s.classList.remove('active'));
      document.getElementById('step' + n).classList.add('active');
      const dots = document.querySelectorAll('.step-dot');
      dots.forEach((dot, i) => {
        dot.classList.remove('active', 'done');
        if (i + 1 < n) dot.classList.add('done');
        else if (i + 1 === n) dot.classList.add('active');
      });
    };

    window.showAlert = (id, msg, type) => {
      const el = document.getElementById(id);
      el.textContent = msg;
      el.className = `alert ${type} show`;
      if (type === 'error') setTimeout(() => el.classList.remove('show'), 5000);
    };

    window.togglePw = (id) => {
      const el = document.getElementById(id);
      el.type = el.type === 'password' ? 'text' : 'password';
    };
  
