/* ==========================================================================
   STOREFRONT MVC VIEW: LAPTOP99 AI Chatbot Assistant Widget
   Ultra-Luxury Palette: Navy (#101D35), Champagne Gold (#C5A46D), Ivory (#F7F6F2)
   Mascot Character: 3D Cute AI Robot Typing on Laptop (Transparent Alpha)
   ========================================================================== */

function renderChatbotWidget() {
  return `
  <!-- LAPTOP99 AI Robot Mascot Floating Trigger -->
  <div class="chatbot-trigger-wrap" id="chatbot-trigger-wrap" role="region" aria-label="Trợ lý ảo LAPTOP99 AI">
    <!-- Hover / Focus Tooltip -->
    <div class="chatbot-tooltip" id="chatbot-tooltip" role="tooltip">
      <div class="chatbot-tooltip-title">Chat với LAPTOP99 AI</div>
      <div class="chatbot-tooltip-sub">Tư vấn cấu hình &amp; báo giá 24/7</div>
    </div>

    <!-- Dấu thông báo tin nhắn mới khi khung chat đang thu nhỏ (Chỉ nhún 1 lần) -->
    <div class="chatbot-unread-badge" id="chatbot-unread-badge" style="display:none" aria-label="Có tin nhắn mới từ LAPTOP99 AI">
      <span class="chatbot-unread-dot" aria-hidden="true"></span>
      <span class="chatbot-unread-count" id="chatbot-unread-count">1</span>
    </div>

    <!-- Nút bấm chính: Robot bấm laptop nền hoàn toàn trong suốt -->
    <button type="button" 
            class="chatbot-robot-btn" 
            id="chatbot-trigger-btn" 
            onclick="A.toggleChatbot()" 
            aria-label="Mở Trợ lý AI Laptop99 - Robot tư vấn bán hàng 24/7" 
            aria-haspopup="dialog"
            aria-expanded="false"
            title="Chat với LAPTOP99 AI">
      
      <!-- Hình tượng Robot AI bấm laptop (Đúng tỉ lệ, không viền tròn cắt đầu/laptop) -->
      <div class="chatbot-robot-figure" id="chatbot-robot-figure">
        <picture class="chatbot-robot-picture">
          <source srcset="storefront/assets/chatbot-robot.webp?v=20261028_v1" type="image/webp">
          <img src="storefront/assets/chatbot-robot.gif?v=20261028_v1" 
               alt="LAPTOP99 AI Robot Mascot đang bấm laptop tư vấn" 
               class="chatbot-robot-img" 
               id="chatbot-robot-img"
               width="88" 
               height="88"
               loading="eager"
               decoding="async">
        </picture>
        <span class="chatbot-robot-glow" aria-hidden="true"></span>
      </div>

      <!-- Nhãn định danh cao cấp bo tròn dưới chân robot -->
      <div class="chatbot-robot-pill">
        <span class="chatbot-status-dot" aria-hidden="true"></span>
        <span class="chatbot-robot-label">LAPTOP99 AI</span>
        <span class="chatbot-robot-badge">24/7</span>
      </div>
    </button>
  </div>

  <!-- LAPTOP99 AI Chatbot Window Modal -->
  <div class="chatbot-window" id="chatbot-window" style="display:none" role="dialog" aria-modal="false" aria-label="Khung trò chuyện LAPTOP99 AI">
    <!-- Header -->
    <div class="chatbot-header">
      <div class="chatbot-header-info">
        <div class="chatbot-avatar-wrap" aria-hidden="true">
          <img src="storefront/assets/chatbot-robot.webp?v=20261028_v1" 
               alt="Avatar LAPTOP99 AI" 
               class="chatbot-header-avatar"
               width="38" 
               height="38">
          <span class="chatbot-header-dot"></span>
        </div>
        <div>
          <div class="chatbot-title">LAPTOP99 AI</div>
          <div class="chatbot-sub" id="chatbot-header-sub">
            <span class="chatbot-live-dot" aria-hidden="true"></span> Trực tuyến 24/7 · Dữ liệu kho thật
          </div>
        </div>
      </div>
      <div class="chatbot-header-actions">
        <button type="button" class="chatbot-header-btn" onclick="A.resetChatbot()" title="Làm mới cuộc trò chuyện" aria-label="Làm mới cuộc trò chuyện">
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
        <div class="chatbot-typing-avatar" aria-hidden="true">
          <img src="storefront/assets/chatbot-robot.webp?v=20261028_v1" alt="AI Typing" width="28" height="28">
        </div>
        <div class="chatbot-typing-bubble">
          <span class="chatbot-typing-dot"></span>
          <span class="chatbot-typing-dot"></span>
          <span class="chatbot-typing-dot"></span>
          <span class="chatbot-typing-label">Đang phân tích dữ liệu kho...</span>
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
