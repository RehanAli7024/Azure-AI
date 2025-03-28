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

  // Get upload section title based on language
  const getUploadSectionTitle = () => {
    switch (selectedLanguage) {
      case 'es': return 'Subir Documentos';
      case 'fr': return 'Télécharger des Documents';
      case 'de': return 'Dokumente Hochladen';
      case 'it': return 'Carica Documenti';
      case 'ja': return '文書をアップロード';
      case 'zh-Hans': return '上传文档';
      case 'ru': return 'Загрузить Документы';
      default: return 'Upload Documents';
    }
  };

  // Get documents section title based on language
  const getDocumentsSectionTitle = () => {
    switch (selectedLanguage) {
      case 'es': return 'Documentos Subidos';
      case 'fr': return 'Documents Téléchargés';
      case 'de': return 'Hochgeladene Dokumente';
      case 'it': return 'Documenti Caricati';
      case 'ja': return 'アップロードされた文書';
      case 'zh-Hans': return '上传的文档';
      case 'ru': return 'Загруженные Документы';
      default: return 'Uploaded Documents';
    }
  };

  // Get upload button text based on language and state
  const getUploadButtonText = () => {
    if (isUploading) {
      switch (selectedLanguage) {
        case 'es': return 'Subiendo...';
        case 'fr': return 'Téléchargement...';
        case 'de': return 'Hochladen...';
        case 'it': return 'Caricamento...';
        case 'ja': return 'アップロード中...';
        case 'zh-Hans': return '上传中...';
        case 'ru': return 'Загрузка...';
        default: return 'Uploading...';
      }
    } else {
      switch (selectedLanguage) {
        case 'es': return 'Subir';
        case 'fr': return 'Télécharger';
        case 'de': return 'Hochladen';
        case 'it': return 'Carica';
        case 'ja': return 'アップロード';
        case 'zh-Hans': return '上传';
        case 'ru': return 'Загрузить';
        default: return 'Upload';
      }
    }
  };

  // Render documents list
  const renderDocuments = () => {
    if (uploadedDocuments.length === 0) {
      return (
        <div className="empty-documents">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M14 2H6C4.89543 2 4 2.89543 4 4V20C4 21.1046 4.89543 22 6 22H18C19.1046 22 20 21.1046 20 20V8L14 2Z" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M14 2V8H20" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M12 18V12" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M9 15H15" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <p>{selectedLanguage === 'en' ? 'No documents uploaded yet' : 
             selectedLanguage === 'es' ? 'Aún no se han subido documentos' : 
             selectedLanguage === 'fr' ? 'Aucun document téléchargé pour le moment' : 
             selectedLanguage === 'de' ? 'Noch keine Dokumente hochgeladen' : 
             selectedLanguage === 'it' ? 'Nessun documento caricato' : 
             selectedLanguage === 'ja' ? 'まだ文書がアップロードされていません' : 
             selectedLanguage === 'zh-Hans' ? '尚未上传文档' : 
             selectedLanguage === 'ru' ? 'Документы еще не загружены' : 
             'No documents uploaded yet'}</p>
        </div>
      );
    }

    return (
      <div className="document-list">
        {uploadedDocuments.map(doc => (
          <div key={doc.id} className="document-item">
            <div className="document-name">{doc.name}</div>
            <div className="document-timestamp">{doc.timestamp}</div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="sidebar">
      <div className="upload-section">
        <h3>{getUploadSectionTitle()}</h3>
        
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
            {getUploadButtonText()}
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
             selectedLanguage === 'de' ? 'Hochladen an den ausgewählten Bot' :
             selectedLanguage === 'it' ? 'Caricamento sul bot selezionato' :
             selectedLanguage === 'ja' ? '選択したボットにアップロード' :
             selectedLanguage === 'zh-Hans' ? '上传到选定的机器人' :
             selectedLanguage === 'ru' ? 'Загрузка в выбранного бота' :
             'Uploading to selected bot'}
          </div>
        )}
      </div>
      
      <div className="documents-section">
        <h3>{getDocumentsSectionTitle()}</h3>
        {renderDocuments()}
      </div>
    </div>
  );
};

export default Sidebar;
