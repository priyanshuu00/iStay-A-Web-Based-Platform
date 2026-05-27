// ============================================
// iStay Inbox Module
// Handles reading and replying to messages
// ============================================

let currentActiveConversation = null; // {propertyId, partnerId}
let chatPollingInterval = null;

document.addEventListener('DOMContentLoaded', () => {
    if (!Auth.isLoggedIn()) {
        window.location.href = 'login.html';
        return;
    }
    
    updateNavbar();
    loadInbox();
});

async function loadInbox() {
    try {
        const inbox = await API.getInbox();
        const container = document.getElementById('conversationsContainer');
        const user = Auth.getUser();
        
        if (inbox.length === 0) {
            container.innerHTML = `
                <div class="p-4 text-center text-muted">
                    <i class="bi bi-inbox fs-1"></i>
                    <p class="mt-2 mb-0">Your inbox is empty.</p>
                </div>
            `;
            return;
        }

        let html = '';
        inbox.forEach(msg => {
            // Determine who the partner is
            const isSenderMe = msg.senderId === user.userId;
            const partnerId = isSenderMe ? msg.receiverId : msg.senderId;
            const partnerName = isSenderMe ? msg.receiverName : msg.senderName;
            
            // Format time
            const time = new Date(msg.timestamp).toLocaleDateString([], {month: 'short', day: 'numeric', hour: '2-digit', minute:'2-digit'});
            
            // Unread indicator (if I am the receiver and it's not read)
            const isUnread = !msg.isRead && msg.receiverId === user.userId;

            html += `
                <div class="conversation-item" onclick="openChat(${msg.propertyId}, ${partnerId}, '${msg.propertyTitle.replace(/'/g, "\\'")}', '${partnerName.replace(/'/g, "\\'")}')" id="conv-${msg.propertyId}-${partnerId}">
                    <div class="d-flex justify-content-between align-items-center mb-1">
                        <strong class="${isUnread ? 'text-dark' : 'text-secondary'}">${partnerName}</strong>
                        <small class="text-muted" style="font-size: 0.7rem;">${time}</small>
                    </div>
                    <div class="text-truncate" style="font-size: 0.85rem; ${isUnread ? 'font-weight: bold; color: #000;' : 'color: #6c757d;'}">
                        ${isSenderMe ? 'You: ' : ''}${msg.content}
                    </div>
                    <div class="text-primary mt-1" style="font-size: 0.75rem;">
                        <i class="bi bi-house-door me-1"></i>${msg.propertyTitle}
                    </div>
                </div>
            `;
        });

        container.innerHTML = html;
        
    } catch (error) {
        console.error('Failed to load inbox', error);
        document.getElementById('conversationsContainer').innerHTML = `<div class="p-3 text-danger">Failed to load messages.</div>`;
    }
}

function openChat(propertyId, partnerId, propertyTitle, partnerName) {
    currentActiveConversation = { propertyId, partnerId };

    // Update UI
    document.querySelectorAll('.conversation-item').forEach(el => el.classList.remove('active'));
    document.getElementById(`conv-${propertyId}-${partnerId}`).classList.add('active');
    
    document.getElementById('noChatSelected').classList.add('d-none');
    const activeChat = document.getElementById('activeChat');
    activeChat.classList.remove('d-none');
    
    document.getElementById('chatTitle').textContent = propertyTitle;
    document.getElementById('chatPartner').textContent = `Chatting with ${partnerName}`;
    document.getElementById('viewPropertyBtn').href = `property-details.html?id=${propertyId}`;
    
    // Load chat
    loadActiveChatHistory();
    
    // Poll
    if (chatPollingInterval) clearInterval(chatPollingInterval);
    chatPollingInterval = setInterval(loadActiveChatHistory, 3000);
}

async function loadActiveChatHistory() {
    if (!currentActiveConversation) return;

    try {
        const messages = await API.getChatHistory(currentActiveConversation.propertyId, currentActiveConversation.partnerId);
        const chatMessages = document.getElementById('chatMessages');
        const user = Auth.getUser();

        let html = '';
        messages.forEach(msg => {
            const isMine = msg.senderId === user.userId;
            html += `
                <div class="msg-bubble ${isMine ? 'msg-mine' : 'msg-theirs'}">
                    <div>${msg.content}</div>
                    <div class="msg-time">${new Date(msg.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</div>
                </div>
            `;
        });

        const isScrolledToBottom = chatMessages.scrollHeight - chatMessages.clientHeight <= chatMessages.scrollTop + 1;
        chatMessages.innerHTML = html;
        if (isScrolledToBottom || html !== chatMessages.dataset.lastHtml) {
            chatMessages.scrollTop = chatMessages.scrollHeight;
        }
        chatMessages.dataset.lastHtml = html;

    } catch (error) {
        console.error('Failed to load active chat', error);
    }
}

document.getElementById('replyForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!currentActiveConversation) return;

    const input = document.getElementById('replyInput');
    const content = input.value.trim();
    if (!content) return;

    try {
        input.disabled = true;
        await API.sendMessage(currentActiveConversation.partnerId, currentActiveConversation.propertyId, content);
        input.value = '';
        input.disabled = false;
        input.focus();
        loadActiveChatHistory();
        loadInbox(); // refresh sidebar
    } catch (error) {
        input.disabled = false;
        alert('Failed to send message');
    }
});
