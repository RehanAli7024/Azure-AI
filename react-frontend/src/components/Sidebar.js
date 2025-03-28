import React, { useState } from 'react';
import axios from 'axios';
import './Sidebar.css';

const Sidebar = ({ uploadedDocuments, onDocumentUpload, currentLanguage }) => {
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploadStatus, setUploadStatus] = useState({ message: '', type: '' });
  const [isUploading, setIsUploading] = useState(false);

  // Handle file selection
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedFile(file);
    } else {
      setSelectedFile(null);
    }
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
        const docItem = {
          id: Date.now(),
          name: selectedFile.name,
          uploadedAt: new Date().toLocaleString(),
          blobName: response.data.blob_name,
          pageCount: response.data.page_count || 0
        };
        
        onDocumentUpload(docItem);
        
        // Reset form
        setSelectedFile(null);
        document.getElementById('document-file').value = '';
        
        // Show translated success message
        let statusMessage = `${selectedFile.name} uploaded successfully!`;
        if (currentLanguage !== 'en') {
          statusMessage = await translateText(statusMessage, currentLanguage);
        }
        showUploadStatus(statusMessage, 'success');
      } else {
        let errorMessage = response.data.error || 'Upload failed';
        if (currentLanguage !== 'en') {
          errorMessage = await translateText(errorMessage, currentLanguage);
        }
        showUploadStatus(errorMessage, 'error');
      }
    } catch (error) {
      let errorMessage = 'Error uploading document';
      if (currentLanguage !== 'en') {
        errorMessage = await translateText(errorMessage, currentLanguage);
      }
      showUploadStatus(errorMessage, 'error');
      console.error('Upload error:', error);
    } finally {
      setIsUploading(false);
    }
  };

  // Show upload status message
  const showUploadStatus = (message, type) => {
    setUploadStatus({ message, type });
    
    if (type === 'success' || type === 'info') {
      setTimeout(() => {
        setUploadStatus({ message: '', type: '' });
      }, 5000);
    }
  };

  return (
    <div className="sidebar">
      <div className="upload-section">
        <h2>Upload Document</h2>
        <form id="upload-form" onSubmit={handleUpload}>
          <div className="file-input-container">
            <input 
              type="file" 
              id="document-file" 
              accept=".pdf,.docx,.txt,.doc"
              onChange={handleFileChange}
            />
            <div className="file-info">
              {selectedFile ? selectedFile.name : 'No file selected'}
            </div>
          </div>
          <button 
            type="submit" 
            id="upload-btn" 
            disabled={isUploading}
          >
            {isUploading ? 'Uploading...' : 'Upload Document'}
          </button>
        </form>
        {uploadStatus.message && (
          <div id="upload-status" className={uploadStatus.type}>
            {uploadStatus.message}
          </div>
        )}
      </div>
      
      <div className="documents-section">
        <h2>Uploaded Documents</h2>
        <ul id="documents-list">
          {uploadedDocuments.length === 0 ? (
            <li>No documents uploaded yet</li>
          ) : (
            uploadedDocuments.map(doc => (
              <li key={doc.id}>
                <div className="document-name">{doc.name}</div>
                <div className="document-date">Uploaded: {doc.uploadedAt}</div>
              </li>
            ))
          )}
        </ul>
      </div>
    </div>
  );
};

export default Sidebar;
