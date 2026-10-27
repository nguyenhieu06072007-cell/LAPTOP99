/* ==========================================================================
   STOREFRONT MVC CONTROLLER: LAPTOP99 AI Chatbot Assistant Controller
   With 3D Robot Mascot Animation, Unread Notifications & Context Awareness
   ========================================================================== */

const ChatbotController = {
  chatState: {
    isOpen: false,
    isInitialized: false,
    messages: [],
    suggestions: [
      'Tư vấn laptop dưới 20 triệu',
      'Laptop học lập trình',
      'So sánh hai sản phẩm',
      'Chính sách bảo hành',
    ],
    isTyping: false,
    currentProduct: null,
    lastFailedPrompt: null,
    unreadCount: 0,
  },

  initChatbot() {
    if (this.chatState.isInitialized) return;
    this.chatState.isInitialized = true;

    // Phục hồi tin nhắn từ sessionStorage nếu có
    try {
      const saved = sessionStorage.getItem('laptop99_ai_chat_history');
      if (saved) {
        this.chatState.messages = JSON.parse(saved);
      }
    } catch (e) {}

    // Lời chào mở đầu chuẩn mực nếu phiên hội thoại mới
    if (!this.chatState.messages || this.chatState.messages.length === 0) {
      this.chatState.messages = [
        {
          sender: 'bot',
          text:
            'Xin chào Quý khách! 👋 Em là **LAPTOP99 AI** — Trợ lý tư vấn bán hàng chính hãng.\n\n' +
            'Em có thể hỗ trợ bạn:\n' +
            '- 🎯 **Tư vấn laptop chuẩn cấu hình** theo ngân sách và ngành học/công việc\n' +
            '- ⚖️ **So sánh trực tiếp 2–3 máy** theo bảng thông số thực tế từ kho\n' +
            '- 📦 **Tra cứu đơn hàng** & chính sách bảo hành S/N, đổi trả 15 ngày\n\n' +
            'Bạn đang quan tâm đến dòng máy hoặc mức giá nào ạ?',
          products: [],
          time: this.formatChatTime(new Date()),
        },
      ];
    }

    this.bindKeyboardEvents();
    this.bindTabVisibility();
  },

  bindTabVisibility() {
    // Tạm dừng chuyển động khi tab bị ẩn để tối ưu hiệu năng & pin
    document.addEventListener('visibilitychange', () => {
      const wrap = document.getElementById('chatbot-trigger-wrap');
      if (!wrap) return;
      if (document.hidden) {
        wrap.classList.add('tab-paused');
      } else {
        wrap.classList.remove('tab-paused');
      }
    });
  },

  bindKeyboardEvents() {
    const input = document.getElementById('chatbot-input');
    if (!input || input.dataset.bound) return;
    input.dataset.bound = 'true';

    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        this.submitChatMessage();
      }
    });

    // Auto-grow textarea
    input.addEventListener('input', () => {
      input.style.height = 'auto';
      input.style.height = Math.min(input.scrollHeight, 100) + 'px';
    });
  },

  formatChatTime(d) {
    const hours = String(d.getHours()).padStart(2, '0');
    const mins = String(d.getMinutes()).padStart(2, '0');
    return `${hours}:${mins}`;
  },

  checkCurrentProductContext() {
    const hash = window.location.hash || '';
    const match = hash.match(/#\/product\/([^/?]+)/);
    const strip = document.getElementById('chatbot-context-strip');
    const stripText = document.getElementById('chatbot-context-text');

    if (match && match[1]) {
      const pid = match[1];
      const allProds = (typeof cache !== 'undefined' && cache.products) || (typeof db !== 'undefined' && db.products) || [];
      const prod = allProds.find((p) => String(p.id) === String(pid) || String(p.rawId) === String(pid));

      if (prod) {
        this.chatState.currentProduct = {
          id: prod.id,
          name: prod.name,
          brand: prod.brand,
          price: prod.price,
        };
        if (strip && stripText) {
          stripText.textContent = `Đang xem: ${prod.name.slice(0, 32)}...`;
          strip.style.display = 'flex';
        }
        return;
      }
    }

    this.chatState.currentProduct = null;
    if (strip) strip.style.display = 'none';
  },

  askAboutCurrentProduct() {
    if (!this.chatState.currentProduct) return;
    const name = this.chatState.currentProduct.name;
    const input = document.getElementById('chatbot-input');
    if (input) {
      input.value = `Tư vấn chi tiết cấu hình và ưu nhược điểm của máy ${name}`;
      this.submitChatMessage();
    }
  },

  showUnreadBadge(count = 1) {
    const badge = document.getElementById('chatbot-unread-badge');
    const countEl = document.getElementById('chatbot-unread-count');
    if (!badge) return;
    this.chatState.unreadCount = count;
    if (countEl) countEl.textContent = String(count);
    badge.style.display = 'inline-flex';
    badge.classList.remove('bounce-once');
    // Force reflow for clean single bounce animation
    void badge.offsetWidth;
    badge.classList.add('bounce-once');
  },

  clearUnreadBadge() {
    this.chatState.unreadCount = 0;
    const badge = document.getElementById('chatbot-unread-badge');
    if (badge) {
      badge.style.display = 'none';
      badge.classList.remove('bounce-once');
    }
  },

  toggleChatbot() {
    this.initChatbot();
    const win = document.getElementById('chatbot-window');
    const btn = document.getElementById('chatbot-trigger-btn');
    if (!win) return;

    this.chatState.isOpen = !this.chatState.isOpen;
    if (this.chatState.isOpen) {
      win.style.display = 'flex';
      win.classList.add('open');
      if (btn) btn.setAttribute('aria-expanded', 'true');
      this.clearUnreadBadge();
      this.checkCurrentProductContext();
      this.renderChatMessages();
      const input = document.getElementById('chatbot-input');
      if (input) setTimeout(() => input.focus(), 150);
    } else {
      win.classList.remove('open');
      win.style.display = 'none';
      if (btn) btn.setAttribute('aria-expanded', 'false');
    }
  },

  resetChatbot() {
    this.chatState.messages = [
      {
        sender: 'bot',
        text: 'Đoạn trò chuyện đã được làm mới! ✨ Em có thể giúp gì cho Quý khách về cấu hình laptop, ngân sách hoặc đơn hàng hôm nay?',
        products: [],
        time: this.formatChatTime(new Date()),
      },
    ];
    this.chatState.suggestions = [
      'Tư vấn laptop dưới 20 triệu',
      'Laptop học lập trình',
      'So sánh hai sản phẩm',
      'Chính sách bảo hành',
    ];
    this.chatState.lastFailedPrompt = null;
    this.clearUnreadBadge();
    try {
      sessionStorage.removeItem('laptop99_ai_chat_history');
    } catch (e) {}
    this.renderChatMessages();
  },

  selectQuickPrompt(promptText) {
    const input = document.getElementById('chatbot-input');
    if (input) {
      input.value = promptText;
      this.submitChatMessage();
    }
  },

  retryLastMessage() {
    if (!this.chatState.lastFailedPrompt) return;
    const input = document.getElementById('chatbot-input');
    if (input) {
      input.value = this.chatState.lastFailedPrompt;
      this.submitChatMessage();
    }
  },

  async submitChatMessage() {
    const input = document.getElementById('chatbot-input');
    if (!input) return;
    const text = input.value.trim();
    if (!text || this.chatState.isTyping) return;

    // Reset height & clear
    input.value = '';
    input.style.height = 'auto';

    this.chatState.lastFailedPrompt = null;

    // 1. Thêm tin nhắn của User
    this.chatState.messages.push({
      sender: 'user',
      text: text,
      products: [],
      time: this.formatChatTime(new Date()),
    });

    this.chatState.isTyping = true;
    this.renderChatMessages();

    // Hiển thị trạng thái đang nhập trong Header & Body
    const typingEl = document.getElementById('chatbot-typing');
    const subEl = document.getElementById('chatbot-header-sub');
    if (typingEl) typingEl.style.display = 'flex';
    if (subEl) {
      subEl.innerHTML = '<span class="chatbot-typing-pulse" aria-hidden="true">●</span> <span style="color:#C5A46D;font-weight:700">Đang trả lời...</span>';
    }
    this.scrollChatBottom(true);

    try {
      // 2. Gửi request lên Backend API với sliding history & context
      const res = await API.post(
        '/ai/chat',
        {
          message: text,
          history: this.chatState.messages.slice(-8).map((m) => ({
            sender: m.sender,
            text: m.text,
          })),
          current_product: this.chatState.currentProduct,
        },
        true,
      );

      if (res && res.success) {
        this.chatState.messages.push({
          sender: 'bot',
          text: res.reply,
          products: res.products || [],
          time: this.formatChatTime(new Date()),
        });
        if (res.suggestions && res.suggestions.length > 0) {
          this.chatState.suggestions = res.suggestions;
        }

        // Nếu khung chat đang đóng, kích hoạt unread badge nhún 1 lần
        if (!this.chatState.isOpen) {
          this.showUnreadBadge(1);
        }
      } else {
        throw new Error(res?.message || 'Không nhận được phản hồi hợp lệ');
      }
    } catch (err) {
      console.warn('[LAPTOP99 AI] API chat warning:', err.message);
      this.chatState.lastFailedPrompt = text;

      this.chatState.messages.push({
        sender: 'bot',
        isError: true,
        text:
          '⚠️ **Đã xảy ra sự cố kết nối máy chủ.**\n\n' +
          'Quý khách vui lòng kiểm tra lại kết nối mạng hoặc thử lại sau giây lát. Em rất xin lỗi vì sự bất tiện này!',
        products: [],
        time: this.formatChatTime(new Date()),
      });
    } finally {
      this.chatState.isTyping = false;
      if (typingEl) typingEl.style.display = 'none';
      if (subEl) {
        subEl.innerHTML = '<span class="chatbot-live-dot" aria-hidden="true"></span> Trực tuyến 24/7 · Dữ liệu kho thật';
      }

      // Lưu lịch sử vào sessionStorage
      try {
        sessionStorage.setItem('laptop99_ai_chat_history', JSON.stringify(this.chatState.messages.slice(-20)));
      } catch (e) {}

      this.renderChatMessages();
    }
  },

  renderChatMessages() {
    const container = document.getElementById('chatbot-messages');
    const quickWrap = document.getElementById('chatbot-quick-wrap');
    if (!container) return;

    let html = '';
    this.chatState.messages.forEach((msg) => {
      const isBot = msg.sender === 'bot';
      const formattedText = this.formatMarkdown(msg.text);

      // Render thẻ sản phẩm tương tác nếu có
      let productsHtml = '';
      if (msg.products && msg.products.length > 0) {
        productsHtml = `
        <div class="chatbot-products-grid">
          ${msg.products
            .map((p) => {
              const inStock = p.in_stock !== false && (p.stock === undefined || p.stock > 0);
              const stockBadge = inStock ? '<span class="pcard-stock in">Còn hàng</span>' : '<span class="pcard-stock out">Tạm hết</span>';
              return `
              <div class="chatbot-pcard">
                <a href="${esc(p.url || `#/product/${p.id}`)}" class="chatbot-pcard-link" onclick="A.toggleChatbot()">
                  <div class="chatbot-pcard-img-wrap">
                    <img src="${esc(p.thumbnail || '/uploads/products/laptop-apple-macbook-air-13-inch-m2-8gb-256gb-1.jpg')}" 
                         alt="${esc(p.name)}" 
                         class="chatbot-pcard-img" 
                         loading="lazy" 
                         onerror="this.src='/uploads/products/laptop-apple-macbook-air-13-inch-m2-8gb-256gb-1.jpg'">
                  </div>
                  <div class="chatbot-pcard-info">
                    <div class="chatbot-pcard-top">
                      <span class="chatbot-pcard-brand">${esc(p.brand || 'LAPTOP')}</span>
                      ${stockBadge}
                    </div>
                    <div class="chatbot-pcard-name" title="${esc(p.name)}">${esc(p.name)}</div>
                    ${p.cpu || p.ram || p.gpu ? `<div class="chatbot-pcard-spec">${esc([p.cpu, p.ram, p.gpu].filter(Boolean).join(' · '))}</div>` : ''}
                    <div class="chatbot-pcard-price">${new Intl.NumberFormat('vi-VN').format(p.price)}₫</div>
                  </div>
                </a>
                <div class="chatbot-pcard-actions">
                  <a href="${esc(p.url || `#/product/${p.id}`)}" class="chatbot-pcard-btn" onclick="A.toggleChatbot()">Xem chi tiết máy →</a>
                </div>
              </div>`;
            })
            .join('')}
        </div>`;
      }

      // Nút thử lại nếu tin nhắn bị lỗi
      let retryHtml = '';
      if (msg.isError && this.chatState.lastFailedPrompt) {
        retryHtml = `
          <div class="chatbot-retry-wrap">
            <button type="button" class="chatbot-retry-btn" onclick="A.retryLastMessage()">🔄 Thử gửi lại</button>
          </div>
        `;
      }

      html += `
      <div class="chatbot-msg ${isBot ? 'bot' : 'user'} ${msg.isError ? 'has-error' : ''}">
        ${
          isBot
            ? `
          <div class="chatbot-mini-avatar" aria-hidden="true" title="LAPTOP99 AI Robot">
            <img src="storefront/assets/chatbot-robot.webp?v=20261028_v1" alt="LAPTOP99 AI" class="chatbot-msg-avatar-img" width="28" height="28">
          </div>
        `
            : ''
        }
        <div class="chatbot-msg-content">
          <div class="chatbot-bubble">
            <div class="chatbot-bubble-text">${formattedText}</div>
            ${productsHtml}
            ${retryHtml}
          </div>
          <span class="chatbot-time">${msg.time || ''}</span>
        </div>
      </div>`;
    });

    container.innerHTML = html;

    // Render các nút gợi ý câu hỏi 1 chạm
    if (quickWrap) {
      if (this.chatState.suggestions && this.chatState.suggestions.length > 0) {
        quickWrap.innerHTML = `
          <div class="chatbot-quick-scroll">
            ${this.chatState.suggestions
              .map(
                (s) => `
              <button type="button" class="chatbot-quick-pill" onclick="A.selectQuickPrompt('${esc(s)}')">${esc(s)}</button>
            `,
              )
              .join('')}
          </div>
        `;
        quickWrap.style.display = 'block';
      } else {
        quickWrap.style.display = 'none';
      }
    }

    this.scrollChatBottom();
  },

  /**
   * Parser Markdown an toàn hỗ trợ Bold, Italic, Lists và Tables so sánh
   */
  formatMarkdown(text) {
    if (!text) return '';

    // An toàn XSS: escape HTML trước khi render
    let out = esc(text);

    // 1. Markdown Tables (| Col1 | Col2 | ...)
    out = out.replace(/((?:\|[^\n]+\|\r?\n)+)/g, (match) => {
      const rows = match.trim().split(/\r?\n/);
      if (rows.length < 2) return match;

      let tableHtml = '<div class="chatbot-table-wrap"><table class="chatbot-table">';
      rows.forEach((row, rowIdx) => {
        // Bỏ qua dòng separator | :--- | :--- |
        if (/^\|[\s\-:]+\|\s*$/.test(row)) return;

        const cols = row
          .split('|')
          .slice(1, -1)
          .map((c) => c.trim());

        if (cols.length === 0) return;

        if (rowIdx === 0) {
          tableHtml += '<thead><tr>' + cols.map((c) => `<th>${c}</th>`).join('') + '</tr></thead><tbody>';
        } else {
          tableHtml += '<tr>' + cols.map((c) => `<td>${c}</td>`).join('') + '</tr>';
        }
      });
      tableHtml += '</tbody></table></div>';
      return tableHtml;
    });

    // 2. Bold **text**
    out = out.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');

    // 3. Italic *text*
    out = out.replace(/\*(.*?)\*/g, '<em>$1</em>');

    // 4. Inline code `code`
    out = out.replace(/`(.*?)`/g, '<code>$1</code>');

    // 5. Bullet points
    out = out.replace(/^• (.*)$/gm, '<li class="chatbot-li">• $1</li>');
    out = out.replace(/^- (.*)$/gm, '<li class="chatbot-li">• $1</li>');

    // 6. Line breaks (giữ format nhưng không làm hỏng thẻ table)
    out = out.replace(/\n(?!(?:<table|<\/table|<thead>|<\/thead|<tbody>|<\/tbody|<tr|<\/tr|<th|<td))/g, '<br>');

    return out;
  },

  /**
   * Tự cuộn hợp lý: Chỉ cuộn nếu người dùng đang ở gần đáy khung chat
   */
  scrollChatBottom(force = false) {
    setTimeout(() => {
      const body = document.getElementById('chatbot-body');
      if (!body) return;

      const distanceFromBottom = body.scrollHeight - body.scrollTop - body.clientHeight;
      if (force || distanceFromBottom < 120) {
        body.scrollTop = body.scrollHeight;
      }
    }, 50);
  },
};
