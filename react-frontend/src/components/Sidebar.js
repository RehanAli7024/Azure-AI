import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './Sidebar.css';

const Sidebar = ({ onDocumentUploaded, documents, selectedLanguage, currentBotId }) => {
  const [selectedFile, setSelectedFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState(null);
  const [uploadedDocuments, setUploadedDocuments] = useState([]);

  // Load initial documents if provided
  useEffect(() => {
    if (documents && documents.length > 0) {
      setUploadedDocuments(documents);
    }
  }, [documents]);

  // Show upload status message
  const showUploadStatus = (message, type = 'info') => {
    setUploadStatus({ message, type });
    // Clear status after 5 seconds
    setTimeout(() => setUploadStatus(null), 5000);
  };

  // Translate text based on current language
  const translateText = async (text, targetLang, sourceLang = 'en') => {
    if (targetLang === 'en' || !text) {
      return text;
    }
    
    try {
      const response = await axios.post('http://localhost:5000/translate', {
        text,
        to_language: targetLang,
        from_language: sourceLang
      });
      
      if (response.data.success) {
        return response.data.translated_text;
      }
      
      return text;
    } catch (error) {
      console.error('Translation error:', error);
      return text;
    }
  };

  // Handle file selection
  const handleFileChange = (e) => {
    if (e.target.files.length > 0) {
      setSelectedFile(e.target.files[0]);
    }
  };

  // Handle document upload
  const handleUpload = async (e) => {
    e.preventDefault();
    
    if (!selectedFile) {
      showUploadStatus('Please select a file to upload', 'error');
      return;
    }
    
    // Create form data
    const formData = new FormData();
    formData.append('file', selectedFile);
    
    // Add bot ID if available
    if (currentBotId) {
      formData.append('bot_id', currentBotId);
    }
    
    // Update UI
    setIsUploading(true);
    showUploadStatus('Uploading document...', 'info');
    
    try {
      const response = await axios.post('http://localhost:5000/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      
      if (response.data.success) {
        // Add document to list
        const newDoc = {
          id: response.data.document_id,
          name: selectedFile.name,
          timestamp: new Date().toLocaleString()
        };
        
        setUploadedDocuments(prev => [...prev, newDoc]);
        setSelectedFile(null);
        
        // Reset file input
        const fileInput = document.getElementById('file-upload');
        if (fileInput) fileInput.value = '';
        
        // Show success message
        const successMessage = await translateText(
          'Document uploaded successfully!',
          selectedLanguage
        );
        
        showUploadStatus(successMessage, 'success');
        
        // Notify parent component
        if (onDocumentUploaded) {
          onDocumentUploaded(newDoc);
        }
      } else {
        // Show error message
        const errorMessage = await translateText(
          `Upload failed: ${response.data.error}`,
          selectedLanguage
        );
        
        showUploadStatus(errorMessage, 'error');
      }
    } catch (error) {
      console.error('Upload error:', error);
      
      // Show error message
      const errorMessage = await translateText(
        'Error uploading document. Please try again.',
        selectedLanguage
      );
      
      showUploadStatus(errorMessage, 'error');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="sidebar">
      <div className="upload-section">
        <h3>
          {selectedLanguage === 'en' ? 'Upload Documents' : (
            selectedLanguage === 'es' ? 'Subir Documentos' : 
            selectedLanguage === 'fr' ? 'Télécharger des Documents' : 
            'Upload Documents'
          )}
        </h3>
        
        <form onSubmit={handleUpload}>
          <div className="file-input-container">
            <input
              type="file"
              id="file-upload"
              onChange={handleFileChange}
              accept=".pdf,.docx,.txt"
              disabled={isUploading}
            />
          </div>
          
          <button 
            type="submit" 
            className="upload-button"
            disabled={!selectedFile || isUploading}
          >
            {isUploading ? (
              selectedLanguage === 'en' ? 'Uploading...' : 
              selectedLanguage === 'es' ? 'Subiendo...' : 
              selectedLanguage === 'fr' ? 'Téléchargement...' : 
              'Uploading...'
            ) : (
              selectedLanguage === 'en' ? 'Upload' : 
              selectedLanguage === 'es' ? 'Subir' : 
              selectedLanguage === 'fr' ? 'Télécharger' : 
              'Upload'
            )}
          </button>
        </form>
        
        {uploadStatus && (
          <div className={`upload-status ${uploadStatus.type}`}>
            {uploadStatus.message}
          </div>
        )}
        
        {currentBotId && (
          <div className="bot-info-notice">
            {selectedLanguage === 'en' ? 'Uploading to selected bot' : 
             selectedLanguage === 'es' ? 'Subiendo al bot seleccionado' :
             selectedLanguage === 'fr' ? 'Téléchargement vers le bot sélectionné' :
             'Uploading to selected bot'}
          </div>
        )}
      </div>
      
      <div className="documents-section">
        <h3>
          {selectedLanguage === 'en' ? 'Uploaded Documents' : 
           selectedLanguage === 'es' ? 'Documentos Subidos' : 
           selectedLanguage === 'fr' ? 'Documents Téléchargés' : 
           'Uploaded Documents'}
        </h3>
        
        {uploadedDocuments.length > 0 ? (
          <ul className="documents-list">
            {uploadedDocuments.map((doc, index) => (
              <li key={doc.id || index} className="document-item">
                <div className="document-icon">📄</div>
                <div className="document-info">
                  <div className="document-name">{doc.name}</div>
                  <div className="document-timestamp">{doc.timestamp}</div>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <div className="no-documents">
            {selectedLanguage === 'en' ? 'No documents uploaded yet' : 
             selectedLanguage === 'es' ? 'Aún no se han subido documentos' : 
             selectedLanguage === 'fr' ? 'Aucun document téléchargé pour le moment' : 
             'No documents uploaded yet'}
          </div>
        )}
      </div>
    </div>
  );
};

export default Sidebar;
