/* ==========================================================================
   STOREFRONT MVC CONTROLLER: AI Chatbot Assistant Controller
   ========================================================================== */

const ChatbotController = {
  chatState: {
    isOpen: false,
    isInitialized: false,
    messages: [],
    suggestions: [
      'Laptop sinh viên dưới 15 triệu',
      'MacBook Air làm việc mỏng nhẹ',
      'Laptop gaming RTX 4060 rẻ nhất',
      'Chính sách đổi trả trong 15 ngày',
      'Tra cứu đơn hàng của tôi',
    ],
    isTyping: false,
  },

  initChatbot() {
    if (this.chatState.isInitialized) return;
    this.chatState.isInitialized = true;

    // Load from sessionStorage if exists
    try {
      const saved = sessionStorage.getItem('laptop99_chatbot_msgs');
      if (saved) {
        this.chatState.messages = JSON.parse(saved);
      }
    } catch (e) {}

    // Initial greeting if empty
    if (!this.chatState.messages || this.chatState.messages.length === 0) {
      this.chatState.messages = [
        {
          sender: 'bot',
          text: 'Xin chào Quý khách! 👋 Em là **Trợ lý AI của LAPTOP99**.\n\nEm có thể giúp bạn:\n- 🎯 **Tìm laptop phù hợp** theo ngân sách & nhu cầu (học tập, đồ họa, gaming, văn phòng...)\n- 💰 **So sánh cấu hình & giá khuyến mãi**\n- 📦 **Tra cứu đơn hàng & chính sách bảo hành, đổi trả**\n\nBạn đang quan tâm đến dòng laptop nào ạ?',
          products: [],
          time: this.formatChatTime(new Date()),
        },
      ];
    }
  },

  formatChatTime(d) {
    const hours = String(d.getHours()).padStart(2, '0');
    const mins = String(d.getMinutes()).padStart(2, '0');
    return `${hours}:${mins}`;
  },

  toggleChatbot() {
    this.initChatbot();
    const win = document.getElementById('chatbot-window');
    if (!win) return;

    this.chatState.isOpen = !this.chatState.isOpen;
    if (this.chatState.isOpen) {
      win.style.display = 'flex';
      win.classList.add('open');
      this.renderChatMessages();
      const input = document.getElementById('chatbot-input');
      if (input) setTimeout(() => input.focus(), 150);
    } else {
      win.classList.remove('open');
      win.style.display = 'none';
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
      'Laptop sinh viên dưới 15 triệu',
      'MacBook Air làm việc mỏng nhẹ',
      'Laptop gaming RTX 4060 rẻ nhất',
      'Chính sách đổi trả trong 15 ngày',
      'Tra cứu đơn hàng của tôi',
    ];
    try {
      sessionStorage.removeItem('laptop99_chatbot_msgs');
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

  async submitChatMessage() {
    const input = document.getElementById('chatbot-input');
    if (!input) return;
    const text = input.value.trim();
    if (!text || this.chatState.isTyping) return;

    input.value = '';

    // Add user message
    this.chatState.messages.push({
      sender: 'user',
      text: text,
      products: [],
      time: this.formatChatTime(new Date()),
    });

    this.chatState.isTyping = true;
    this.renderChatMessages();

    // Show typing
    const typingEl = document.getElementById('chatbot-typing');
    if (typingEl) typingEl.style.display = 'flex';
    this.scrollChatBottom();

    try {
      // Call backend API
      let data = null;
      try {
        data = await API.post(
          '/ai/chat',
          {
            message: text,
            history: this.chatState.messages.slice(-6).map((m) => ({ sender: m.sender, text: m.text })),
          },
          true,
        );
      } catch (err) {
        // Fallback to client intelligent search if backend unavailable
        data = this.clientFallbackEngine(text);
      }

      if (data && data.success) {
        this.chatState.messages.push({
          sender: 'bot',
          text: data.reply,
          products: data.products || [],
          time: this.formatChatTime(new Date()),
        });
        if (data.suggestions && data.suggestions.length > 0) {
          this.chatState.suggestions = data.suggestions;
        }
      } else {
        throw new Error('No data');
      }
    } catch (err) {
      const fallback = this.clientFallbackEngine(text);
      this.chatState.messages.push({
        sender: 'bot',
        text: fallback.reply,
        products: fallback.products || [],
        time: this.formatChatTime(new Date()),
      });
      if (fallback.suggestions) this.chatState.suggestions = fallback.suggestions;
    } finally {
      this.chatState.isTyping = false;
      if (typingEl) typingEl.style.display = 'none';
      try {
        sessionStorage.setItem('laptop99_chatbot_msgs', JSON.stringify(this.chatState.messages.slice(-20)));
      } catch (e) {}
      this.renderChatMessages();
    }
  },

  clientFallbackEngine(text) {
    const lower = text.toLowerCase();
    const allProds = (typeof cache !== 'undefined' && cache.products) || (typeof db !== 'undefined' && db.products) || [];

    // Filter by keyword or budget
    let matched = allProds;
    if (lower.includes('15') && (lower.includes('dưới') || lower.includes('<'))) {
      matched = allProds.filter((p) => (Number(p.sale_price) || Number(p.price)) < 15000000);
    } else if (lower.includes('20') && (lower.includes('dưới') || lower.includes('<'))) {
      matched = allProds.filter((p) => (Number(p.sale_price) || Number(p.price)) < 20000000);
    } else if (lower.includes('macbook') || lower.includes('apple')) {
      matched = allProds.filter((p) => (p.brand || '').toLowerCase().includes('apple'));
    } else if (lower.includes('gaming') || lower.includes('game') || lower.includes('rtx')) {
      matched = allProds.filter((p) => p.cat === 2 || (p.gpu || '').toLowerCase().includes('rtx'));
    } else if (lower.includes('sinh viên')) {
      matched = allProds.filter((p) => p.cat === 5 || (Number(p.sale_price) || Number(p.price)) < 18000000);
    }

    const top = (matched.length > 0 ? matched : allProds).slice(0, 3).map((p) => ({
      id: p.id,
      name: p.name,
      brand: p.brand,
      price: Number(p.sale_price) || Number(p.price),
      thumbnail: p.thumbnail,
      cpu: p.cpu || '',
      ram: p.ram ? `${p.ram}GB` : '',
      gpu: p.gpu || '',
    }));

    let reply = `✨ Dựa trên yêu cầu của bạn, em xin gợi ý các dòng laptop bán chạy và phù hợp nhất tại LAPTOP99:\n\n`;
    top.forEach((p, i) => {
      reply += `${i + 1}. **${p.name}**\n   - Giá ưu đãi: **${new Intl.NumberFormat('vi-VN').format(p.price)}₫**\n\n`;
    });
    reply += `*Quý khách bấm vào từng thẻ máy bên dưới để xem cấu hình chi tiết hoặc liên hệ tư vấn viên qua Hotline 1800.6868 nhé!*`;

    return {
      success: true,
      reply,
      products: top,
      suggestions: ['Laptop gaming RTX 4060', 'MacBook Air M2/M3', 'Chính sách đổi trả 15 ngày'],
    };
  },

  renderChatMessages() {
    const container = document.getElementById('chatbot-messages');
    const quickWrap = document.getElementById('chatbot-quick-wrap');
    if (!container) return;

    let html = '';
    this.chatState.messages.forEach((msg) => {
      const isBot = msg.sender === 'bot';
      const formattedText = this.formatMarkdown(msg.text);

      let productsHtml = '';
      if (msg.products && msg.products.length > 0) {
        productsHtml = `
        <div class="chatbot-products-grid">
          ${msg.products
            .map(
              (p) => `
            <div class="chatbot-pcard">
              <a href="#/product/${p.id}" class="chatbot-pcard-link" onclick="A.toggleChatbot()">
                <div class="chatbot-pcard-img-wrap">
                  <img src="${p.thumbnail || '/uploads/products/laptop-apple-macbook-air-13-inch-m2-8gb-256gb-1.jpg'}" alt="${esc(p.name)}" class="chatbot-pcard-img" loading="lazy" onerror="this.src='/uploads/products/laptop-apple-macbook-air-13-inch-m2-8gb-256gb-1.jpg'">
                </div>
                <div class="chatbot-pcard-info">
                  <span class="chatbot-pcard-brand">${esc(p.brand || 'LAPTOP')}</span>
                  <div class="chatbot-pcard-name" title="${esc(p.name)}">${esc(p.name)}</div>
                  ${p.cpu || p.gpu ? `<div class="chatbot-pcard-spec">${esc([p.cpu, p.ram, p.gpu].filter(Boolean).join(' · '))}</div>` : ''}
                  <div class="chatbot-pcard-price">${new Intl.NumberFormat('vi-VN').format(p.price)}₫</div>
                </div>
              </a>
              <div class="chatbot-pcard-actions">
                <a href="#/product/${p.id}" class="chatbot-pcard-btn" onclick="A.toggleChatbot()">Xem máy →</a>
              </div>
            </div>
          `,
            )
            .join('')}
        </div>`;
      }

      html += `
      <div class="chatbot-msg ${isBot ? 'bot' : 'user'}">
        ${
          isBot
            ? `
          <div class="chatbot-mini-avatar" title="Trợ lý AI Laptop99">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#C5A46D" stroke-width="2.2"><path d="m12 3 1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9L12 3Z"/></svg>
          </div>
        `
            : ''
        }
        <div class="chatbot-msg-content">
          <div class="chatbot-bubble">
            <div class="chatbot-bubble-text">${formattedText}</div>
            ${productsHtml}
          </div>
          <span class="chatbot-time">${msg.time || ''}</span>
        </div>
      </div>`;
    });

    container.innerHTML = html;

    // Render quick suggestion pills
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

  formatMarkdown(text) {
    if (!text) return '';
    let out = esc(text);
    // Bold **text**
    out = out.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    // Italic *text*
    out = out.replace(/\*(.*?)\*/g, '<em>$1</em>');
    // Inline code `code`
    out = out.replace(/`(.*?)`/g, '<code>$1</code>');
    // Bullet points
    out = out.replace(/^- (.*)$/gm, '• $1');
    // Line breaks
    out = out.replace(/\n/g, '<br>');
    return out;
  },

  scrollChatBottom() {
    setTimeout(() => {
      const body = document.getElementById('chatbot-body');
      if (body) body.scrollTop = body.scrollHeight;
    }, 50);
  },
};
