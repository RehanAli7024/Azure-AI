# simple_translator.py
import os
import json
import requests
import uuid
from dotenv import load_dotenv

class SimpleTranslator:
    """Simple translator using Azure Translator API"""
    
    def __init__(self, api_key=None, endpoint=None, location=None):
        """Initialize with API key and endpoint"""
        # Load environment variables
        load_dotenv()
        
        # Set up credentials
        self.api_key = api_key or os.environ.get("TRANSLATOR_API_KEY")
        self.endpoint = endpoint or os.environ.get("TRANSLATOR_ENDPOINT", 
                                                  "https://api.cognitive.microsofttranslator.com/")
        self.location = location or os.environ.get("TRANSLATOR_LOCATION", "eastus")
        
        # Ensure endpoint has correct format
        if self.endpoint and not self.endpoint.endswith('/'):
            self.endpoint += '/'
        
        # Check if API key is available
        if not self.api_key:
            print("Warning: Translator API key not provided. Set TRANSLATOR_API_KEY environment variable.")
    
    def translate(self, text, to_language, from_language=None):
        """
        Translate text from one language to another
        
        Args:
            text (str): Text to translate
            to_language (str): Target language code (e.g., 'en', 'es', 'fr')
            from_language (str, optional): Source language code. If None, auto-detection is used.
            
        Returns:
            str: Translated text or original text if translation fails
        """
        if not self.api_key or not text:
            return text
        
        # Construct request URL
        url = f"{self.endpoint}translate"
        
        # Set up parameters
        params = {
            'api-version': '3.0',
            'to': to_language
        }
        
        # Add source language if provided
        if from_language:
            params['from'] = from_language
        
        # Prepare request body
        body = [{'text': text}]
        
        # Set up headers with trace ID as in the reference script
        headers = {
            'Ocp-Apim-Subscription-Key': self.api_key,
            'Ocp-Apim-Subscription-Region': self.location,
            'Content-type': 'application/json',
            'X-ClientTraceId': str(uuid.uuid4())
        }
        
        try:
            # Make API request
            response = requests.post(url, params=params, headers=headers, json=body)
            response.raise_for_status()
            
            # Parse response
            result = response.json()
            
            if result and len(result) > 0:
                translation = result[0]['translations'][0]['text']
                return translation
            else:
                return text
                
        except Exception as e:
            print(f"Translation error: {str(e)}")
            return text
            
    def translate_text(self, text, from_language=None, to_language=None):
        """
        Alternative method for translate - used by the Flask app
        Follows different parameter order to match how it's called in app.py
        
        Args:
            text (str): Text to translate
            from_language (str): Source language code
            to_language (str): Target language code
            
        Returns:
            dict: Dictionary with success flag and translated text or error
        """
        try:
            if not text or not to_language:
                return {
                    'success': False,
                    'error': 'Text and target language are required',
                    'translated_text': text
                }
                
            # Use the existing translate method
            translated_text = self.translate(text, to_language, from_language)
            
            return {
                'success': True,
                'translated_text': translated_text,
                'source_language': from_language or 'auto',
                'target_language': to_language
            }
            
        except Exception as e:
            error_message = f"Translation error: {str(e)}"
            print(error_message)
            return {
                'success': False,
                'error': error_message,
                'translated_text': text  # Return original text on error
            }

# Example phrases dictionary
EXAMPLE_PHRASES = {
    "greetings": "Hello! How are you today?",
    "help": "I need help with my documents.",
    "meeting": "Can we schedule a meeting tomorrow?",
    "thanks": "Thank you for your assistance.",
    "goodbye": "Goodbye, see you later!",
    "documents": "Please review these important documents.",
    "query": "I have a question about the project.",
    "deadline": "The deadline for this project is next Friday.",
    "progress": "We've made good progress on the implementation.",
    "feedback": "I would appreciate your feedback on this proposal."
}

# Language codes dictionary (common languages)
LANGUAGE_CODES = {
    "english": "en",
    "spanish": "es",
    "french": "fr",
    "german": "de",
    "italian": "it",
    "portuguese": "pt",
    "russian": "ru",
    "japanese": "ja",
    "chinese": "zh-Hans",
    "arabic": "ar",
    "hindi": "hi",
    "korean": "ko",
    "dutch": "nl",
    "swedish": "sv",
    "greek": "el",
    "turkish": "tr",
    "polish": "pl",
    "vietnamese": "vi",
    "thai": "th",
    "indonesian": "id"
}

def display_languages():
    """Display available language options"""
    print("\nAvailable languages:")
    for idx, (name, code) in enumerate(LANGUAGE_CODES.items(), 1):
        print(f"{idx}. {name.capitalize()} ({code})")

def display_phrases():
    """Display available example phrases"""
    print("\nAvailable example phrases:")
    for idx, (key, phrase) in enumerate(EXAMPLE_PHRASES.items(), 1):
        # Trim phrase if too long
        display_phrase = phrase if len(phrase) < 50 else phrase[:47] + "..."
        print(f"{idx}. {key.capitalize()}: {display_phrase}")

def get_language_code(prompt):
    """Get language code from user input"""
    print("\n" + prompt)
    display_languages()
    
    while True:
        choice = input("\nEnter language name or number (or 'q' to quit): ").lower().strip()
        
        if choice == 'q':
            return None
        
        # Check if input is a number
        if choice.isdigit():
            idx = int(choice)
            if 1 <= idx <= len(LANGUAGE_CODES):
                # Get the language name by index
                language_name = list(LANGUAGE_CODES.keys())[idx-1]
                return LANGUAGE_CODES[language_name]
            else:
                print(f"Please enter a number between 1 and {len(LANGUAGE_CODES)}")
        
        # Check if input is a language name
        elif choice in LANGUAGE_CODES:
            return LANGUAGE_CODES[choice]
        
        # Check if input is a language code
        elif choice in LANGUAGE_CODES.values():
            return choice
        
        else:
            print("Invalid language. Please try again.")

def get_text_to_translate():
    """Get text to translate from user"""
    print("\nWhat would you like to translate?")
    print("1. Choose from example phrases")
    print("2. Enter custom text")
    
    while True:
        choice = input("\nEnter your choice (1/2): ").strip()
        
        if choice == '1':
            display_phrases()
            phrase_choice = input("\nEnter phrase number or name: ").lower().strip()
            
            # Check if input is a number
            if phrase_choice.isdigit():
                idx = int(phrase_choice)
                if 1 <= idx <= len(EXAMPLE_PHRASES):
                    # Get the phrase by index
                    phrase_key = list(EXAMPLE_PHRASES.keys())[idx-1]
                    return EXAMPLE_PHRASES[phrase_key]
                else:
                    print(f"Please enter a number between 1 and {len(EXAMPLE_PHRASES)}")
                    continue
            
            # Check if input is a phrase key
            elif phrase_choice in EXAMPLE_PHRASES:
                return EXAMPLE_PHRASES[phrase_choice]
            
            # Check if input is a phrase key without exact match
            for key in EXAMPLE_PHRASES.keys():
                if phrase_choice in key:
                    return EXAMPLE_PHRASES[key]
            
            print("Invalid phrase selection. Please try again.")
        
        elif choice == '2':
            text = input("\nEnter the text you want to translate: ").strip()
            if text:
                return text
            else:
                print("Text cannot be empty. Please try again.")
        
        else:
            print("Invalid choice. Please enter 1 or 2.")

def main():
    """Main function to run the translator"""
    print("=" * 60)
    print("Azure Translator - Simple Translation Tool")
    print("=" * 60)
    
    # Create translator object
    translator = SimpleTranslator()
    
    if not translator.api_key:
        print("\nError: No API key found. Please set your TRANSLATOR_API_KEY in the .env file.")
        return
    
    # Main loop
    while True:
        print("\nTranslation Options:")
        print("1. Translate text")
        print("2. Exit")
        
        choice = input("\nEnter your choice (1/2): ").strip()
        
        if choice == '2':
            print("\nThank you for using the translation tool. Goodbye!")
            break
        
        elif choice == '1':
            # Get source language
            from_language = get_language_code("Select the SOURCE language (leave empty for auto-detection):")
            if from_language is None:
                continue
            
            # Get target language
            to_language = get_language_code("Select the TARGET language:")
            if to_language is None:
                continue
            
            # Get text to translate
            text = get_text_to_translate()
            if not text:
                continue
            
            print("\nTranslating...")
            
            # Perform translation
            translated_text = translator.translate(text, to_language, from_language)
            
            # Display results
            print("\n" + "=" * 60)
            print(f"Source language: {from_language if from_language else 'Auto-detected'}")
            print(f"Target language: {to_language}")
            print("-" * 60)
            print(f"Original text: {text}")
            print(f"Translated text: {translated_text}")
            print("=" * 60)
        
        else:
            print("Invalid choice. Please enter 1 or 2.")

if __name__ == "__main__":
    main()
