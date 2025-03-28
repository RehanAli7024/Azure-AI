# app.py

from flask import Flask, request, jsonify, render_template, send_from_directory
import os
import logging
from werkzeug.utils import secure_filename
from document_processor import process_document
from chatbot_core import generate_rag_response
from translation_core import SimpleTranslator  # Import the SimpleTranslator
from flask_cors import CORS  # Import CORS
from bot_model import BotModel  # Import the BotModel we just created

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
app.config['ALLOWED_EXTENSIONS'] = {'pdf', 'docx', 'txt'}

# Create uploads directory
os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)
logger.debug(f"Upload directory created/verified: {app.config['UPLOAD_FOLDER']}")

# Initialize the translator and bot manager
try:
    translator = SimpleTranslator()
    logger.info("Translator initialized successfully")
except Exception as e:
    logger.error(f"Failed to initialize translator: {str(e)}", exc_info=True)
    translator = None

try:
    bot_manager = BotModel()
    logger.info("Bot manager initialized successfully")
except Exception as e:
    logger.error(f"Failed to initialize bot manager: {str(e)}", exc_info=True)
    bot_manager = None

@app.route('/')
def index():
    """Render the main page."""
    logger.debug("Rendering index page")
    return render_template('index.html')

@app.route('/upload', methods=['POST'])
def upload():
    """
    Handle document uploads and processing.
    """
    try:
        if 'file' not in request.files:
            return jsonify({'success': False, 'error': 'No file provided'}), 400
        
        file = request.files['file']
        
        if file.filename == '':
            return jsonify({'success': False, 'error': 'No file selected'}), 400
        
        # Extract the filename and extension
        filename = secure_filename(file.filename)
        file_extension = os.path.splitext(filename)[1].lower()[1:]
        
        if file_extension not in app.config['ALLOWED_EXTENSIONS']:
            return jsonify({
                'success': False, 
                'error': f'Unsupported file type. Allowed types: {", ".join(app.config["ALLOWED_EXTENSIONS"])}'
            }), 400
        
        # Save the file
        filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
        file.save(filepath)
        logger.info(f"File {filename} saved to {filepath}")
        
        # Process the document
        process_result = process_document(filepath)
        
        if not process_result.get('success'):
            # Log error and attempt to cleanup
            logger.error(f"Document processing failed: {process_result.get('error')}")
            if os.path.exists(filepath):
                os.remove(filepath)
            return jsonify(process_result), 500
        
        document_id = process_result.get('document_id')
        
        # Check if this document should be associated with a bot
        bot_id = request.form.get('bot_id')
        if bot_id:
            try:
                bot_result = bot_manager.add_document_to_bot(bot_id, document_id)
                if bot_result:
                    process_result['bot'] = bot_result
                    logger.info(f"Document {document_id} associated with bot {bot_id}")
                else:
                    logger.warning(f"Could not associate document with bot {bot_id} - bot not found")
            except Exception as e:
                logger.error(f"Error associating document with bot: {str(e)}")
                # Continue even if bot association fails
        
        # Return the processing result
        return jsonify(process_result)
        
    except Exception as e:
        logger.error(f"Error in upload endpoint: {str(e)}", exc_info=True)
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/chat', methods=['POST'])
def chat():
    """Process a chat message and generate a response."""
    logger.info("Chat request received")
    
    try:
        data = request.json
        query = data.get('query')
        bot_id = data.get('bot_id', None)
        language = data.get('language', 'en')  # Get the selected language, default to English
        
        logger.debug(f"Chat query: '{query}', bot_id: {bot_id}, language: {language}")
        
        if not query:
            return jsonify({'success': False, 'error': 'Query is required'}), 400
        
        # If a bot ID is provided, get the associated document IDs
        document_ids = None
        if bot_id:
            bot = bot_manager.get_bot(bot_id)
            if bot:
                document_ids = bot.get('document_ids', [])
                logger.debug(f"Using document_ids for bot {bot_id}: {document_ids}")
        
        # Generate response based on the provided query
        result = generate_rag_response(query, document_ids=document_ids, language=language)
        
        answer = result.get("answer", "")
        sources = result.get("sources", [])
        
        # We don't need to translate here anymore as it's handled in generate_rag_response
        
        return jsonify({
            'success': True, 
            'answer': answer,
            'sources': sources,
            'bot_id': bot_id
        })
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
        logger.error(f"Error in translation endpoint: {str(e)}", exc_info=True)
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/translate-error-messages', methods=['POST'])
def translate_error_messages():
    """Translate UI error messages."""
    try:
        data = request.json
        language = data.get('language', 'en')
        
        if language == 'en':
            return jsonify({
                'success': True,
                'messages': {
                    'networkError': 'Network error. Please check your connection and try again.',
                    'serverError': 'Sorry, I encountered an error. Please try again.',
                    'emptyResponse': "I don't have an answer for that."
                }
            })
        
        if not translator:
            return jsonify({
                'success': False,
                'error': 'Translator service not available'
            }), 503
        
        # Messages to translate
        messages = {
            'networkError': 'Network error. Please check your connection and try again.',
            'serverError': 'Sorry, I encountered an error. Please try again.',
            'emptyResponse': "I don't have an answer for that."
        }
        
        # Translate each message
        translated_messages = {}
        for key, message in messages.items():
            result = translator.translate_text(message, 'en', language)
            if result.get('success'):
                translated_messages[key] = result.get('translated_text', message)
            else:
                translated_messages[key] = message
        
        return jsonify({
            'success': True,
            'messages': translated_messages
        })
    except Exception as e:
        logger.error(f"Error translating error messages: {str(e)}", exc_info=True)
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/api/bots', methods=['GET'])
def get_bots():
    """Get all bots"""
    try:
        bots = bot_manager.get_all_bots()
        return jsonify({"success": True, "bots": bots})
    except Exception as e:
        logger.error(f"Error getting bots: {str(e)}")
        return jsonify({"success": False, "error": str(e)}), 500

@app.route('/api/bots/<bot_id>', methods=['GET'])
def get_bot(bot_id):
    """Get a specific bot by ID"""
    try:
        bot = bot_manager.get_bot(bot_id)
        if bot:
            return jsonify({"success": True, "bot": bot})
        else:
            return jsonify({"success": False, "error": "Bot not found"}), 404
    except Exception as e:
        logger.error(f"Error getting bot {bot_id}: {str(e)}")
        return jsonify({"success": False, "error": str(e)}), 500

@app.route('/api/bots', methods=['POST'])
def create_bot():
    """Create a new bot"""
    try:
        data = request.json
        name = data.get('name')
        description = data.get('description', '')
        settings = data.get('settings', {})
        
        if not name:
            return jsonify({"success": False, "error": "Bot name is required"}), 400
        
        bot = bot_manager.create_bot(name, description, settings)
        return jsonify({"success": True, "bot": bot}), 201
    except Exception as e:
        logger.error(f"Error creating bot: {str(e)}")
        return jsonify({"success": False, "error": str(e)}), 500

@app.route('/api/bots/<bot_id>', methods=['PUT'])
def update_bot(bot_id):
    """Update a bot"""
    try:
        data = request.json
        name = data.get('name')
        description = data.get('description')
        settings = data.get('settings')
        
        bot = bot_manager.update_bot(bot_id, name, description, settings)
        if bot:
            return jsonify({"success": True, "bot": bot})
        else:
            return jsonify({"success": False, "error": "Bot not found"}), 404
    except Exception as e:
        logger.error(f"Error updating bot {bot_id}: {str(e)}")
        return jsonify({"success": False, "error": str(e)}), 500

@app.route('/api/bots/<bot_id>', methods=['DELETE'])
def delete_bot(bot_id):
    """Delete a bot"""
    try:
        success = bot_manager.delete_bot(bot_id)
        if success:
            return jsonify({"success": True, "message": f"Bot {bot_id} deleted"})
        else:
            return jsonify({"success": False, "error": "Bot not found"}), 404
    except Exception as e:
        logger.error(f"Error deleting bot {bot_id}: {str(e)}")
        return jsonify({"success": False, "error": str(e)}), 500

@app.route('/api/bots/<bot_id>/documents', methods=['POST'])
def add_document_to_bot(bot_id):
    """Add a document to a bot"""
    try:
        data = request.json
        document_id = data.get('document_id')
        
        if not document_id:
            return jsonify({"success": False, "error": "Document ID is required"}), 400
        
        bot = bot_manager.add_document_to_bot(bot_id, document_id)
        if bot:
            return jsonify({"success": True, "bot": bot})
        else:
            return jsonify({"success": False, "error": "Bot not found"}), 404
    except Exception as e:
        logger.error(f"Error adding document to bot {bot_id}: {str(e)}")
        return jsonify({"success": False, "error": str(e)}), 500

@app.route('/api/bots/<bot_id>/documents/<document_id>', methods=['DELETE'])
def remove_document_from_bot(bot_id, document_id):
    """Remove a document from a bot"""
    try:
        bot = bot_manager.remove_document_from_bot(bot_id, document_id)
        if bot:
            return jsonify({"success": True, "bot": bot})
        else:
            return jsonify({"success": False, "error": "Bot not found"}), 404
    except Exception as e:
        logger.error(f"Error removing document from bot {bot_id}: {str(e)}")
        return jsonify({"success": False, "error": str(e)}), 500

if __name__ == '__main__':
    logger.info("Starting Flask application")
    port = int(os.environ.get('PORT', 5000))
    logger.info(f"Flask app running on port {port}")
    app.run(debug=True, host='0.0.0.0', port=port)
