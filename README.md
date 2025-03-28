# 🌐 SupportLingua AI

<p align="center">
  <br>
  <em>Breaking language barriers in customer support, one conversation at a time</em>
</p>

<p align="center">
  <a href="#-key-features">Features</a> •
  <a href="#tech-stack">Tech Stack</a> •
  <a href="#architecture">Architecture</a> •
  <a href="#-getting-started">Getting Started</a> •
  <a href="#-demo">Demo</a> •
  <a href="#-roadmap">Roadmap</a>
</p>

## 🌟 Overview

SupportLingua AI is a revolutionary multilingual customer support platform that combines the power of Azure OpenAI, document intelligence, and translation services to provide seamless, context-aware support across language barriers. Our solution enables organizations to leverage their existing knowledge base while delivering exceptional customer experiences in multiple languages.

## ✨ Key Features

- **Multilingual Support** - Communicate with customers in 17+ languages with automatic translation
- **Document Intelligence** - Extract, process, and index knowledge from various document formats
- **Context-Aware Responses** - Remember conversation history for natural, coherent interactions
- **Retrieval-Augmented Generation (RAG)** - Provide accurate responses based on your knowledge base
- **Elegant UI/UX** - Modern, responsive interface that works on any device
- **Secure Architecture** - Built with industry best practices for data security

## 🛠️ Tech Stack

### Backend
- **Azure OpenAI** - Powers the intelligent conversation capabilities
- **Azure Translator** - Enables seamless multilingual support
- **Azure Document Intelligence** - Processes and extracts text from documents
- **Flask** - Provides the API layer connecting all services
- **Vector Database** - Stores embeddings for efficient knowledge retrieval

### Frontend
- **React** - Creates a responsive, dynamic user interface
- **CSS3** - Custom styling with variables for consistent branding

## 🏗️ Architecture

SupportLingua AI follows a modular architecture with four core components:

1. **Document Processing Pipeline**
   - Uploads, extracts text, and indexes support documents
   - Creates vector embeddings for efficient retrieval

2. **RAG System**
   - Finds relevant information from indexed documents
   - Generates accurate, context-specific responses 

3. **Translation Layer**
   - Detects language and translates inputs/outputs
   - Preserves context across language transitions

4. **API Layer**
   - Connects all components through a secure REST API
   - Manages conversation state and authentication

## 🚀 Getting Started

### Prerequisites
- Node.js (v14+)
- Python (v3.8+)
- Azure account with OpenAI, Translator, and Document Intelligence services

### Backend Setup
```bash
# Clone the repository
git clone https://github.com/RehanAli7024/Azure-AI.git

# Set up Python virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Set up environment variables
cp .env.example .env
# Edit .env with your Azure API keys

# Start the backend server
python app.py
```

### Frontend Setup
```bash
# Navigate to the frontend directory
cd react-frontend

# Install dependencies
npm install

# Start the development server
npm start
```

## 🎮 Demo

Access the application at `http://localhost:3000` after starting both the backend and frontend.

1. **Select your language** from the dropdown in the header
2. **Upload support documents** using the sidebar
3. **Start chatting** with SupportLingua AI
4. **Watch as it responds** in your selected language with information from your documents

## 🔮 Roadmap

- **Voice Support** - Add speech-to-text and text-to-speech capabilities
- **Custom Training** - Allow fine-tuning of the model for specific industries
- **Analytics Dashboard** - Track usage patterns and improve responses
- **Mobile Applications** - Native iOS and Android apps
- **Enterprise Integration** - Connect with CRM, ticketing systems, and other business tools
- **API Marketplace** - Sell our API to businesses for seamless integration into their existing applications and services

## 💖 Acknowledgements

- Azure AI team for their powerful services and student subscription
- Github Copilot for seamless coding experience
- Devpost for organizing this hackathon

---

<p align="center">
  Made with ❤️ by the SupportLingua AI Team
  <br>
  <a href="rehanali25072003@gmail.com">Contact</a>
</p>
