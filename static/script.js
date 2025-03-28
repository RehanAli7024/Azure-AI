// DOM Elements
const uploadForm = document.getElementById('upload-form');
const documentFile = document.getElementById('document-file');
const fileInfo = document.querySelector('.file-info');
const uploadBtn = document.getElementById('upload-btn');
const uploadStatus = document.getElementById('upload-status');
const documentsList = document.getElementById('documents-list');
const chatForm = document.getElementById('chat-form');
const messageInput = document.getElementById('message-input');
const messagesContainer = document.getElementById('messages');
const sourcesPanel = document.getElementById('sources-panel');
const sourcesList = document.getElementById('sources-list');
const languageSelect = document.getElementById('language-select');

// Store uploaded documents
let uploadedDocuments = [];
// Add variables for translation
let currentLanguage = 'en';
let isTranslating = false;

// Language selection handler
if (languageSelect) {
    languageSelect.addEventListener('change', function() {
        currentLanguage = this.value;
        
        // Add welcome message in the selected language
        if (currentLanguage !== 'en') {
            translateAndAddSystemMessage();
        }
    });
}

// Function to translate welcome message when language changes
async function translateAndAddSystemMessage() {
    try {
        const welcomeMessage = "Hello! I can help answer questions about your documents. What would you like to know?";
        const translatedMessage = await translateText(welcomeMessage, currentLanguage, 'en');
        
        // Add system message about translation
        const translationNotice = document.createElement('div');
        translationNotice.className = 'message bot';
        translationNotice.innerHTML = `
            <div class="message-content">
                I'll now respond in ${languageSelect.options[languageSelect.selectedIndex].text}.
            </div>
        `;
        messagesContainer.appendChild(translationNotice);
        scrollToBottom();
    } catch (error) {
        console.error('Error translating welcome message:', error);
    }
}

// Add translation function
async function translateText(text, targetLang, sourceLang = null) {
    if (targetLang === 'en' || !text) {
        return text;  // No need to translate if target is English or text is empty
    }
    
    try {
        const response = await fetch('/translate', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                text: text,
                to_language: targetLang,
                from_language: sourceLang
            })
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const result = await response.json();
        
        if (result.success) {
            return result.translated_text;
        } else {
            console.error('Translation error:', result.error);
            return text;  // Return original text if translation fails
        }
    } catch (error) {
        console.error('Error calling translation service:', error);
        return text;  // Return original text if translation fails
    }
}

// File input change handler
documentFile.addEventListener('change', () => {
    const file = documentFile.files[0];
    if (file) {
        fileInfo.textContent = file.name;
    } else {
        fileInfo.textContent = 'No file selected';
    }
});

// Upload form submit handler
uploadForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const file = documentFile.files[0];
    if (!file) {
        showUploadStatus('Please select a file to upload', 'error');
        return;
    }
    
    // Create form data
    const formData = new FormData();
    formData.append('file', file);
    
    // Update UI
    uploadBtn.disabled = true;
    uploadBtn.textContent = 'Uploading...';
    showUploadStatus('Uploading document...', 'info');
    
    try {
        const response = await fetch('/upload', {
            method: 'POST',
            body: formData
        });
        
        const result = await response.json();
        
        if (result.success) {
            // Replace the entire array instead of pushing to it
            // This ensures we only track the most recent document
            uploadedDocuments = [{
                id: result.document_id, // Ensure this matches server response
                name: file.name,
                uploadedAt: new Date().toLocaleString(),
                blobName: result.blob_name,
                pageCount: result.page_count || 0
            }];
            
            // Add logging for debugging
            console.log("Document uploaded with ID:", result.document_id);
            updateDocumentsList();
            
            // Reset form
            uploadForm.reset();
            fileInfo.textContent = 'No file selected';
            
            // Show upload status message (potentially translated)
            let statusMessage = `${file.name} uploaded successfully!`;
            if (currentLanguage !== 'en') {
                try {
                    statusMessage = await translateText(statusMessage, currentLanguage, 'en');
                } catch (error) {
                    console.error('Error translating upload status:', error);
                }
            }
            showUploadStatus(statusMessage, 'success');
        } else {
            let errorMessage = result.error || 'Upload failed';
            if (currentLanguage !== 'en') {
                try {
                    errorMessage = await translateText(errorMessage, currentLanguage, 'en');
                } catch (error) {
                    console.error('Error translating error message:', error);
                }
            }
            showUploadStatus(errorMessage, 'error');
        }
    } catch (error) {
        let errorMessage = 'Error uploading document';
        if (currentLanguage !== 'en') {
            try {
                errorMessage = await translateText(errorMessage, currentLanguage, 'en');
            } catch (translationError) {
                console.error('Error translating error message:', translationError);
            }
        }
        showUploadStatus(errorMessage, 'error');
        console.error('Upload error:', error);
    } finally {
        uploadBtn.disabled = false;
        uploadBtn.textContent = 'Upload Document';
    }
});

// Modified chat form submit handler to handle translations and send document IDs
chatForm.addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const message = messageInput.value.trim();
    if (!message) return;
    
    // Add user message to chat in original language
    addMessage(message, true);
    
    // Clear input
    messageInput.value = '';
    
    // Show loading indicator
    const loadingIndicator = document.createElement('div');
    loadingIndicator.className = 'message bot';
    loadingIndicator.innerHTML = `
        <div class="message-content loading-indicator">
            <span></span><span></span><span></span>
        </div>
    `;
    messagesContainer.appendChild(loadingIndicator);
    scrollToBottom();
    
    try {
        // If not English, translate the message to English
        let messageToSend = message;
        if (currentLanguage !== 'en') {
            isTranslating = true;
            messageToSend = await translateText(message, 'en', currentLanguage);
        }
        
        // Log document IDs for debugging
        const documentIds = uploadedDocuments.map(doc => doc.id);
        console.log("Sending chat with document IDs:", documentIds);
        
        // Send the translated message to the chat endpoint along with document IDs
        const response = await fetch('/chat', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ 
                query: messageToSend,
                document_ids: documentIds
            })
        });
        
        const result = await response.json();
        
        // Remove loading indicator
        messagesContainer.removeChild(loadingIndicator);
        
        if (result.success) {
            // If not English, translate the response back to the selected language
            let answerToDisplay = result.answer;
            if (currentLanguage !== 'en') {
                isTranslating = true;
                answerToDisplay = await translateText(result.answer, currentLanguage, 'en');
            }
            
            // Add bot message with translated response
            addMessage(answerToDisplay, false);
            
            // Update sources if available
            if (result.sources && result.sources.length > 0) {
                updateSources(result.sources);
            } else {
                sourcesPanel.style.display = 'none';
            }
        } else {
            const errorMessage = currentLanguage !== 'en' ? 
                await translateText('Sorry, I encountered an error. Please try again.', currentLanguage, 'en') :
                'Sorry, I encountered an error. Please try again.';
            
            addMessage(errorMessage, false);
        }
    } catch (error) {
        // Remove loading indicator
        if (messagesContainer.contains(loadingIndicator)) {
            messagesContainer.removeChild(loadingIndicator);
        }
        
        const networkErrorMsg = currentLanguage !== 'en' ?
            await translateText('Network error. Please check your connection and try again.', currentLanguage, 'en') :
            'Network error. Please check your connection and try again.';
        
        addMessage(networkErrorMsg, false);
        console.error('Chat error:', error);
    } finally {
        isTranslating = false;
    }
});

// Helper Functions
function showUploadStatus(message, type) {
    uploadStatus.textContent = message;
    uploadStatus.className = type;
    uploadStatus.style.display = 'block';
    
    if (type === 'success' || type === 'info') {
        setTimeout(() => {
            uploadStatus.style.display = 'none';
        }, 5000);
    }
}

function updateDocumentsList() {
    documentsList.innerHTML = '';
    
    if (uploadedDocuments.length === 0) {
        documentsList.innerHTML = '<li>No documents uploaded yet</li>';
        return;
    }
    
    uploadedDocuments.forEach(doc => {
        const li = document.createElement('li');
        li.innerHTML = `
            <div class="document-name">${doc.name}</div>
            <div class="document-date">Uploaded: ${doc.uploadedAt}</div>
        `;
        documentsList.appendChild(li);
    });
}

function addMessage(text, isUser) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${isUser ? 'user' : 'bot'}`;
    messageDiv.innerHTML = `<div class="message-content">${text}</div>`;
    messagesContainer.appendChild(messageDiv);
    scrollToBottom();
}

function scrollToBottom() {
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

function updateSources(sources) {
    sourcesList.innerHTML = '';
    
    sources.forEach(source => {
        const li = document.createElement('li');
        li.className = 'source-item';
        li.innerHTML = `
            <div class="source-name">${source.file_name}</div>
            <div class="source-meta">
                ${source.page_count > 0 ? `<span>Pages: ${source.page_count}</span>` : ''}
                <span>Relevance: ${(source.score * 100).toFixed(1)}%</span>
            </div>
        `;
        sourcesList.appendChild(li);
    });
    
    sourcesPanel.style.display = 'block';
}

// Initialize documents list
updateDocumentsList();
