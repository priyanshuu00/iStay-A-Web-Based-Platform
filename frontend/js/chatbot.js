// ============================================
// iStay AI Chatbot Widget
// Floating assistant for buyer & seller queries
// ============================================

(function () {
    'use strict';

    const CHAT_API = 'http://localhost:8081/api/chat';

    // Conversation history for multi-turn context
    let chatHistory = [];
    let isWaiting = false;

    // ---- Inject HTML ----
    function injectChatbotHTML() {
        const wrapper = document.createElement('div');
        wrapper.id = 'istay-chatbot';
        wrapper.innerHTML = `
            <!-- Floating Toggle -->
            <button class="chatbot-toggle" id="chatbotToggle" title="Chat with iStay AI">
                <i class="bi bi-chat-dots-fill"></i>
            </button>

            <!-- Chat Window -->
            <div class="chatbot-window" id="chatbotWindow">
                <!-- Header -->
                <div class="chatbot-header">
                    <div class="chatbot-avatar">🤖</div>
                    <div class="chatbot-header-info">
                        <h6>iStay Assistant</h6>
                        <span>Always online</span>
                    </div>
                    <button class="chatbot-close" id="chatbotClose" title="Close chat">
                        <i class="bi bi-x-lg"></i>
                    </button>
                </div>

                <!-- Messages -->
                <div class="chatbot-messages" id="chatbotMessages">
                    <!-- Welcome message injected on first open -->
                </div>

                <!-- Quick Chips -->
                <div class="chatbot-chips" id="chatbotChips">
                    <span class="chatbot-chip" data-msg="How do I list a property for sale?">📋 List a property</span>
                    <span class="chatbot-chip" data-msg="How can I find a room to rent?">🔍 Find a room</span>
                    <span class="chatbot-chip" data-msg="What documents do I need to buy a house in India?">📄 Buying docs</span>
                    <span class="chatbot-chip" data-msg="How does the messaging system work on iStay?">💬 Messaging help</span>
                    <span class="chatbot-chip" data-msg="Give me tips for setting a competitive rental price">💰 Pricing tips</span>
                </div>

                <!-- Input -->
                <div class="chatbot-input-area">
                    <textarea class="chatbot-input" id="chatbotInput" placeholder="Ask me anything about properties..." rows="1"></textarea>
                    <button class="chatbot-send" id="chatbotSend" title="Send message">
                        <i class="bi bi-send-fill"></i>
                    </button>
                </div>
            </div>
        `;
        document.body.appendChild(wrapper);
    }

    // ---- Markdown-lite renderer ----
    function renderMarkdown(text) {
        if (!text) return '';
        let html = text
            // Escape HTML
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            // Bold: **text** or __text__
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/__(.*?)__/g, '<strong>$1</strong>')
            // Italic: *text* or _text_
            .replace(/\*(.*?)\*/g, '<em>$1</em>')
            .replace(/(?<!\w)_(.*?)_(?!\w)/g, '<em>$1</em>')
            // Inline code
            .replace(/`(.*?)`/g, '<code>$1</code>')
            // Links: [text](url)
            .replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');

        // Process lines for lists and paragraphs
        const lines = html.split('\n');
        let result = '';
        let inList = false;
        let listType = '';

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();

            // Unordered list item
            if (/^[-*•]\s+(.+)/.test(line)) {
                if (!inList || listType !== 'ul') {
                    if (inList) result += `</${listType}>`;
                    result += '<ul>';
                    inList = true;
                    listType = 'ul';
                }
                result += `<li>${line.replace(/^[-*•]\s+/, '')}</li>`;
            }
            // Ordered list item
            else if (/^\d+[.)]\s+(.+)/.test(line)) {
                if (!inList || listType !== 'ol') {
                    if (inList) result += `</${listType}>`;
                    result += '<ol>';
                    inList = true;
                    listType = 'ol';
                }
                result += `<li>${line.replace(/^\d+[.)]\s+/, '')}</li>`;
            }
            // Regular line
            else {
                if (inList) {
                    result += `</${listType}>`;
                    inList = false;
                    listType = '';
                }
                if (line === '') {
                    // Skip consecutive empty lines
                    if (result && !result.endsWith('</p>') && !result.endsWith('</ul>') && !result.endsWith('</ol>')) {
                        result += '</p><p>';
                    }
                } else {
                    if (!result || result.endsWith('</ul>') || result.endsWith('</ol>')) {
                        result += '<p>';
                    }
                    result += (result.endsWith('<p>') ? '' : ' ') + line;
                }
            }
        }

        if (inList) result += `</${listType}>`;

        // Wrap in paragraph if not already
        if (result && !result.startsWith('<')) {
            result = '<p>' + result;
        }
        if (result && !result.endsWith('>')) {
            result += '</p>';
        }

        // Clean up empty paragraphs
        result = result.replace(/<p>\s*<\/p>/g, '');
        // Fix unclosed p tags
        result = result.replace(/<p>(<[uo]l>)/g, '$1');
        result = result.replace(/(<\/[uo]l>)<\/p>/g, '$1');

        return result;
    }

    // ---- Add message to chat ----
    function addMessage(content, sender) {
        const messagesEl = document.getElementById('chatbotMessages');
        const msgDiv = document.createElement('div');
        msgDiv.className = `chat-msg ${sender}`;

        const iconChar = sender === 'bot' ? '🤖' : '👤';
        const renderedContent = sender === 'bot' ? renderMarkdown(content) : `<p>${content.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')}</p>`;

        msgDiv.innerHTML = `
            <div class="chat-msg-icon">${iconChar}</div>
            <div class="chat-msg-bubble">${renderedContent}</div>
        `;

        messagesEl.appendChild(msgDiv);
        messagesEl.scrollTop = messagesEl.scrollHeight;
    }

    // ---- Typing indicator ----
    function showTyping() {
        const messagesEl = document.getElementById('chatbotMessages');
        const typingDiv = document.createElement('div');
        typingDiv.className = 'chat-typing';
        typingDiv.id = 'chatTyping';
        typingDiv.innerHTML = `
            <div class="chat-msg-icon">🤖</div>
            <div class="chat-msg-bubble">
                <div class="typing-dot"></div>
                <div class="typing-dot"></div>
                <div class="typing-dot"></div>
            </div>
        `;
        messagesEl.appendChild(typingDiv);
        messagesEl.scrollTop = messagesEl.scrollHeight;
    }

    function hideTyping() {
        const el = document.getElementById('chatTyping');
        if (el) el.remove();
    }

    // ---- Send message ----
    async function sendMessage(text) {
        if (!text || !text.trim() || isWaiting) return;

        const message = text.trim();
        isWaiting = true;

        // Hide chips after first message
        const chips = document.getElementById('chatbotChips');
        if (chips) chips.style.display = 'none';

        // Show user message
        addMessage(message, 'user');

        // Clear input
        const input = document.getElementById('chatbotInput');
        input.value = '';
        input.style.height = 'auto';
        updateSendButton();

        // Show typing
        showTyping();

        try {
            const response = await fetch(CHAT_API, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    message: message,
                    history: chatHistory
                })
            });

            const data = await response.json();
            hideTyping();

            const reply = data.reply || "I'm sorry, I couldn't process that. Please try again.";
            addMessage(reply, 'bot');

            // Update history
            chatHistory.push({ role: 'user', content: message });
            chatHistory.push({ role: 'model', content: reply });

            // Keep history manageable (last 10 turns = 20 messages)
            if (chatHistory.length > 20) {
                chatHistory = chatHistory.slice(-20);
            }
        } catch (error) {
            hideTyping();
            addMessage("I'm having trouble connecting to the server. Please make sure the backend is running and try again. 🔄", 'bot');
        }

        isWaiting = false;
    }

    // ---- Auto-resize textarea ----
    function autoResize(el) {
        el.style.height = 'auto';
        el.style.height = Math.min(el.scrollHeight, 80) + 'px';
    }

    // ---- Update send button state ----
    function updateSendButton() {
        const input = document.getElementById('chatbotInput');
        const btn = document.getElementById('chatbotSend');
        if (btn) btn.disabled = !input.value.trim() || isWaiting;
    }

    // ---- Initialize ----
    function init() {
        // Wait for DOM
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', setup);
        } else {
            setup();
        }
    }

    function setup() {
        injectChatbotHTML();

        const toggle = document.getElementById('chatbotToggle');
        const window_ = document.getElementById('chatbotWindow');
        const closeBtn = document.getElementById('chatbotClose');
        const input = document.getElementById('chatbotInput');
        const sendBtn = document.getElementById('chatbotSend');
        const chips = document.querySelectorAll('.chatbot-chip');

        let hasOpened = false;

        // Toggle chat window
        toggle.addEventListener('click', () => {
            const isOpen = window_.classList.contains('open');
            if (isOpen) {
                window_.classList.remove('open');
                toggle.classList.remove('active');
                toggle.innerHTML = '<i class="bi bi-chat-dots-fill"></i>';
            } else {
                window_.classList.add('open');
                toggle.classList.add('active');
                toggle.innerHTML = '<i class="bi bi-x-lg"></i>';

                // Welcome message on first open
                if (!hasOpened) {
                    hasOpened = true;
                    const userName = typeof Auth !== 'undefined' && Auth.isLoggedIn() ? Auth.getUser()?.name : null;
                    const greeting = userName ? `Hi ${userName}! 👋` : 'Hi there! 👋';
                    addMessage(
                        `${greeting} I'm the **iStay Assistant**. I can help you with:\n\n` +
                        `- 🏠 Finding properties (houses, rooms, lands)\n` +
                        `- 📋 Listing your property for sale or rent\n` +
                        `- 💰 Pricing advice and market tips\n` +
                        `- 📄 Documentation and legal guidance\n` +
                        `- 🔧 Using the iStay platform\n\n` +
                        `How can I help you today?`,
                        'bot'
                    );
                }

                // Focus input
                setTimeout(() => input.focus(), 350);
            }
        });

        // Close button
        closeBtn.addEventListener('click', () => {
            window_.classList.remove('open');
            toggle.classList.remove('active');
            toggle.innerHTML = '<i class="bi bi-chat-dots-fill"></i>';
        });

        // Send on button click
        sendBtn.addEventListener('click', () => {
            sendMessage(input.value);
        });

        // Send on Enter (Shift+Enter for new line)
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendMessage(input.value);
            }
        });

        // Auto-resize and button state
        input.addEventListener('input', () => {
            autoResize(input);
            updateSendButton();
        });

        // Quick chips
        chips.forEach(chip => {
            chip.addEventListener('click', () => {
                const msg = chip.getAttribute('data-msg');
                sendMessage(msg);
            });
        });

        // Initial button state
        updateSendButton();
    }

    init();
})();
