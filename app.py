# app.py

from flask import Flask, request, jsonify, render_template, send_from_directory
import os
import logging
from werkzeug.utils import secure_filename
from document_processor import process_document
from chatbot_core import generate_rag_response
from translation_core import SimpleTranslator  # Import the SimpleTranslator
from flask_cors import CORS  # Import CORS

# Configure logging
logging.basicConfig(
    level=logging.DEBUG,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "*"}}, supports_credentials=True)  # Enhanced CORS configuration
logger.info("Flask application initialized with CORS enabled")

app.config['UPLOAD_FOLDER'] = 'uploads'
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024  # 16 MB max

# Create uploads directory
os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)
logger.debug(f"Upload directory created/verified: {app.config['UPLOAD_FOLDER']}")

# Initialize the translator
try:
    translator = SimpleTranslator()
    logger.info("Translator initialized successfully")
except Exception as e:
    logger.error(f"Failed to initialize translator: {str(e)}", exc_info=True)
    translator = None

@app.route('/')
def index():
    """Render the main page."""
    logger.debug("Rendering index page")
    return render_template('index.html')

@app.route('/upload', methods=['POST'])
def upload_file():
    """Handle document uploads."""
    logger.info("Document upload requested")
    
    if 'file' not in request.files:
        logger.warning("No file provided in upload request")
        return jsonify({'success': False, 'error': 'No file provided'}), 400
    
    file = request.files['file']
    if file.filename == '':
        logger.warning("Empty filename in upload request")
        return jsonify({'success': False, 'error': 'No file selected'}), 400
    
    filename = secure_filename(file.filename)
    logger.debug(f"Processing file: {filename}")
    file_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
    file.save(file_path)
    logger.debug(f"File saved temporarily at: {file_path}")
    
    # Process the document using your existing pipeline
    logger.info(f"Processing document: {filename}")
    result = process_document(file_path)
    
    # Clean up the uploaded file
    try:
        os.unlink(file_path)
        logger.debug(f"Temporary file removed: {file_path}")
    except Exception as e:
        logger.error(f"Failed to remove temporary file: {str(e)}", exc_info=True)
    
    if result.get('success'):
        logger.info(f"Document processed successfully: {filename}")
    else:
        logger.error(f"Document processing failed: {result.get('error')}")
    
    return jsonify(result)

@app.route('/chat', methods=['POST'])
def chat():
    """Handle chat requests."""
    logger.info("Chat request received")
    
    try:
        data = request.json
        logger.debug(f"Request data: {data}")
        
        if not data or 'query' not in data:
            logger.warning("Invalid chat request - missing query")
            return jsonify({'success': False, 'error': 'Query is required'}), 400
        
        query = data['query']
        
        # Check if a language is specified for translation
        source_language = data.get('source_language', 'en')
        target_language = data.get('target_language', 'en')
        logger.debug(f"Query: '{query}', Source language: {source_language}, Target language: {target_language}")
        
        translated_query = query
        
        # Translate query if needed
        if source_language != 'en' and translator:
            logger.debug(f"Translating query from {source_language} to English")
            translation_result = translator.translate_text(query, source_language, 'en')
            if translation_result.get('success'):
                translated_query = translation_result.get('translated_text')
                logger.debug(f"Query translated to: '{translated_query}'")
            else:
                logger.warning(f"Query translation failed: {translation_result.get('error')}")
        
        # Process with RAG
        logger.info(f"Generating RAG response for query: '{translated_query}'")
        rag_response = generate_rag_response(translated_query)
        
        answer = rag_response.get('answer')
        sources = rag_response.get('sources', [])
        
        # Translate response if needed
        if target_language != 'en' and translator and answer:
            logger.debug(f"Translating answer to {target_language}")
            translation_result = translator.translate_text(answer, 'en', target_language)
            if translation_result.get('success'):
                answer = translation_result.get('translated_text')
                logger.debug(f"Answer translated successfully")
            else:
                logger.warning(f"Answer translation failed: {translation_result.get('error')}")
        
        response = {
            'success': True,
            'answer': answer,
            'sources': sources
        }
        
        logger.info("Chat response generated successfully")
        return jsonify(response)
    
    except Exception as e:
        logger.error(f"Error in chat endpoint: {str(e)}", exc_info=True)
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/translate', methods=['POST'])
def translate():
    """Handle translation requests."""
    logger.info("Translation request received")
    
    try:
        data = request.json
        logger.debug(f"Translation request data: {data}")
        
        if not data or 'text' not in data:
            logger.warning("Invalid translation request - missing text")
            return jsonify({'success': False, 'error': 'Text is required'}), 400
        
        text = data['text']
        source_language = data.get('source_language', 'en')
        target_language = data.get('target_language', 'en')
        
        logger.debug(f"Translating from {source_language} to {target_language}, text length: {len(text)}")
        
        if not translator:
            error_msg = "Translator service not available"
            logger.error(error_msg)
            return jsonify({'success': False, 'error': error_msg}), 503
        
        # Call the translator service
        result = translator.translate_text(text, source_language, target_language)
        
        if result.get('success'):
            logger.info("Translation successful")
        else:
            logger.error(f"Translation failed: {result.get('error')}")
        
        return jsonify(result)
    
    except Exception as e:
        logger.error(f"Error in translate endpoint: {str(e)}", exc_info=True)
        return jsonify({'success': False, 'error': str(e)}), 500

if __name__ == '__main__':
    logger.info("Starting Flask application")
    port = int(os.environ.get('PORT', 5000))
    logger.info(f"Flask app running on port {port}")
    app.run(debug=True, host='0.0.0.0', port=port)
