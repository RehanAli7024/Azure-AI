import os
import logging
import traceback
from azure.ai.inference import ChatCompletionsClient
from azure.ai.inference.models import SystemMessage, UserMessage, AssistantMessage
from azure.core.credentials import AzureKeyCredential
from document_processor import search_documents
from dotenv import load_dotenv
from translation_core import SimpleTranslator  # Import translator

# Load environment variables
load_dotenv()

# Configure logging with more detailed format
logging.basicConfig(
    level=logging.DEBUG,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Initialize translator
translator = SimpleTranslator()
logger.info("Translator initialized successfully")

# Get credentials from environment variables
OPENAI_ENDPOINT = os.getenv("AZURE_OPENAI_ENDPOINT")
OPENAI_KEY = os.getenv("AZURE_OPENAI_KEY")
MODEL_NAME = os.getenv("AZURE_OPENAI_MODEL", "gpt-4")
AZURE_OPENAI_DEPLOYMENT = MODEL_NAME

# Validate required environment variables
if not OPENAI_ENDPOINT or not OPENAI_KEY:
    logger.warning("Environment variables not found, using hardcoded values")
    OPENAI_ENDPOINT = "https://bb122-m8r64vdd-eastus2.cognitiveservices.azure.com/openai/deployments/gpt-4"
    OPENAI_KEY = "DDIhf3uFxLmFwtZwsDGOwDhq4HW6AcxoanaLkEFfqXeoZ59MA00RJQQJ99BCACHYHv6XJ3w3AAAAACOGS2dy"
    MODEL_NAME = "gpt-4"

logger.info(f"Initializing Azure OpenAI client with endpoint: {OPENAI_ENDPOINT}")
logger.debug(f"Using model: {MODEL_NAME}")

# Initialize Azure OpenAI client
try:
    client = ChatCompletionsClient(
        endpoint=OPENAI_ENDPOINT,
        credential=AzureKeyCredential(OPENAI_KEY)
    )
    logger.debug("OpenAI client initialized successfully")
except Exception as e:
    logger.critical(f"Failed to initialize OpenAI client: {str(e)}", exc_info=True)
    raise

# Define system prompt
SYSTEM_PROMPT = """
You are a knowledgeable support assistant helping users with their questions.
Your responses should be:
1. Accurate and based only on the context provided.
2. Concise but complete.
3. Helpful and user-friendly.
4. Well-structured with clear organization.

If the context doesn't contain information relevant to the question, be honest about not having enough information.
Do not make up facts or information not present in the context.
"""

logger.debug(f"System prompt defined: {len(SYSTEM_PROMPT)} characters")

# Initialize conversation history - changing to a function to get a fresh history each time
def get_initial_conversation_history():
    return [SystemMessage(content=SYSTEM_PROMPT)]

def generate_rag_response(query, document_ids=None, max_search_results=3, language='en'):
    """
    Generate a response using RAG with the Azure AI Inference SDK while retaining conversation history.
    
    Args:
        query (str): User's query in any language
        document_ids (list, optional): Specific document IDs to search within
        max_search_results (int, optional): Maximum number of search results to return
        language (str, optional): Language code of the user's query. Default is 'en' (English)
    """
    sources = []
    original_query = query
    original_language = language
    
    # Get a fresh conversation history for each request to avoid accumulation issues
    conversation_history = get_initial_conversation_history()
    
    try:
        # Log the received query
        logger.info(f"Received query: '{query}' in language: {language}")
        logger.debug(f"Current conversation history length: {len(conversation_history)} messages")
        
        # Translate query to English if it's not already in English
        if language != 'en':
            logger.info(f"Translating query from {language} to English")
            try:
                translation_result = translator.translate_text(query, from_language=language, to_language='en')
                if translation_result.get('success'):
                    query = translation_result.get('translated_text', query)
                    logger.info(f"Translated query: '{query}'")
                else:
                    logger.warning(f"Query translation failed: {translation_result.get('error')}")
            except Exception as e:
                logger.error(f"Error translating query: {str(e)}")
                # Continue with original query if translation fails
        
        # Document processing
        logger.debug(f"Searching for documents with query: '{query}', max results: {max_search_results}")
        search_results = search_documents(query, top=max_search_results, document_ids=document_ids)
        
        if not search_results.get("success"):
            logger.error(f"Search failed: {search_results.get('error')}")
            response_message = AssistantMessage(content="I encountered an error while searching for information. Please try again.")
            conversation_history.append(UserMessage(content=original_query))
            conversation_history.append(response_message)
            
            # Translate error message if needed
            error_response = response_message.content
            if language != 'en':
                try:
                    translation_result = translator.translate_text(error_response, from_language='en', to_language=language)
                    if translation_result.get('success'):
                        error_response = translation_result.get('translated_text', error_response)
                except Exception as e:
                    logger.error(f"Error translating error response: {str(e)}")
            
            return {
                "answer": error_response,
                "sources": []
            }
        
        if not search_results.get("results"):
            logger.warning("No relevant search results found")
            # Instead of giving up, we'll still try to provide a helpful response
            # Prepare a context-aware prompt for general customer support
            support_prompt = f"""
You are a helpful customer support assistant. The user has asked: "{query}" 
No specific information was found in our knowledge base for this query.
Please provide a helpful and friendly response anyway. If the query is a greeting or general question, 
respond appropriately. If it's a specific question you don't have information about, 
acknowledge that and offer to help in other ways a customer support agent would.
Remember to be professional, friendly, and helpful at all times.
"""
            try:
                # Call Azure OpenAI for a general response
                chat_response = client.complete(
                    messages=[
                        SystemMessage(content=support_prompt),
                        UserMessage(content=query)
                    ],
                    model=AZURE_OPENAI_DEPLOYMENT,
                    temperature=0.7,
                    max_tokens=200
                )
                
                # Extract the response
                if chat_response and chat_response.choices:
                    response_message = chat_response.choices[0].message
                    conversation_history.append(UserMessage(content=original_query))
                    conversation_history.append(response_message)
                    
                    # Translate response back to original language if needed
                    final_response = response_message.content
                    if language != 'en':
                        try:
                            translation_result = translator.translate_text(final_response, from_language='en', to_language=language)
                            if translation_result.get('success'):
                                final_response = translation_result.get('translated_text', final_response)
                        except Exception as e:
                            logger.error(f"Error translating response: {str(e)}")
                    
                    return {
                        "answer": final_response,
                        "sources": []
                    }
                else:
                    # Fallback if the chat response is empty
                    fallback_response = get_fallback_response(query)
                    response_message = AssistantMessage(content=fallback_response)
                    conversation_history.append(UserMessage(content=original_query))
                    conversation_history.append(response_message)
                    
                    # Translate fallback response if needed
                    if language != 'en':
                        try:
                            translation_result = translator.translate_text(fallback_response, from_language='en', to_language=language)
                            if translation_result.get('success'):
                                fallback_response = translation_result.get('translated_text', fallback_response)
                        except Exception as e:
                            logger.error(f"Error translating fallback response: {str(e)}")
                    
                    return {
                        "answer": fallback_response,
                        "sources": []
                    }
            except Exception as e:
                logger.error(f"Error generating response without search results: {str(e)}")
                fallback_response = get_fallback_response(query)
                response_message = AssistantMessage(content=fallback_response)
                conversation_history.append(UserMessage(content=original_query))
                conversation_history.append(response_message)
                
                # Translate fallback response if needed
                if language != 'en':
                    try:
                        translation_result = translator.translate_text(fallback_response, from_language='en', to_language=language)
                        if translation_result.get('success'):
                            fallback_response = translation_result.get('translated_text', fallback_response)
                    except Exception as e:
                        logger.error(f"Error translating fallback response: {str(e)}")
                
                return {
                    "answer": fallback_response,
                    "sources": []
                }

        # Log number of results found
        result_count = len(search_results.get("results", []))
        logger.info(f"Found {result_count} relevant document sections")
        
        # Build context
        all_highlights = []
        for result in search_results.get("results", []):
            highlights = result.get("highlights", [])
            logger.debug(f"Result score: {result.get('score', 0)}, highlights: {len(highlights)}")
            all_highlights.extend(highlights)
        
        context = "\n".join(all_highlights)
        
        sources = [{
            "file_name": result.get("file_name", "Unknown document"),
            "page_count": result.get("page_count", 0),
            "score": result.get("score", 0)
        } for result in search_results.get("results", [])]

        # Log context length
        logger.info(f"Context built with {len(context)} characters from {len(all_highlights)} highlights")
        
        # Prepare user message with context
        prompt_with_context = f"""
I need information about the following question:

Question: {query}

Here is the relevant information from our support documentation:

{context}

Please provide a comprehensive answer based only on this information.
"""
        
        logger.debug(f"Constructed prompt with context of {len(prompt_with_context)} characters")
        
        # Add user message to conversation history
        user_message = UserMessage(content=prompt_with_context)
        conversation_history.append(user_message)

        # Log that we're calling the API
        logger.info(f"Calling Azure OpenAI API with model: {MODEL_NAME}")
        
        # Call OpenAI using the SDK client
        response = client.complete(
            messages=conversation_history,
            max_tokens=200,
            temperature=0.7,
            top_p=1.0,
            model=MODEL_NAME
        )
        
        # Extract the answer and add it to the conversation history
        answer = response.choices[0].message.content
        token_usage = getattr(response, 'usage', None)
        if token_usage:
            logger.debug(f"Token usage - Prompt: {token_usage.prompt_tokens}, Completion: {token_usage.completion_tokens}, Total: {token_usage.total_tokens}")
        
        assistant_message = AssistantMessage(content=answer)
        conversation_history.append(assistant_message)
        
        # Log success
        logger.info(f"Successfully generated response with {len(answer)} characters")
        logger.debug(f"Updated conversation history length: {len(conversation_history)} messages")
        
        # Print the answer to terminal with clear formatting
        print("\n" + "="*80)
        print("ANSWER FROM AZURE OPENAI:")
        print("-"*80)
        print(answer)
        print("="*80 + "\n")
        
        # Translate response back to original language if needed
        final_response = answer
        if language != 'en':
            try:
                translation_result = translator.translate_text(final_response, from_language='en', to_language=language)
                if translation_result.get('success'):
                    final_response = translation_result.get('translated_text', final_response)
            except Exception as e:
                logger.error(f"Error translating response: {str(e)}")
        
        return {
            "answer": final_response,
            "sources": sources
        }

    except Exception as e:
        error_details = traceback.format_exc()
        logger.error(f"Error in RAG response generation: {str(e)}", exc_info=True)
        logger.debug(f"Error details: {error_details}")
        
        error_message = AssistantMessage(content=f"An error occurred while generating the response: {str(e)}")
        conversation_history.append(UserMessage(content=original_query))
        conversation_history.append(error_message)
        
        # Translate error message if needed
        error_response = error_message.content
        if language != 'en':
            try:
                translation_result = translator.translate_text(error_response, from_language='en', to_language=language)
                if translation_result.get('success'):
                    error_response = translation_result.get('translated_text', error_response)
            except Exception as e:
                logger.error(f"Error translating error response: {str(e)}")
        
        return {
            "answer": error_response,
            "sources": sources
        }

def get_fallback_response(query):
    """Generate a fallback response based on the query type"""
    query_lower = query.lower()
    
    # Check for greetings
    if any(greeting in query_lower for greeting in ["hello", "hi", "hey", "greetings"]):
        return "Hello! I'm your customer support assistant. How can I help you today?"
    
    # Check for thanks
    if any(thanks in query_lower for thanks in ["thank", "thanks", "appreciate"]):
        return "You're welcome! I'm here to help if you need anything else."
    
    # Check for goodbye
    if any(bye in query_lower for bye in ["bye", "goodbye", "see you"]):
        return "Goodbye! Feel free to come back if you have more questions. Have a great day!"
    
    # Generic response for other queries
    return "I don't have specific information about that in my knowledge base. As a customer support assistant, I'd be happy to help with any other questions you might have. Is there something else I can assist you with?"
