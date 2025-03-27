# app.py

from flask import Flask, request, jsonify, render_template, send_from_directory
import os
from werkzeug.utils import secure_filename
from document_processor import process_document
from chatbot_core import generate_rag_response
from translation_core import SimpleTranslator  # Import the SimpleTranslator
from flask_cors import CORS  # Import CORS

app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

app.config['UPLOAD_FOLDER'] = 'uploads'
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024  # 16 MB max

# Create uploads directory
os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)

# Initialize the translator
translator = SimpleTranslator()

@app.route('/')
def index():
    """Render the main page."""
    return render_template('index.html')

@app.route('/upload', methods=['POST'])
def upload_file():
    """Handle document uploads."""
    if 'file' not in request.files:
        return jsonify({'success': False, 'error': 'No file provided'}), 400
    
    file = request.files['file']
    if file.filename == '':
        return jsonify({'success': False, 'error': 'No file selected'}), 400
    
    filename = secure_filename(file.filename)
    file_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
    file.save(file_path)
    
    # Process the document using your existing pipeline
    result = process_document(file_path)
    
    # Clean up the uploaded file
    os.unlink(file_path)
    
    return jsonify(result)

@app.route('/chat', methods=['POST'])
def chat():
    """Handle chat requests."""
    data = request.json
    query = data.get('query')
    
    if not query:
        return jsonify({'success': False, 'error': 'No query provided'}), 400
    
    # Get the answer using RAG
    result = generate_rag_response(query)
    
    return jsonify({
        'success': True,
        'answer': result.get('answer'),
        'sources': result.get('sources', [])
    })

@app.route('/translate', methods=['POST'])
def translate():
    """Handle translation requests."""
    data = request.json
    
    text = data.get('text')
    to_language = data.get('to_language')
    from_language = data.get('from_language')
    
    if not text or not to_language:
        return jsonify({'success': False, 'error': 'Missing required parameters'}), 400
    
    try:
        translated_text = translator.translate(text, to_language, from_language)
        
        return jsonify({
            'success': True,
            'original_text': text,
            'translated_text': translated_text,
            'to_language': to_language,
            'from_language': from_language or 'auto-detected'
        })
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    app.run(debug=True, host='0.0.0.0', port=port)
