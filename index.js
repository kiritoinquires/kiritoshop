    import { initializeApp } from "./app-client.js";
    import { getAuth, GoogleAuthProvider, signInWithPopup, updatePassword, createUserWithEmailAndPassword, signInWithEmailAndPassword, onAuthStateChanged } from "./app-client.js";
    import { getDatabase, ref, set, get } from "./app-client.js";

 const appConfig = window.__CYRUS_DATA__?.appConfig || {};

    const app = initializeApp(appConfig);
    const auth = getAuth(app);
    const db = getDatabase(app);

    const EMAILJS_USER_ID = 'ZAhhQvlMpNMCivJhn';
    const EMAILJS_SERVICE_ID = 'service_1sf8dfm';
    const EMAILJS_TEMPLATE_ID = 'template_5w4cjgf';

    (function() { emailjs.init(EMAILJS_USER_ID); })();

    onAuthStateChanged(auth, (user) => {
      if (user) window.location.href = 'pages/home';
    });

    let currentEmail = '';
    let resetCode = '';
    let resetExpiry = null;
    let resetTimer = null;

    window.proceedWithEmail = () => {
      const email = document.getElementById('emailInput').value.trim();
      if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        showAlert('emailAlert', 'Please enter a valid email address.', 'error');
        return;
      }
      currentEmail = email;
      document.getElementById('loginEmailLabel').textContent = `Signing in as ${email}`;
      goToStep(2);
    };

    window.completeLogin = async () => {
      const username = document.getElementById('usernameInput').value.trim();
      const pw = document.getElementById('passwordLoginInput').value;

      if (!username) { showAlert('loginAlert', 'Please enter your username.', 'error'); return; }
      if (!pw) { showAlert('loginAlert', 'Please enter your password.', 'error'); return; }

      const btn = document.getElementById('loginBtn');
      btn.disabled = true;
      btn.innerHTML = '<span class="loading-spinner" style="display:inline-block;"></span> Signing in...';

      try {

        const result = await signInWithEmailAndPassword(auth, currentEmail, pw);
        const user = result.user;

        const userRef = ref(db, 'users/' + user.uid);
        const snap = await get(userRef);
        if (snap.exists()) {
          const stored = snap.val();
          if (stored.username && stored.username !== username) {
            await auth.signOut();
            showAlert('loginAlert', 'Username does not match. Please try again.', 'error');
            return;
          }
        }

        showAlert('loginSuccess', 'Welcome back! Redirecting...', 'success');
        setTimeout(() => window.location.href = 'pages/home', 1500);
      } catch (err) {
        let msg = 'Incorrect username or password.';
        if (err.code === 'auth/wrong-password') msg = 'Incorrect password. Please try again.';
        else if (err.code === 'auth/user-not-found') msg = 'No account found with this email.';
        else if (err.code === 'auth/too-many-requests') msg = 'Too many attempts. Please wait and try again.';
        showAlert('loginAlert', msg, 'error');
      } finally {
        btn.disabled = false;
        btn.innerHTML = 'Enter CYRUS SHOP';
      }
    };

    window.goToResetPassword = () => {

      document.querySelectorAll('.code-digit').forEach(i => i.value = '');
      document.getElementById('resetCodeTimer').textContent = '—';
      document.getElementById('resetResendRow').style.display = 'none';
      goToStep(3);
    };

    window.sendResetCode = async () => {
      const btn = document.getElementById('sendResetBtn');
      btn.disabled = true;
      btn.innerHTML = '<span class="loading-spinner" style="display:inline-block;"></span> Sending...';

      resetCode = Math.floor(100000 + Math.random() * 900000).toString();
      resetExpiry = Date.now() + 10 * 60 * 1000;

      try {
        await set(ref(db, 'verificationCodes/' + currentEmail.replace(/\./g, '_')), {
          code: resetCode, expiry: resetExpiry, email: currentEmail
        });

        const templateParams = {
          to_email: currentEmail,
          to_name: currentEmail.split('@')[0],
          from_name: 'CYRUS SHOP',
          code: resetCode,
          expiry_time: '10 minutes'
        };
        await emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, templateParams);

        btn.innerHTML = 'Verify Code';
        btn.onclick = () => window.verifyResetCode();
        btn.disabled = false;

        document.getElementById('resetResendRow').style.display = 'block';
        startResetTimer();
      } catch (err) {
        showAlert('resetCodeAlert', 'Failed to send code. Please try again.', 'error');
        btn.disabled = false;
        btn.innerHTML = 'Send Verification Code';
      }
    };

    window.verifyResetCode = async () => {
      const digits = [...document.querySelectorAll('.code-digit')].map(i => i.value).join('');
      if (digits.length < 6) {
        showAlert('resetCodeAlert', 'Please enter the full 6-digit code.', 'error');
        return;
      }

      const btn = document.getElementById('sendResetBtn');
      btn.disabled = true;
      btn.innerHTML = '<span class="loading-spinner" style="display:inline-block;"></span> Verifying...';

      try {
        const snap = await get(ref(db, 'verificationCodes/' + currentEmail.replace(/\./g, '_')));
        if (!snap.exists()) { showAlert('resetCodeAlert', 'Code not found. Please resend.', 'error'); return; }
        const { code, expiry } = snap.val();
        if (Date.now() > expiry) { showAlert('resetCodeAlert', 'Code has expired. Please resend.', 'error'); return; }
        if (digits !== code) { showAlert('resetCodeAlert', 'Incorrect code. Please try again.', 'error'); return; }
        clearInterval(resetTimer);
        goToStep(4);
      } catch (err) {
        showAlert('resetCodeAlert', err.message, 'error');
      } finally {
        btn.disabled = false;
        btn.innerHTML = 'Verify Code';
      }
    };

    function startResetTimer() {
      clearInterval(resetTimer);
      resetTimer = setInterval(() => {
        const remaining = resetExpiry - Date.now();
        if (remaining <= 0) {
          clearInterval(resetTimer);
          document.getElementById('resetCodeTimer').textContent = 'Code expired. Please resend.';
          document.getElementById('resetCodeTimer').style.color = 'var(--error)';
          return;
        }
        const m = Math.floor(remaining / 60000);
        const s = Math.floor((remaining % 60000) / 1000);
        document.getElementById('resetCodeTimer').textContent = `Code expires in ${m}:${s.toString().padStart(2,'0')}`;
      }, 1000);
    }

    window.saveNewPassword = async () => {
      const pw = document.getElementById('newPasswordInput').value;
      const cp = document.getElementById('confirmNewInput').value;
      if (pw.length < 8) { showAlert('newPwAlert', 'Password must be at least 8 characters.', 'error'); return; }
      if (pw !== cp) { showAlert('newPwAlert', 'Passwords do not match.', 'error'); return; }

      const btn = document.getElementById('saveNewPwBtn');
      btn.disabled = true;
      btn.innerHTML = '<span class="loading-spinner" style="display:inline-block;"></span> Saving...';

      try {

        let result;
        try {

          const { sendPasswordResetEmail } = await import("./app-client.js");
          await sendPasswordResetEmail(auth, currentEmail);
          showAlert('newPwSuccess', 'A password reset email has been sent to ' + currentEmail + '. Please check your inbox.', 'success');
        } catch (e) {
          showAlert('newPwAlert', e.message, 'error');
        }
      } finally {
        btn.disabled = false;
        btn.innerHTML = 'Save New Password';
      }
    };

    function goToStep(n) {
      document.querySelectorAll('.step').forEach(s => s.classList.remove('active'));
      document.getElementById('step' + n).classList.add('active');

      document.getElementById('dot4').style.display = n === 4 ? 'block' : 'none';

      const total = n === 4 ? 4 : 3;
      for (let i = 1; i <= 4; i++) {
        const dot = document.getElementById('dot' + i);
        dot.classList.remove('active', 'done');
        if (i < n) dot.classList.add('done');
        else if (i === n) dot.classList.add('active');
      }
    }

    function showAlert(id, msg, type) {
      const el = document.getElementById(id);
      el.textContent = msg;
      el.className = `alert ${type} show`;
      if (type === 'error') setTimeout(() => el.classList.remove('show'), 5000);
    }

    window.moveToNext = (input, idx) => {
      const digits = document.querySelectorAll('.code-digit');
      if (input.value && idx < 5) digits[idx + 1].focus();
    };

    window.togglePw = (id) => {
      const el = document.getElementById(id);
      el.type = el.type === 'password' ? 'text' : 'password';
    };

    window.goToStep = goToStep;
    window.showAlert = showAlert;
  
