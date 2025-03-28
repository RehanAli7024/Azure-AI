import React, { useState } from 'react';
import axios from 'axios';
import './BotCreationForm.css';

const BotCreationForm = ({ onClose, onBotCreated }) => {
  const [formData, setFormData] = useState({
    name: '',
    description: ''
  });
  const [error, setError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Handle form input changes
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate form
    if (!formData.name.trim()) {
      setError('Bot name is required');
      return;
    }
    
    setIsSubmitting(true);
    setError(null);
    
    try {
      const response = await axios.post('http://localhost:5000/api/bots', {
        name: formData.name,
        description: formData.description,
        settings: {} // Default empty settings
      });
      
      if (response.data.success) {
        // Notify parent component of successful creation
        if (onBotCreated) {
          onBotCreated(response.data.bot);
        }
        // Close the form
        if (onClose) {
          onClose();
        }
      } else {
        setError(response.data.error || 'Failed to create bot');
      }
    } catch (error) {
      console.error('Error creating bot:', error);
      setError('An error occurred while creating the bot. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bot-creation-overlay">
      <div className="bot-creation-form">
        <div className="form-header">
          <h2>Create a New Bot</h2>
          <button className="close-button" onClick={onClose}>×</button>
        </div>
        
        {error && <div className="error-message">{error}</div>}
        
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="bot-name">Bot Name *</label>
            <input
              type="text"
              id="bot-name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="Enter a name for your bot"
              disabled={isSubmitting}
              required
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="bot-description">Description</label>
            <textarea
              id="bot-description"
              name="description"
              value={formData.description}
              onChange={handleChange}
              placeholder="What does this bot help with? (optional)"
              disabled={isSubmitting}
              rows={3}
            />
          </div>
          
          <div className="form-actions">
            <button 
              type="button" 
              className="cancel-button"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button 
              type="submit" 
              className="create-button"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Creating...' : 'Create Bot'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default BotCreationForm;
