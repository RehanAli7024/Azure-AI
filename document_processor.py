# document_processor.py
import os
import uuid
import json
import pytz
import logging
from datetime import datetime, timedelta
from dotenv import load_dotenv
from azure.storage.blob import BlobServiceClient, generate_blob_sas, BlobSasPermissions
from azure.ai.formrecognizer import DocumentAnalysisClient
from azure.core.credentials import AzureKeyCredential
from azure.search.documents.indexes import SearchIndexClient
from azure.search.documents import SearchClient
from azure.search.documents.indexes.models import (
    SearchIndex, SimpleField, SearchableField, 
    SearchFieldDataType, CorsOptions, 
    ScoringProfile, TextWeights
)

# Configure logging
logging.basicConfig(
    level=logging.DEBUG,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Load environment variables
load_dotenv()
logger.debug("Environment variables loaded")

# Define Azure Storage connection details
connection_string = os.getenv("AZURE_STORAGE_CONNECTION_STRING")
container_name = os.getenv("STORAGE_CONTAINER_NAME", "chatbot-documents")
logger.debug(f"Using storage container: {container_name}")

# Define Form Recognizer details
form_recognizer_endpoint = os.getenv("FORM_RECOGNIZER_ENDPOINT")
form_recognizer_key = os.getenv("FORM_RECOGNIZER_KEY")
logger.debug(f"Form Recognizer endpoint configured: {form_recognizer_endpoint}")

# Define Search Service details
search_endpoint = os.getenv("SEARCH_ENDPOINT")
search_key = os.getenv("SEARCH_API_KEY")
search_index_name = os.getenv("SEARCH_INDEX_NAME", "documents")
logger.debug(f"Search service configured with index: {search_index_name}")

# Initialize BlobServiceClient
blob_service_client = BlobServiceClient.from_connection_string(connection_string)
logger.debug(f"Blob service client initialized for account: {blob_service_client.account_name}")

# Create a container if it doesn't exist
try:
    container_client = blob_service_client.get_container_client(container_name)
    if not container_client.exists():
        container_client = blob_service_client.create_container(container_name)
        logger.info(f"Container '{container_name}' created successfully.")
    else:
        logger.info(f"Using existing container '{container_name}'.")
except Exception as e:
    logger.error(f"Error accessing container: {e}", exc_info=True)

# Initialize Form Recognizer client
document_analysis_client = DocumentAnalysisClient(
    endpoint=form_recognizer_endpoint, credential=AzureKeyCredential(form_recognizer_key)
)
logger.debug("Document analysis client initialized")

# Initialize Search clients
search_credential = AzureKeyCredential(search_key)
search_index_client = SearchIndexClient(endpoint=search_endpoint, credential=search_credential)
search_client = SearchClient(endpoint=search_endpoint, index_name=search_index_name, credential=search_credential)
logger.debug("Search clients initialized")

def upload_document(file_path, blob_name=None):
    try:
        logger.debug(f"Starting document upload: {file_path}")
        if not blob_name:
            blob_name = f"{str(uuid.uuid4())}-{os.path.basename(file_path)}"
        
        blob_client = blob_service_client.get_blob_client(container=container_name, blob=blob_name)
        
        with open(file_path, "rb") as data:
            blob_client.upload_blob(data, overwrite=True)
            logger.info(f"Document '{blob_name}' uploaded successfully.")
        
        sas_token = generate_blob_sas(
            account_name=blob_service_client.account_name,
            container_name=container_name,
            blob_name=blob_name,
            account_key=blob_service_client.credential.account_key,
            permission=BlobSasPermissions(read=True),
            expiry=datetime.now(pytz.UTC) + timedelta(hours=1)
        )
        
        blob_url_with_sas = f"{blob_client.url}?{sas_token}"
        logger.debug(f"Generated SAS token for blob access, expires in 1 hour")
        
        return {
            "success": True,
            "blob_name": blob_name,
            "blob_url": blob_client.url,
            "blob_url_with_sas": blob_url_with_sas
        }
    except Exception as e:
        logger.error(f"An error occurred while uploading the document: {e}", exc_info=True)
        return {"success": False, "error": str(e)}

def extract_text_from_document(blob_url_with_sas):
    try:
        logger.debug(f"Starting text extraction from document at: {blob_url_with_sas[:50]}...")
        poller = document_analysis_client.begin_analyze_document_from_url(
            "prebuilt-layout", blob_url_with_sas
        )
        
        logger.debug("Form Recognizer operation started, waiting for results...")
        result = poller.result()
        logger.debug(f"Form Recognizer analysis complete. Pages detected: {len(result.pages)}")
        
        paragraphs = []
        for page_num, page in enumerate(result.pages, 1):
            logger.debug(f"Processing page {page_num}/{len(result.pages)}")
            for paragraph in page.paragraphs if hasattr(page, 'paragraphs') else []:
                paragraphs.append(paragraph.content)
        
        if not paragraphs:
            logger.debug("No paragraphs found, extracting lines instead")
            for page_num, page in enumerate(result.pages, 1):
                current_paragraph = []
                for line in page.lines:
                    current_paragraph.append(line.content)
                    if len(current_paragraph) > 0 and (len(current_paragraph) % 5 == 0):
                        paragraphs.append(" ".join(current_paragraph))
                        current_paragraph = []
                if current_paragraph:
                    paragraphs.append(" ".join(current_paragraph))
        
        key_value_pairs = {}
        if hasattr(result, 'key_value_pairs'):
            logger.debug(f"Extracting key-value pairs, count: {len(result.key_value_pairs) if hasattr(result, 'key_value_pairs') else 0}")
            for kv_pair in result.key_value_pairs:
                if kv_pair.key and kv_pair.value:
                    key = kv_pair.key.content if kv_pair.key else ""
                    value = kv_pair.value.content if kv_pair.value else ""
                    if key:
                        key_value_pairs[key] = value
        
        full_text = "\n\n".join(paragraphs)
        
        logger.info(f"Text extracted from document: {len(full_text)} characters in {len(paragraphs)} paragraphs")
        
        return {
            "success": True,
            "text": full_text,
            "paragraphs": paragraphs,
            "key_value_pairs": key_value_pairs,
            "page_count": len(result.pages)
        }
        
    except Exception as e:
        logger.error(f"Error extracting document text: {str(e)}", exc_info=True)
        return {"success": False, "error": str(e)}

def ensure_search_index_exists():
    try:
        logger.debug(f"Checking if search index '{search_index_name}' exists")
        indexes = list(search_index_client.list_indexes())
        index_exists = any(index.name == search_index_name for index in indexes)
        
        if index_exists:
            logger.info(f"Search index '{search_index_name}' already exists")
            return {"success": True, "created": False}
        
        logger.info(f"Creating new search index '{search_index_name}'")
        
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
        
        index = SearchIndex(
            name=search_index_name, 
            fields=fields
        )
        
        logger.debug("Sending index creation request to Azure Cognitive Search")
        result = search_index_client.create_or_update_index(index)
        logger.info(f"Search index '{search_index_name}' created with standard configuration")
        
        return {"success": True, "created": True}
        
    except Exception as e:
        logger.error(f"Error creating search index: {str(e)}", exc_info=True)
        return {"success": False, "error": str(e)}

def index_document_content(doc_id, blob_info, text_content):
    try:
        logger.debug(f"Starting indexing for document: {doc_id}")
        
        # Ensure search index exists before indexing
        index_result = ensure_search_index_exists()
        if not index_result.get("success"):
            logger.error(f"Failed to ensure search index exists: {index_result.get('error')}")
            return index_result
            
        # Extract filename and file type
        file_name = os.path.basename(blob_info.get("blob_name", ""))
        file_type = os.path.splitext(file_name)[1][1:].lower() if "." in file_name else ""
        
        paragraphs = text_content.get("paragraphs", [])
        
        search_document = {
            "id": doc_id,
            "blob_name": blob_info.get("blob_name", ""),
            "blob_url": blob_info.get("blob_url", ""),
            "file_name": file_name,
            "file_type": file_type,
            "created_at": datetime.now(pytz.UTC).isoformat(),
            "page_count": text_content.get("page_count", 0),
            "content": text_content.get("text", ""),
            "paragraph_content": "\n\n".join(paragraphs)
        }
        
        logger.debug(f"Uploading document to search index, document size: {len(str(search_document))} characters")
        result = search_client.upload_documents(documents=[search_document])
        
        if result and result[0].succeeded:
            logger.info(f"Document indexed successfully: {doc_id}")
        else:
            logger.warning(f"Document indexing may have failed: {result}")
        
        return {
            "success": True,
            "indexed": result[0].succeeded if result else False,
            "document_id": doc_id
        }
        
    except Exception as e:
        logger.error(f"Error indexing document content: {str(e)}", exc_info=True)
        return {"success": False, "error": str(e)}

def process_document(file_path, blob_name=None):
    upload_result = upload_document(file_path, blob_name)
    if not upload_result.get("success"):
        return {"success": False, "error": f"Document upload failed: {upload_result.get('error')}", "stage": "upload"}
    
    extract_result = extract_text_from_document(upload_result.get("blob_url_with_sas"))
    if not extract_result.get("success"):
        return {"success": False, "error": f"Text extraction failed: {extract_result.get('error')}", "stage": "extract"}
    
    doc_id = str(uuid.uuid4())
    
    index_result = index_document_content(doc_id, upload_result, extract_result)
    if not index_result.get("success"):
        return {"success": False, "error": f"Indexing failed: {index_result.get('error')}", "stage": "index"}
    
    return {
        "success": True,
        "document_id": doc_id,
        "blob_name": upload_result.get("blob_name"),
        "blob_url": upload_result.get("blob_url"),
        "page_count": extract_result.get("page_count", 0),
        "text_length": len(extract_result.get("text", "")),
        "paragraph_count": len(extract_result.get("paragraphs", [])),
        "search_index": search_index_name
    }

def search_documents(query_text, top=5):
    try:
        results = search_client.search(
            search_text=query_text,
            top=top,
            highlight_fields="content,paragraph_content",
            highlight_pre_tag="<em>",
            highlight_post_tag="</em>",
            include_total_count=True
        )
        
        formatted_results = []
        for result in results:
            highlights = []
            if hasattr(result, 'highlights'):
                if 'paragraph_content' in result.highlights:
                    highlights = result.highlights['paragraph_content']
                elif 'content' in result.highlights:
                    highlights = result.highlights['content']
            
            if not highlights and 'paragraph_content' in result:
                paragraphs = result['paragraph_content'].split('\n\n')
                
                query_terms = query_text.lower().split()
                for paragraph in paragraphs:
                    paragraph_lower = paragraph.lower()
                    if any(term in paragraph_lower for term in query_terms):
                        if len(paragraph) > 30:
                            highlights.append(paragraph)
                            if len(highlights) >= 2:
                                break
            
            if not highlights and 'content' in result:
                content = result['content']
                preview = content[:300] + "..." if len(content) > 300 else content
                highlights.append(preview)
            
            formatted_result = {
                "id": result["id"],
                "file_name": result.get("file_name", ""),
                "file_type": result.get("file_type", ""),
                "page_count": result.get("page_count", 0),
                "blob_url": result.get("blob_url", ""),
                "highlights": highlights,
                "score": result["@search.score"]
            }
            formatted_results.append(formatted_result)
        
        return {
            "success": True,
            "query": query_text,
            "count": len(formatted_results),
            "total": results.get_count(),
            "results": formatted_results
        }
        
    except Exception as e:
        logger.error(f"Search error: {str(e)}", exc_info=True)
        return {"success": False, "error": str(e), "results": []}

def main():
    print("\n=== Document Processing and Search Demo ===")
    
    while True:
        print("\nOptions:")
        print("1. Process a document (upload, extract text, index)")
        print("2. Search in documents")
        print("3. Exit")
        
        choice = input("\nEnter your choice (1-3): ")
        
        if choice == "1":
            file_path = input("\nEnter the path to a document file: ")
            
            if not os.path.exists(file_path):
                print(f"Error: File not found at {file_path}")
                continue
            
            print(f"\nProcessing document: {file_path}")
            result = process_document(file_path)
            
            if result.get("success"):
                print("\nDocument processing successful!")
                print(f"Document ID: {result.get('document_id')}")
                print(f"Blob name: {result.get('blob_name')}")
                print(f"Pages: {result.get('page_count')}")
                print(f"Text length: {result.get('text_length')} characters")
                print(f"Paragraphs: {result.get('paragraph_count')}")
                print(f"Search index: {result.get('search_index')}")
            else:
                print(f"\nDocument processing failed at stage '{result.get('stage')}'")
                print(f"Error: {result.get('error')}")
        
        elif choice == "2":
            query = input("\nEnter your search query: ")
            results = search_documents(query)
            
            if results.get("success"):
                print(f"\nFound {results.get('count')} results (total: {results.get('total')})")
                
                if not results.get("results"):
                    print("No matching documents found.")
                
                for i, doc in enumerate(results.get("results"), 1):
                    print(f"\nResult {i}: {doc.get('file_name')} (Score: {doc.get('score'):.2f})")
                    
                    if doc.get("highlights"):
                        print("\nRelevant Text Snippets:")
                        for j, highlight in enumerate(doc.get("highlights"), 1):
                            print(f"\nSnippet {j}:")
                            print(f"{highlight}")
                    else:
                        print("\nNo specific highlights found in this document.")
            else:
                print(f"\nSearch failed: {results.get('error')}")
        
        elif choice == "3":
            print("\nExiting the application. Goodbye!")
            break
        
        else:
            print("\nInvalid choice. Please enter 1, 2, or 3.")

if __name__ == "__main__":
    main()
