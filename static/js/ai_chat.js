// AI Chat - Handles the AI chat interaction

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
            } else {
                // Fallback welcome message
                addMessage("👋 Hello! I'm your AI assistant. I can help analyze your data and provide insights. What would you like to know about your files?", false);
                
                // Fallback suggested prompts
                displaySuggestedPrompts([
                    "Suggest charts that fit my files",
                    "Give me a brief analysis"
                ]);
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
        }
    };
});
