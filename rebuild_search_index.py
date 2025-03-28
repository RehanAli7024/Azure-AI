"""
Script to rebuild the Azure Cognitive Search index with the updated schema.
"""

import os
import logging
import sys
from azure.core.credentials import AzureKeyCredential
from azure.search.documents.indexes import SearchIndexClient
from azure.search.documents import SearchClient

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def main():
    """Main function to delete and recreate the search index."""
    try:
        # Load environment variables
        from dotenv import load_dotenv
        load_dotenv()
        
        # Get Azure Search configuration
        search_endpoint = os.environ.get("SEARCH_ENDPOINT")
        search_api_key = os.environ.get("SEARCH_API_KEY")
        search_index_name = os.environ.get("SEARCH_INDEX_NAME", "document-search-index")
        
        if not all([search_endpoint, search_api_key]):
            logger.error("Missing Azure Search configuration. Please check your .env file.")
            sys.exit(1)
        
        # Initialize search clients
        credential = AzureKeyCredential(search_api_key)
        search_index_client = SearchIndexClient(endpoint=search_endpoint, credential=credential)
        
        # Import necessary components from document_processor
        sys.path.append(os.path.dirname(os.path.abspath(__file__)))
        from document_processor import ensure_search_index_exists
        
        # Check if the index exists
        logger.info(f"Checking if search index '{search_index_name}' exists")
        indexes = list(search_index_client.list_indexes())
        index_exists = any(index.name == search_index_name for index in indexes)
        
        if index_exists:
            # Delete the existing index
            logger.info(f"Deleting existing search index '{search_index_name}'")
            search_index_client.delete_index(search_index_name)
            logger.info(f"Search index '{search_index_name}' deleted successfully")
        
        # Create the index with the updated schema
        logger.info("Creating new search index with updated schema")
        # Call ensure_search_index_exists directly
        os.environ["SEARCH_INDEX_NAME"] = search_index_name  # Ensure correct index name
        from document_processor import init_azure_services
        init_azure_services()  # Initialize services
        result = ensure_search_index_exists()
        
        if result.get("success"):
            logger.info("Search index rebuilt successfully!")
            logger.info("Note: You'll need to re-upload your documents to populate the index")
        else:
            logger.error(f"Failed to create search index: {result.get('error')}")
    
    except Exception as e:
        logger.error(f"Error rebuilding search index: {str(e)}", exc_info=True)

if __name__ == "__main__":
    main()
