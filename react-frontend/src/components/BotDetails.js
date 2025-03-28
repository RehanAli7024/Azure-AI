import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './BotDetails.css';

const BotDetails = ({ bot, onBotUpdated, onBack, onStartChat }) => {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Fetch documents associated with this bot when component mounts or bot changes
  useEffect(() => {
    if (bot) {
      fetchBotDocuments();
    }
  }, [bot]);

  // Function to fetch documents for this bot
  const fetchBotDocuments = async () => {
    if (!bot || !bot.document_ids || bot.document_ids.length === 0) {
      setDocuments([]);
      setLoading(false);
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      // We'll use a simpler approach for now - just showing document IDs
      // In a production app, you'd fetch full document details from the server
      const docs = bot.document_ids.map(id => ({
        id,
        name: `Document ${id.substring(0, 8)}...` // Simplified for now
      }));
      setDocuments(docs);
    } catch (err) {
      console.error('Error fetching bot documents:', err);
      setError('Failed to load documents. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Function to remove a document from this bot
  const handleRemoveDocument = async (documentId) => {
    if (!window.confirm('Are you sure you want to remove this document from the bot?')) {
      return;
    }
    
    try {
      const response = await axios.delete(`http://localhost:5000/api/bots/${bot.id}/documents/${documentId}`);
      
      if (response.data.success) {
        // Update documents list
        setDocuments(documents.filter(doc => doc.id !== documentId));
        
        // Notify parent component of the update
        if (onBotUpdated) {
          onBotUpdated(response.data.bot);
        }
      } else {
        setError(response.data.error || 'Failed to remove document');
      }
    } catch (err) {
      console.error('Error removing document:', err);
      setError('An error occurred while removing the document. Please try again.');
    }
  };

  // If no bot is selected
  if (!bot) {
    return (
      <div className="bot-details-container">
        <div className="no-bot-selected">
          <p>No bot selected</p>
          <p>Please select a bot from the list or create a new one.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bot-details-container">
      <div className="details-header">
        <button className="back-button" onClick={onBack}>
          &larr; Back to List
        </button>
        <h2>{bot.name}</h2>
      </div>
      
      {error && <div className="error-message">{error}</div>}
      
      <div className="bot-info-section">
        <h3>Bot Information</h3>
        <p className="bot-description">
          {bot.description || 'No description provided'}
        </p>
        <p className="bot-metadata">
          <span>Created: {new Date(bot.created_at).toLocaleString()}</span>
        </p>
      </div>
      
      <div className="bot-documents-section">
        <h3>Associated Documents</h3>
        
        {loading ? (
          <div className="loading-spinner">Loading documents...</div>
        ) : documents.length > 0 ? (
          <ul className="document-list">
            {documents.map(doc => (
              <li key={doc.id} className="document-item">
                <span className="document-name">{doc.name}</span>
                <button 
                  className="remove-document-button"
                  onClick={() => handleRemoveDocument(doc.id)}
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <div className="no-documents-message">
            <p>No documents associated with this bot.</p>
            <p>Upload documents to help your bot answer questions.</p>
          </div>
        )}
      </div>
      
      <div className="bot-actions-section">
        <button className="chat-button" onClick={onStartChat}>
          Chat with this Bot
        </button>
      </div>
    </div>
  );
};

export default BotDetails;
