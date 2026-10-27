/* ==========================================================================
   STOREFRONT MVC VIEW: LAPTOP99 AI Chatbot Assistant Widget
   Ultra-Luxury Palette: Navy (#101D35), Champagne Gold (#C5A46D), Ivory (#F7F6F2)
   ========================================================================== */

function renderChatbotWidget() {
  return `
  <!-- LAPTOP99 AI Chatbot Floating Trigger Pill -->
  <div class="chatbot-trigger-wrap" id="chatbot-trigger-wrap">
    <button type="button" class="chatbot-trigger-btn" id="chatbot-trigger-btn" onclick="A.toggleChatbot()" aria-label="Mở Trợ lý AI Laptop99" title="Tư vấn AI Laptop99">
      <span class="chatbot-trigger-icon">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
          <path d="m12 3 1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9L12 3Z"/>
        </svg>
        <span class="chatbot-pulse-dot"></span>
      </span>
      <span class="chatbot-trigger-label">LAPTOP99 AI</span>
      <span class="chatbot-trigger-badge">24/7</span>
    </button>
  </div>

  <!-- LAPTOP99 AI Chatbot Window Modal -->
  <div class="chatbot-window" id="chatbot-window" style="display:none" role="dialog" aria-modal="false" aria-label="Khung trò chuyện LAPTOP99 AI">
    <!-- Header -->
    <div class="chatbot-header">
      <div class="chatbot-header-info">
        <div class="chatbot-avatar-wrap" aria-hidden="true">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#C5A46D" stroke-width="2.2">
            <path d="m12 3 1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9L12 3Z"/>
          </svg>
        </div>
        <div>
          <div class="chatbot-title">LAPTOP99 AI</div>
          <div class="chatbot-sub"><span class="chatbot-live-dot" aria-hidden="true"></span> Trực tuyến 24/7 · Dữ liệu kho thật</div>
        </div>
      </div>
      <div class="chatbot-header-actions">
        <button type="button" class="chatbot-header-btn" onclick="A.resetChatbot()" title="Làm mới đoạn hội thoại" aria-label="Làm mới cuộc trò chuyện">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M3 12a9 9 0 0 1 15.4-6.4L21 8M21 3v5h-5M21 12a9 9 0 0 1-15.4 6.4L3 16M3 21v-5h5"/>
          </svg>
        </button>
        <button type="button" class="chatbot-header-btn" onclick="A.toggleChatbot()" title="Thu nhỏ / Đóng" aria-label="Đóng cửa sổ chat">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
            <path d="M18 6 6 18M6 6l12 12"/>
          </svg>
        </button>
      </div>
    </div>

    <!-- Active Product Context Strip (If customer is viewing a product) -->
    <div class="chatbot-context-strip" id="chatbot-context-strip" style="display:none">
      <span class="context-icon">📌</span>
      <span class="context-text" id="chatbot-context-text">Đang xem: Laptop</span>
      <button type="button" class="context-ask-btn" onclick="A.askAboutCurrentProduct()">Hỏi về máy này</button>
    </div>

    <!-- Messages Container -->
    <div class="chatbot-body" id="chatbot-body" role="log" aria-live="polite">
      <div class="chatbot-messages" id="chatbot-messages">
        <!-- Injected dynamically by ChatbotController -->
      </div>
      <div class="chatbot-typing" id="chatbot-typing" style="display:none" aria-label="LAPTOP99 AI đang phản hồi">
        <div class="chatbot-mini-avatar" aria-hidden="true">✨</div>
        <div class="chatbot-typing-bubble">
          <span></span><span></span><span></span>
        </div>
      </div>
    </div>

    <!-- Quick Prompts Row -->
    <div class="chatbot-quick-wrap" id="chatbot-quick-wrap" aria-label="Gợi ý câu hỏi nhanh">
      <!-- Injected dynamically -->
    </div>

    <!-- Input Form -->
    <form class="chatbot-footer" onsubmit="event.preventDefault(); A.submitChatMessage();">
      <div class="chatbot-input-wrap">
        <textarea id="chatbot-input" class="chatbot-input" rows="1" placeholder="Hỏi LAPTOP99 AI: Tư vấn máy, ngân sách, đơn hàng... (Enter để gửi)" aria-label="Nhập câu hỏi của bạn"></textarea>
      </div>
      <button type="submit" class="chatbot-send-btn" id="chatbot-send-btn" aria-label="Gửi tin nhắn" title="Gửi (Enter)">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
          <line x1="22" y1="2" x2="11" y2="13"></line>
          <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
        </svg>
      </button>
    </form>
    <div class="chatbot-disclaimer">⚡ Dữ liệu chuẩn xác từ kho 100 laptop chính hãng &amp; dịch vụ khách hàng LAPTOP99</div>
  </div>`;
}
