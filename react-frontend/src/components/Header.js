import React from 'react';
import './Header.css';

// Language mapping for better display and correct Azure Translator codes
const LANGUAGES = [
  { code: 'en', name: 'English' },
  { code: 'es', name: 'Spanish' },
  { code: 'fr', name: 'French' },
  { code: 'de', name: 'German' },
  { code: 'it', name: 'Italian' },
  { code: 'ja', name: 'Japanese' },
  { code: 'zh-Hans', name: 'Chinese (Simplified)' },
  { code: 'zh-Hant', name: 'Chinese (Traditional)' },
  { code: 'ru', name: 'Russian' },
  { code: 'ar', name: 'Arabic' },
  { code: 'hi', name: 'Hindi' },
  { code: 'ko', name: 'Korean' },
  { code: 'pt', name: 'Portuguese' },
  { code: 'nl', name: 'Dutch' },
  { code: 'tr', name: 'Turkish' },
  { code: 'pl', name: 'Polish' },
  { code: 'sv', name: 'Swedish' }
];

const Header = ({ selectedLanguage, onLanguageSelect }) => {
  const handleLanguageChange = (e) => {
    onLanguageSelect(e.target.value);
  };

  return (
    <header className="header">
      <h1>Document Chat Assistant</h1>
      
      <div className="language-selector">
        <label htmlFor="language-select">Language:</label>
        <select 
          id="language-select" 
          value={selectedLanguage} 
          onChange={handleLanguageChange}
        >
          {LANGUAGES.map(lang => (
            <option key={lang.code} value={lang.code}>
              {lang.name}
            </option>
          ))}
        </select>
      </div>
    </header>
  );
};

export default Header;
