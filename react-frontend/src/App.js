import React, { useState } from 'react';
import './App.css';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import ChatSection from './components/ChatSection';
import Footer from './components/Footer';

function App() {
  const [uploadedDocuments, setUploadedDocuments] = useState([]);
  const [currentLanguage, setCurrentLanguage] = useState('en');
  
  // Handle document upload
  const handleDocumentUpload = (docItem) => {
    setUploadedDocuments(prevDocs => [...prevDocs, docItem]);
  };

  // Handle language change
  const handleLanguageChange = (language) => {
    setCurrentLanguage(language);
  };

  return (
    <div className="app">
      <Header 
        currentLanguage={currentLanguage} 
        onLanguageChange={handleLanguageChange} 
      />
      
      <main>
        <div className="container">
          <Sidebar 
            uploadedDocuments={uploadedDocuments} 
            onDocumentUpload={handleDocumentUpload} 
            currentLanguage={currentLanguage}
          />
          
          <ChatSection 
            currentLanguage={currentLanguage} 
          />
        </div>
      </main>
      
      <Footer />
    </div>
  );
}

export default App;
