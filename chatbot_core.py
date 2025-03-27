import os
import logging
from azure.ai.inference import ChatCompletionsClient
from azure.ai.inference.models import SystemMessage, UserMessage, AssistantMessage
from azure.core.credentials import AzureKeyCredential
from document_processor import search_documents
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Configure logging with more detailed format
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Get credentials from environment variables
OPENAI_ENDPOINT = os.getenv("AZURE_OPENAI_ENDPOINT")
OPENAI_KEY = os.getenv("AZURE_OPENAI_KEY")
MODEL_NAME = os.getenv("AZURE_OPENAI_MODEL", "gpt-4")

# Validate required environment variables
if not OPENAI_ENDPOINT or not OPENAI_KEY:
    logger.warning("Environment variables not found, using hardcoded values")
    OPENAI_ENDPOINT = "https://bb122-m8r64vdd-eastus2.cognitiveservices.azure.com/openai/deployments/gpt-4"
    OPENAI_KEY = "DDIhf3uFxLmFwtZwsDGOwDhq4HW6AcxoanaLkEFfqXeoZ59MA00RJQQJ99BCACHYHv6XJ3w3AAAAACOGS2dy"
    MODEL_NAME = "gpt-4"

logger.info(f"Initializing Azure OpenAI client with endpoint: {OPENAI_ENDPOINT}")

# Initialize Azure OpenAI client
client = ChatCompletionsClient(
    endpoint=OPENAI_ENDPOINT,
    credential=AzureKeyCredential(OPENAI_KEY)
)

# Initialize conversation history
conversation_history = [
    SystemMessage(content="""
You are a knowledgeable support assistant helping users with their questions.
Your responses should be:
1. Accurate and based only on the context provided.
2. Concise but complete.
3. Helpful and user-friendly.
4. Well-structured with clear organization.

If the context doesn't contain information relevant to the question, be honest about not having enough information.
Do not make up facts or information not present in the context.
    """)
]

def generate_rag_response(query, max_search_results=3):
    """
    Generate a response using RAG with the Azure AI Inference SDK while retaining conversation history.
    """
    sources = []
    try:
        # Log the received query
        logger.info(f"Received query: '{query}'")
        
        # Document processing
        search_results = search_documents(query, top=max_search_results)
        
        if not search_results.get("success") or not search_results.get("results"):
            logger.warning("No relevant search results found")
            response_message = AssistantMessage(content="I couldn't find any relevant information to answer your question.")
            conversation_history.append(UserMessage(content=query))
            conversation_history.append(response_message)
            return {
                "answer": response_message.content,
                "sources": []
            }

        # Log number of results found
        logger.info(f"Found {len(search_results.get('results', []))} relevant document sections")
        
        # Build context
        context = "\n".join(
            highlight 
            for result in search_results.get("results", []) 
            for highlight in result.get("highlights", [])
        )
        
        sources = [{
            "file_name": result.get("file_name", "Unknown document"),
            "page_count": result.get("page_count", 0),
            "score": result.get("score", 0)
        } for result in search_results.get("results", [])]

        # Log context length
        logger.info(f"Context built with {len(context)} characters")
        
        # Add user message to conversation history
        user_message = UserMessage(content=f"""
I need information about the following question:

Question: {query}

Here is the relevant information from our support documentation:

{context}

Please provide a comprehensive answer based only on this information.
        """)
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
        assistant_message = AssistantMessage(content=answer)
        conversation_history.append(assistant_message)
        
        # Print the answer to terminal with clear formatting
        print("\n" + "="*80)
        print("ANSWER FROM AZURE OPENAI:")
        print("-"*80)
        print(answer)
        print("="*80 + "\n")
        
        logger.info(f"Successfully generated response with {len(answer)} characters")
        
        return {
            "answer": answer,
            "sources": sources
        }

    except Exception as e:
        logger.error(f"Error: {str(e)}", exc_info=True)
        error_message = AssistantMessage(content=f"An error occurred while generating the response: {str(e)}")
        conversation_history.append(UserMessage(content=query))
        conversation_history.append(error_message)
        
        return {
            "answer": error_message.content,
            "sources": sources
        }
