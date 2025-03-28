# reset_search_index.py
import os
import logging
from dotenv import load_dotenv
from azure.search.documents.indexes import SearchIndexClient
from azure.search.documents import SearchClient
from azure.search.documents.indexes.models import (
    SearchIndex, SimpleField, SearchableField,
    SearchFieldDataType
)
from azure.core.credentials import AzureKeyCredential

# Configure logging
logging.basicConfig(
    level=logging.DEBUG,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Load environment variables
load_dotenv()
logger.debug("Environment variables loaded")

# Define Search Service details
search_endpoint = os.getenv("SEARCH_ENDPOINT")
search_key = os.getenv("SEARCH_API_KEY")
search_index_name = os.getenv("SEARCH_INDEX_NAME", "documents")
logger.info(f"Using search endpoint: {search_endpoint}")
logger.info(f"Using search index name: {search_index_name}")

# Initialize Search clients
search_credential = AzureKeyCredential(search_key)
search_index_client = SearchIndexClient(endpoint=search_endpoint, credential=search_credential)

def delete_search_index():
    """Delete the search index if it exists."""
    try:
        indexes = list(search_index_client.list_indexes())
        index_exists = any(index.name == search_index_name for index in indexes)
        
        if index_exists:
            logger.info(f"Deleting existing index '{search_index_name}'")
            search_index_client.delete_index(search_index_name)
            logger.info(f"Successfully deleted index '{search_index_name}'")
            return True
        else:
            logger.info(f"Index '{search_index_name}' does not exist, no need to delete")
            return False
    except Exception as e:
        logger.error(f"Error deleting search index: {str(e)}", exc_info=True)
        return False

def create_search_index():
    """Create a new search index with a compatible schema."""
    try:
        # Define a simplified schema compatible with the API version
        fields = [
            SimpleField(name="id", type=SearchFieldDataType.String, key=True),
            SimpleField(name="blob_name", type=SearchFieldDataType.String, filterable=True),
            SimpleField(name="blob_url", type=SearchFieldDataType.String),
            SimpleField(name="file_name", type=SearchFieldDataType.String, filterable=True, sortable=True),
            SimpleField(name="file_type", type=SearchFieldDataType.String, filterable=True),
            SimpleField(name="created_at", type=SearchFieldDataType.DateTimeOffset, filterable=True, sortable=True),
            SimpleField(name="page_count", type=SearchFieldDataType.Int32, filterable=True),
            SearchableField(name="content", type=SearchFieldDataType.String, analyzer_name="en.microsoft"),
            SearchableField(name="paragraph_content", type=SearchFieldDataType.String, searchable=True)
        ]
        
        index = SearchIndex(name=search_index_name, fields=fields)
        
        logger.debug("Sending index creation request to Azure Cognitive Search")
        result = search_index_client.create_or_update_index(index)
        logger.info(f"Search index '{search_index_name}' created successfully")
        
        return True
    except Exception as e:
        logger.error(f"Error creating search index: {str(e)}", exc_info=True)
        return False

if __name__ == "__main__":
    logger.info("Starting search index reset process")
    
    # Delete existing index
    delete_result = delete_search_index()
    
    # Create new index with compatible schema
    create_result = create_search_index()
    
    if delete_result and create_result:
        logger.info("Search index reset completed successfully")
    else:
        logger.error("Search index reset failed")
