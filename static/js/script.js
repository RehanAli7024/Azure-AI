document.addEventListener('DOMContentLoaded', function() {
    const uploadForm = document.getElementById('upload-form');
    const documentUpload = document.getElementById('document-upload');
    const uploadButton = document.getElementById('upload-button');
    const uploadStatus = document.getElementById('upload-status');
    const chatMessages = document.getElementById('chat-messages');
    const userInput = document.getElementById('user-input');
    const sendButton = document.getElementById('send-button');
    
    // Handle document upload
    uploadForm.addEventListener('submit', function(event) {
        event.preventDefault();
        
        if (!documentUpload.files.length) {
            showUploadStatus('Please select a file first.', 'error');
            return;
        }
        
        const file = documentUpload.files[0];
        const formData = new FormData();
        formData.append('file', file);
        
        // Disable form during upload
        uploadButton.disabled = true;
        showUploadStatus('Uploading and processing document...', 'info');
        
        fetch('/upload', {
            method: 'POST',
            body: formData
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                showUploadStatus(`Document processed successfully!`, 'success');
                
                // Enable chat after successful upload
                userInput.disabled = false;
                sendButton.disabled = false;
                
                // Add system message in chat
                addBotMessage('Document uploaded and processed. You can now ask questions about it!');
            } else {
                showUploadStatus(`Error: ${data.error}`, 'error');
            }
        })
        .catch(error => {
            showUploadStatus(`Error: ${error.message}`, 'error');
        })
        .finally(() => {
            uploadButton.disabled = false;
        });
    });
    
    // Handle chat input
    sendButton.addEventListener('click', sendMessage);
    userInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            sendMessage();
        }
    });
    
    function sendMessage() {
        const message = userInput.value.trim();
        
        if (!message) {
            return;
        }
        
        // Add user message to chat
        addUserMessage(message);
        
        // Clear input
        userInput.value = '';
        
        // Disable input while processing
        userInput.disabled = true;
        sendButton.disabled = true;
        
        // Add typing indicator
        const typingElement = addBotMessage('Thinking...');
        
        // Send message to backend
        fetch('/chat', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ query: message })
        })
        .then(response => response.json())
        .then(data => {
            // Remove typing indicator
            chatMessages.removeChild(typingElement);
            
            if (data.success) {
                // Add bot response
                const botMessage = addBotMessage(data.answer);
                
                // Add sources if available
                if (data.sources && data.sources.length > 0) {
                    const sourcesElement = document.createElement('div');
                    sourcesElement.className = 'sources';
                    sourcesElement.textContent = 'Sources: ' + data.sources.map(
                        source => `${source.file_name}`
                    ).join(', ');
                    botMessage.appendChild(sourcesElement);
                }
            } else {
                addBotMessage(`Sorry, I encountered an error: ${data.error}`);
            }
        })
        .catch(error => {
            // Remove typing indicator
            chatMessages.removeChild(typingElement);
            
            addBotMessage(`Sorry, I encountered an error: ${error.message}`);
        })
        .finally(() => {
            // Re-enable input
            userInput.disabled = false;
            sendButton.disabled = false;
            userInput.focus();
        });
    }
    
    function addUserMessage(text) {
        const messageDiv = document.createElement('div');
        messageDiv.className = 'message user';
        
        const contentDiv = document.createElement('div');
        contentDiv.className = 'message-content';
        contentDiv.textContent = text;
        
        messageDiv.appendChild(contentDiv);
        chatMessages.appendChild(messageDiv);
        
        // Scroll to bottom
        chatMessages.scrollTop = chatMessages.scrollHeight;
        
        return messageDiv;
    }
    
    function addBotMessage(text) {
        const messageDiv = document.createElement('div');
        messageDiv.className = 'message bot';
        
        const contentDiv = document.createElement('div');
        contentDiv.className = 'message-content';
        contentDiv.textContent = text;
        
        messageDiv.appendChild(contentDiv);
        chatMessages.appendChild(messageDiv);
        
        // Scroll to bottom
        chatMessages.scrollTop = chatMessages.scrollHeight;
        
        return contentDiv;
    }
    
    function showUploadStatus(message, type) {
        uploadStatus.textContent = message;
        uploadStatus.className = type;
    }
});
