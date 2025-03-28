import React from 'react';
import './Header.css';

const Header = ({ currentLanguage, onLanguageChange }) => {
  const handleLanguageChange = (e) => {
    onLanguageChange(e.target.value);
  };

  return (
    <header className="header">
      <h1>Document Chat Assistant</h1>
      
      <div className="language-selector">
        <label htmlFor="language-select">Language:</label>
        <select 
          id="language-select" 
          value={currentLanguage} 
          onChange={handleLanguageChange}
        >
          <option value="en">English</option>
          <option value="es">Spanish</option>
          <option value="fr">French</option>
          <option value="de">German</option>
          <option value="it">Italian</option>
          <option value="ja">Japanese</option>
          <option value="zh-Hans">Chinese</option>
          <option value="ru">Russian</option>
          <option value="ar">Arabic</option>
          <option value="hi">Hindi</option>
          <option value="ko">Korean</option>
        </select>
      </div>
    </header>
  );
};

export default Header;
