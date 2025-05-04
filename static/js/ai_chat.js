// AI Chat - Handles the AI chat interaction

// Create a global namespace for AI Chat functions
window.AIChat = {};

document.addEventListener('DOMContentLoaded', function() {
    // DOM elements
    const chatMessages = document.getElementById('chatMessages');
    const chatInput = document.getElementById('chatInput');
    const sendMessageBtn = document.getElementById('sendMessageBtn');
    const suggestedPrompts = document.getElementById('suggestedPrompts');
    
    // State
    let currentConversationId = null;
    
    // Initialize chat
    initChat();
    
    // Expose functions to global namespace
    // Don't expose individual functions, we'll expose the whole object at the end
    
    // Main functions
    function initChat() {
        // Add event listeners
        chatInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                sendMessage();
            }
        });
        
        sendMessageBtn.addEventListener('click', sendMessage);
        
        // Load welcome message
        loadWelcomeMessage();
    }
    
    // Load welcome message and suggested prompts
    async function loadWelcomeMessage() {
        try {
            const response = await fetch('/api/welcome-message');
            const data = await response.json();
            
            if (data.success) {
                // Add welcome message
                addMessage(data.welcome_message, false);
                
                // Add suggested prompts
                if (data.suggested_prompts && data.suggested_prompts.length > 0) {
                    displaySuggestedPrompts(data.suggested_prompts);
                }
                
                // Add help text if available
                // Help text removed as requested
            } else {
                // Fallback welcome message
                addMessage("👋 Hello! I'm your AI assistant. I can help analyze your data and provide insights. What would you like to know about your files?", false);
                
                // Fallback suggested prompts
                displaySuggestedPrompts([
                    "Suggest charts that fit my files",
                    "Give me a brief analysis"
                ]);
                
                // Fallback help text removed as requested
            }
        } catch (error) {
            console.error('Error loading welcome message:', error);
            
            // Fallback welcome message
            addMessage("👋 Hello! I'm your AI assistant. I can help analyze your data and provide insights. What would you like to know about your files?", false);
            
            // Fallback suggested prompts
            displaySuggestedPrompts([
                "Suggest charts that fit my files",
                "Give me a brief analysis"
            ]);
        }
    }
    
    // Display suggested prompts
    function displaySuggestedPrompts(prompts) {
        suggestedPrompts.innerHTML = '';
        
        prompts.forEach(prompt => {
            const promptButton = document.createElement('button');
            promptButton.className = 'suggested-prompt';
            promptButton.textContent = prompt;
            
            promptButton.addEventListener('click', function() {
                // Set input value to this prompt
                chatInput.value = prompt;
                
                // Send the message
                sendMessage();
            });
            
            suggestedPrompts.appendChild(promptButton);
        });
    }
    
    // Send message to AI
    async function sendMessage() {
        const message = chatInput.value.trim();
        
        if (!message) return;
        
        // Add user message to chat
        addMessage(message, true);
        
        // Clear input
        chatInput.value = '';
        
        // Hide suggested prompts after first message
        suggestedPrompts.style.display = 'none';
        
        // Add loading indicator
        const loadingId = addLoadingMessage();
        
        try {
            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    message: message,
                    conversation_id: currentConversationId
                }),
            });
            
            const data = await response.json();
            
            // Remove loading indicator
            removeLoadingMessage(loadingId);
            
            if (data.success) {
                // Store conversation ID
                currentConversationId = data.conversation_id;
                
                // Add AI response
                addMessage(data.response, false);
                
                // Show new suggested prompts if available
                if (data.suggested_prompts && data.suggested_prompts.length > 0) {
                    suggestedPrompts.style.display = 'flex';
                    displaySuggestedPrompts(data.suggested_prompts);
                }
            } else {
                addMessage("I'm sorry, I encountered an error processing your request. Please try again.", false);
            }
        } catch (error) {
            console.error('Error sending message:', error);
            
            // Remove loading indicator
            removeLoadingMessage(loadingId);
            
            // Add error message
            addMessage("I'm sorry, there was a network error. Please check your connection and try again.", false);
        }
    }
    
    // Add message to chat
    function addMessage(content, isUser) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `chat-message ${isUser ? 'user' : 'ai'}`;
        
        // Format content with markdown-like syntax
        const formattedContent = formatMessageContent(content);
        
        messageDiv.innerHTML = `
            <div class="message-content">${formattedContent}</div>
            <div class="message-time">${getCurrentTime()}</div>
        `;
        
        chatMessages.appendChild(messageDiv);
        
        // Scroll to bottom
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }
    
    // Add loading message
    function addLoadingMessage() {
        const loadingId = 'loading-' + Date.now();
        const loadingDiv = document.createElement('div');
        loadingDiv.className = 'chat-message ai';
        loadingDiv.id = loadingId;
        
        loadingDiv.innerHTML = `
            <div class="message-content">
                <div class="loading-indicator">
                    <span class="dot"></span>
                    <span class="dot"></span>
                    <span class="dot"></span>
                </div>
            </div>
        `;
        
        chatMessages.appendChild(loadingDiv);
        
        // Scroll to bottom
        chatMessages.scrollTop = chatMessages.scrollHeight;
        
        return loadingId;
    }
    
    // Remove loading message
    function removeLoadingMessage(loadingId) {
        const loadingDiv = document.getElementById(loadingId);
        if (loadingDiv) {
            loadingDiv.remove();
        }
    }
    
    // Format message content with basic markdown-like syntax
    function formatMessageContent(content) {
        // Replace URLs with links
        content = content.replace(
            /(https?:\/\/[^\s]+)/g, 
            '<a href="$1" target="_blank" rel="noopener noreferrer">$1</a>'
        );
        
        // Replace **bold** with <strong>
        content = content.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        
        // Replace *italic* with <em>
        content = content.replace(/\*(.*?)\*/g, '<em>$1</em>');
        
        // Replace newlines with <br>
        content = content.replace(/\n/g, '<br>');
        
        // Format lists
        const lines = content.split('<br>');
        let inList = false;
        let formattedLines = [];
        
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            
            // Bullet points
            if (line.trim().startsWith('• ')) {
                if (!inList) {
                    formattedLines.push('<ul>');
                    inList = true;
                }
                formattedLines.push('<li>' + line.trim().substring(2) + '</li>');
            } 
            // Numbered lists
            else if (/^\d+\.\s/.test(line.trim())) {
                if (!inList) {
                    formattedLines.push('<ol>');
                    inList = true;
                }
                formattedLines.push('<li>' + line.trim().replace(/^\d+\.\s/, '') + '</li>');
            } 
            // End list if needed
            else {
                if (inList) {
                    formattedLines.push(line.trim().startsWith('-') ? '<ul>' : '</ul>');
                    inList = false;
                }
                formattedLines.push(line);
            }
        }
        
        // Close any open list
        if (inList) {
            formattedLines.push('</ul>');
        }
        
        return formattedLines.join('<br>');
    }
    
    // Get current time
    function getCurrentTime() {
        const now = new Date();
        return now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    
    // Load past conversations
    async function loadConversations() {
        const conversationsList = document.getElementById('conversationsList');
        if (!conversationsList) return;
        
        conversationsList.innerHTML = '<div class="loading"><i class="fas fa-spinner fa-spin"></i> Loading conversations...</div>';
        
        try {
            const response = await fetch('/api/conversations');
            const data = await response.json();
            
            if (data.success && data.conversations) {
                displayConversations(data.conversations);
            } else {
                conversationsList.innerHTML = '<div class="empty-state">No conversations found</div>';
            }
        } catch (error) {
            console.error('Error loading conversations:', error);
            conversationsList.innerHTML = '<div class="error-state">Error loading conversations</div>';
        }
    }
    
    // Display conversations
    function displayConversations(conversations) {
        const conversationsList = document.getElementById('conversationsList');
        conversationsList.innerHTML = '';
        
        if (conversations.length === 0) {
            conversationsList.innerHTML = '<div class="empty-state">No conversations found</div>';
            return;
        }
        
        conversations.forEach(conversation => {
            const conv = document.createElement('div');
            conv.className = 'conversation-item';
            
            // Use title or the first few words of the first message
            const title = conversation.title || 
                (conversation.messages && conversation.messages.length > 0 ? 
                conversation.messages[0].content.substring(0, 30) + '...' : 
                'Conversation ' + conversation.id);
            
            conv.innerHTML = `
                <div class="conversation-header">
                    <div class="conversation-title">${title}</div>
                    <div class="conversation-date">${new Date(conversation.created_at).toLocaleDateString()}</div>
                </div>
                <div class="conversation-preview">
                    ${conversation.messages && conversation.messages.length > 0 ? 
                    `${conversation.messages.length} message${conversation.messages.length !== 1 ? 's' : ''}` : 
                    'No messages'}
                </div>
                <div class="conversation-actions">
                    <button class="view-conversation-btn" data-id="${conversation.id}">
                        <i class="fas fa-eye"></i> View
                    </button>
                    <button class="delete-conversation-btn" data-id="${conversation.id}">
                        <i class="fas fa-trash"></i> Delete
                    </button>
                </div>
            `;
            
            conversationsList.appendChild(conv);
            
            // Add event listeners
            conv.querySelector('.view-conversation-btn').addEventListener('click', () => {
                viewConversation(conversation.id);
            });
            
            conv.querySelector('.delete-conversation-btn').addEventListener('click', () => {
                deleteConversation(conversation.id, conv);
            });
        });
    }
    
    // View conversation
    async function viewConversation(conversationId) {
        try {
            const response = await fetch(`/api/conversations/${conversationId}`);
            const data = await response.json();
            
            if (data.success && data.conversation) {
                // Clear current chat
                chatMessages.innerHTML = '';
                
                // Set current conversation
                currentConversationId = conversationId;
                
                // Display messages
                if (data.conversation.messages && data.conversation.messages.length > 0) {
                    data.conversation.messages.forEach(message => {
                        addMessage(message.content, message.is_user);
                    });
                }
                
                // Show chat section
                showSection('dashboard');
                document.getElementById('aiChatSection').scrollIntoView({ behavior: 'smooth' });
            } else {
                alert('Error loading conversation: ' + (data.error || 'Unknown error'));
            }
        } catch (error) {
            console.error('Error viewing conversation:', error);
            alert('Network error occurred');
        }
    }
    
    // Delete conversation
    async function deleteConversation(conversationId, convElement) {
        if (!confirm('Are you sure you want to delete this conversation?')) {
            return;
        }
        
        try {
            const response = await fetch(`/api/conversations/${conversationId}`, {
                method: 'DELETE'
            });
            
            const data = await response.json();
            
            if (data.success) {
                convElement.remove();
                
                // If we deleted the current conversation, reset
                if (currentConversationId === conversationId) {
                    currentConversationId = null;
                    chatMessages.innerHTML = '';
                    loadWelcomeMessage();
                }
            } else {
                alert('Error deleting conversation: ' + (data.error || 'Unknown error'));
            }
        } catch (error) {
            console.error('Error deleting conversation:', error);
            alert('Network error occurred');
        }
    }
    
    // Show a specific section (helper function)
    function showSection(sectionName) {
        if (window.showSection) {
            window.showSection(sectionName);
        }
    }
    
    // Public methods
    window.AIChat = {
        // Add a message programmatically
        addMessage: function(content, isUser) {
            addMessage(content, isUser);
        },
        
        // Send a specific prompt programmatically
        sendPrompt: function(prompt) {
            chatInput.value = prompt;
            sendMessage();
        },
        
        // Load conversations
        loadConversations: loadConversations,
        
        // Reset chat to initial state
        resetChat: function() {
            // Clear existing messages
            chatMessages.innerHTML = '';
            
            // Reset conversation ID
            currentConversationId = null;
            
            // Load welcome message again
            loadWelcomeMessage();
            
            // Clear input
            chatInput.value = '';
            
            // Show suggested prompts
            suggestedPrompts.style.display = 'flex';
        },
        
        // Save the current conversation before starting a new one
        saveCurrentConversation: async function() {
            // Check if there are any messages to save
            if (!chatMessages.children.length || chatMessages.children.length < 2) {
                console.log('No conversation to save or only welcome message present');
                return;
            }
            
            try {
                // If we have a conversation ID, it's already saved
                if (currentConversationId) {
                    console.log('Conversation already saved with ID:', currentConversationId);
                    return true;
                }
                
                // Create a new conversation with the current messages
                const messages = [];
                const messageElements = chatMessages.querySelectorAll('.chat-message');
                
                // Skip first message if it's the welcome message
                const startIndex = messageElements[0].classList.contains('ai-message') ? 1 : 0;
                
                // Need at least one user message to save
                let hasUserMessage = false;
                for (let i = startIndex; i < messageElements.length; i++) {
                    const isUser = messageElements[i].classList.contains('user-message');
                    if (isUser) hasUserMessage = true;
                    const content = messageElements[i].querySelector('.message-content').textContent;
                    messages.push({ is_user: isUser, content: content });
                }
                
                if (!hasUserMessage) {
                    console.log('No user messages to save');
                    return false;
                }
                
                // Create a default title based on first user message
                const firstUserMsg = messages.find(m => m.is_user);
                const title = firstUserMsg ? 
                    (firstUserMsg.content.substring(0, 30) + (firstUserMsg.content.length > 30 ? '...' : '')) : 
                    'Conversation ' + new Date().toLocaleString();
                
                // Send request to create conversation
                const response = await fetch('/api/conversations', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        title: title,
                        messages: messages
                    })
                });
                
                const data = await response.json();
                if (data.success) {
                    console.log('Conversation saved successfully:', data.conversation_id);
                    // Set the current conversation ID so we don't try to save it again
                    currentConversationId = data.conversation_id;
                    
                    // Reload the conversations list to show the new conversation
                    if (typeof loadConversations === 'function') {
                        loadConversations();
                    }
                    return true;
                } else {
                    console.error('Error saving conversation:', data.error);
                    return false;
                }
            } catch (error) {
                console.error('Error saving conversation:', error);
                return false;
            }
        }
    };
});
