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
      <div className="header-brand">
        <div className="header-logo">
          <svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="20" cy="20" r="18" fill="white" fillOpacity="0.2"/>
            <path d="M12 20C12 15.5817 15.5817 12 20 12C24.4183 12 28 15.5817 28 20C28 24.4183 24.4183 28 20 28" stroke="white" strokeWidth="2" strokeLinecap="round"/>
            <path d="M20 22L25 27" stroke="white" strokeWidth="2" strokeLinecap="round"/>
            <path d="M20 18L25 13" stroke="white" strokeWidth="2" strokeLinecap="round"/>
            <circle cx="20" cy="20" r="2" fill="white"/>
          </svg>
        </div>
        <div>
          <h1 className="header-title">SupportLingua AI</h1>
          <p className="header-tagline">Multilingual Customer Support</p>
        </div>
      </div>
      
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
