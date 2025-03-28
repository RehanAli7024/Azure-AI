import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './BotList.css';

const BotList = ({ onSelectBot, onCreateBot }) => {
  const [bots, setBots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedBotId, setSelectedBotId] = useState(null);

  // Fetch bots when component mounts
  useEffect(() => {
    fetchBots();
  }, []);

  // Function to fetch bots from the API
  const fetchBots = async () => {
    setLoading(true);
    try {
      const response = await axios.get('http://localhost:5000/api/bots');
      if (response.data.success) {
        setBots(response.data.bots);
      } else {
        setError('Error fetching bots: ' + response.data.error);
      }
    } catch (error) {
      console.error('Error fetching bots:', error);
      setError('Failed to fetch bots. Please check your connection.');
    } finally {
      setLoading(false);
    }
  };

  // Handle bot selection
  const handleSelectBot = (botId) => {
    setSelectedBotId(botId);
    // Find the selected bot
    const selectedBot = bots.find(bot => bot.id === botId);
    // Notify parent component
    if (selectedBot && onSelectBot) {
      onSelectBot(selectedBot);
    }
  };

  // Handle bot deletion
  const handleDeleteBot = async (botId, event) => {
    event.stopPropagation(); // Prevent triggering the select bot action
    
    if (!window.confirm('Are you sure you want to delete this bot?')) {
      return;
    }
    
    try {
      const response = await axios.delete(`http://localhost:5000/api/bots/${botId}`);
      if (response.data.success) {
        // Remove bot from the list
        setBots(bots.filter(bot => bot.id !== botId));
        // If the deleted bot was selected, reset selection
        if (selectedBotId === botId) {
          setSelectedBotId(null);
          if (onSelectBot) onSelectBot(null);
        }
      } else {
        setError('Error deleting bot: ' + response.data.error);
      }
    } catch (error) {
      console.error('Error deleting bot:', error);
      setError('Failed to delete bot. Please try again.');
    }
  };

  return (
    <div className="bot-list-container">
      <div className="bot-list-header">
        <h2>Your Bots</h2>
        <button 
          className="create-bot-button"
          onClick={onCreateBot}
        >
          + Create New Bot
        </button>
      </div>
      
      {error && <div className="error-message">{error}</div>}
      
      {loading ? (
        <div className="loading-spinner">Loading bots...</div>
      ) : bots.length > 0 ? (
        <ul className="bot-list">
          {bots.map(bot => (
            <li 
              key={bot.id}
              className={`bot-item ${selectedBotId === bot.id ? 'selected' : ''}`}
              onClick={() => handleSelectBot(bot.id)}
            >
              <div className="bot-info">
                <h3 className="bot-name">{bot.name}</h3>
                <p className="bot-description">{bot.description || 'No description provided'}</p>
                <p className="bot-meta">
                  <span className="document-count">
                    {bot.document_ids.length} document{bot.document_ids.length !== 1 ? 's' : ''}
                  </span>
                  <span className="creation-date">
                    Created: {new Date(bot.created_at).toLocaleDateString()}
                  </span>
                </p>
              </div>
              <div className="bot-actions">
                <button 
                  className="delete-bot-button"
                  onClick={(e) => handleDeleteBot(bot.id, e)}
                >
                  Delete
                </button>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <div className="no-bots-message">
          <p>You don't have any bots yet.</p>
          <p>Create a bot to get started!</p>
        </div>
      )}
    </div>
  );
};

export default BotList;
