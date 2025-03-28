# Document Chat Assistant (React Frontend)

This is the React frontend for the Document Chat Assistant application. It works with the existing Flask backend.

## Setup and Running Instructions

### 1. Install React Dependencies

First, navigate to the React frontend directory and install the required dependencies:

```bash
cd react-frontend
npm install
```

### 2. Configure the Proxy

By default, the React development server is configured to proxy API requests to a backend running on `http://localhost:5000`. This is already set up in the `package.json` file:

```json
"proxy": "http://localhost:5000"
```

### 3. Running Both Servers

#### Start the Flask Backend

Open a terminal and run the Flask backend:

```bash
cd c:\Users\sonua\Desktop\Azure-AI
python app.py
```

The Flask server should be running on http://localhost:5000.

#### Start the React Frontend

Open another terminal and run the React development server:

```bash
cd c:\Users\sonua\Desktop\Azure-AI\react-frontend
npm start
```

The React app should automatically open in your browser at http://localhost:3000.

### 4. Building for Production

When you're ready to deploy the application, you can build the React app:

```bash
cd react-frontend
npm run build
```

This will create a production-ready build in the `build` directory. You can serve these static files from your Flask app by updating your `app.py` file to serve the React build folder.

## Features

- Document upload and management
- Chat interface for asking questions about your documents
- Multi-language support
- Sources panel showing document references for answers
