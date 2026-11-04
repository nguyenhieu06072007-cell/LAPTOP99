/* ==========================================================================
   STOREFRONT MVC CONTROLLER: Customer Authentication & Session Controller
   ========================================================================== */

const val = (id) => ($('#' + id) || {}).value || '';

const AuthController = {
  authModal(mode) {
    const title = mode === 'reg' ? 'Đăng ký tài khoản mới' : mode === 'forgot' ? 'Khôi phục mật khẩu tài khoản' : 'Đăng nhập tài khoản';
    const body = mode === 'reg' ? regForm() : mode === 'forgot' ? forgotForm() : loginForm();
    modal(mHead(title) + body, true);
  },

  async requestResetOtp() {
    const ident = val('fg-e').trim();
    if (!ident) return toast('Vui lòng nhập Email hoặc Số điện thoại đã đăng ký', 1);
    const btn = $('#btn-fg-otp');
    if (btn) {
      btn.disabled = true;
      btn.textContent = 'Đang gửi mã xác thực OTP...';
    }
    try {
      const res = await (typeof AuthService !== 'undefined'
        ? AuthService.forgotPassword(ident)
        : API.post('/auth/forgot-password', { identifier: ident }));
      const step2 = $('#fg-step2');
      const hint = $('#fg-otp-hint');
      if (step2) step2.style.display = 'grid';
      if (hint) {
        const d = res.data || {};
        const dest = d.channel === 'sms'
          ? `Số điện thoại <b>${esc(d.masked_phone || ident)}</b> qua tin nhắn SMS`
          : `Hòm thư <b>${esc(d.masked_email || ident)}</b>`;
        hint.innerHTML = `✅ Đã gửi mã xác thực OTP 6 số đến ${dest}.<br><span style="font-size:0.9rem;color:#475569">Vui lòng kiểm tra tin nhắn/hòm thư và nhập mã xác thực OTP bên dưới (hiệu lực 10 phút).</span>`;
      }
      this._resetIdent = ident;
      toast(res.message || 'Đã gửi mã xác thực OTP!');
      if (btn) {
        btn.disabled = false;
        btn.textContent = 'Gửi lại mã OTP mới';
      }
    } catch (err) {
      if (btn) {
        btn.disabled = false;
        btn.textContent = 'Gửi mã xác thực OTP (qua SMS / Email)';
      }
    }
  },

  async confirmResetPassword() {
    const ident = (this._resetIdent || val('fg-e')).trim();
    const otp = val('fg-otp');
    const np = ($('#fg-np') || {}).value || '';
    const cp = ($('#fg-cp') || {}).value || '';
    if (!ident) return toast('Vui lòng nhập Email hoặc Số điện thoại', 1);
    if (!otp || otp.length < 6) return toast('Vui lòng nhập đủ 6 chữ số mã OTP', 1);
    if (np.length < 6) return toast('Mật khẩu mới cần tối thiểu 6 ký tự', 1);
    if (np !== cp) return toast('Mật khẩu xác nhận không trùng khớp', 1);

    const btn = $('#btn-fg-reset');
    if (btn) {
      btn.disabled = true;
      btn.textContent = 'Đang cập nhật mật khẩu...';
    }
    try {
      const res = await API.post('/auth/reset-password', {
        identifier: ident,
        otp,
        new_password: np,
      });
      API.setToken(res.data.token);
      db.session = {
        role: 'customer',
        id: res.data.customer.id,
        name: res.data.customer.name,
        email: res.data.customer.email,
        phone: res.data.customer.phone,
        addr: res.data.customer.address || '',
      };
      save();
      closeModal();
      toast(res.message || 'Đặt lại mật khẩu mới thành công!');
      render();
    } catch (err) {
      if (btn) {
        btn.disabled = false;
        btn.textContent = 'Xác nhận đổi mật khẩu & Đăng nhập';
      }
    }
  },

  async login() {
    const ident = val('lg-e').trim();
    const p = ($('#lg-p') || {}).value || '';
    const errBox = $('#lg-err');
    const errTxt = $('#lg-err-txt');
    const inpE = $('#lg-e');
    const inpP = $('#lg-p');

    const showErr = (msg) => {
      if (errBox && errTxt) {
        errTxt.textContent = msg;
        errBox.style.display = 'flex';
      }
      if (inpE) inpE.classList.add('err');
      if (inpP) inpP.classList.add('err');
      toast(msg, 1);
    };

    if (!ident) {
      showErr('Vui lòng nhập Email hoặc Số điện thoại để đăng nhập.');
      if (inpE) inpE.focus();
      return;
    }
    if (!p) {
      showErr('Vui lòng nhập mật khẩu tài khoản.');
      if (inpP) inpP.focus();
      return;
    }

    if (errBox) errBox.style.display = 'none';
    if (inpE) inpE.classList.remove('err');
    if (inpP) inpP.classList.remove('err');

    const btn = $('#btn-login');
    if (btn) {
      btn.disabled = true;
      btn.textContent = 'Đang xác thực...';
    }
    try {
      const res = await (typeof AuthService !== 'undefined'
        ? AuthService.login(ident, p)
        : API.post('/auth/login', { email: ident, password: p }));
      API.setToken(res.data.token);
      db.session = {
        role: 'customer',
        id: res.data.customer.id,
        name: res.data.customer.name,
        email: res.data.customer.email,
        phone: res.data.customer.phone,
        addr: res.data.customer.address || '',
      };
      save();
      closeModal();
      toast('Đăng nhập thành công');
      render();
    } catch (err) {
      const msg = err.message || 'Tài khoản hoặc mật khẩu không chính xác. Vui lòng kiểm tra lại!';
      showErr(msg);
      if (inpP) {
        inpP.focus();
        try { inpP.select(); } catch (e) {}
      }
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.textContent = 'Đăng nhập';
      }
    }
  },

  async register() {
    const n = val('rg-n').trim();
    const e = val('rg-e').toLowerCase().trim();
    const ph = val('rg-ph').trim();
    const p = ($('#rg-p') || {}).value || '';
    const errBox = $('#rg-err');
    const errTxt = $('#rg-err-txt');

    const showErr = (msg) => {
      if (errBox && errTxt) {
        errTxt.textContent = msg;
        errBox.style.display = 'flex';
      }
      toast(msg, 1);
    };

    if (n.length < 2) return showErr('Vui lòng nhập họ và tên (tối thiểu 2 ký tự)');
    if (!/^\S+@\S+\.\S+$/.test(e)) return showErr('Địa chỉ Email không đúng định dạng');
    if (!/^0\d{9}$/.test(ph)) return showErr('Số điện thoại phải gồm 10 chữ số và bắt đầu bằng số 0');
    if (p.length < 6) return showErr('Mật khẩu cần tối thiểu 6 ký tự');

    if (errBox) errBox.style.display = 'none';

    const btn = $('#btn-reg');
    if (btn) {
      btn.disabled = true;
      btn.textContent = 'Đang tạo tài khoản...';
    }
    try {
      const res = await (typeof AuthService !== 'undefined'
        ? AuthService.register({ name: n, email: e, phone: ph, password: p })
        : API.post('/auth/register', { name: n, email: e, phone: ph, password: p }));
      API.setToken(res.data.token);
      db.session = {
        role: 'customer',
        id: res.data.customer.id,
        name: res.data.customer.name,
        email: res.data.customer.email,
        phone: res.data.customer.phone,
        addr: res.data.customer.address || '',
      };
      save();
      closeModal();
      toast('Tạo tài khoản thành công');
      render();
    } catch (err) {
      showErr(err.message || 'Đăng ký không thành công. Vui lòng thử lại!');
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.textContent = 'Đăng ký tài khoản';
      }
    }
  },

  logout() {
    if (typeof AuthService !== 'undefined') AuthService.logout();
    else API.setToken(null);
    db.session = null;
    save();
    location.hash = '#/';
    toast('Đã đăng xuất tài khoản');
    render();
  },
};
