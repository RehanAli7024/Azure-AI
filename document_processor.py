# document_processor.py

import os
import uuid
import json
import pytz
from datetime import datetime, timedelta
from dotenv import load_dotenv
from azure.storage.blob import BlobServiceClient, generate_blob_sas, BlobSasPermissions
from azure.ai.formrecognizer import DocumentAnalysisClient
from azure.core.credentials import AzureKeyCredential
from azure.search.documents.indexes import SearchIndexClient
from azure.search.documents import SearchClient
from azure.search.documents.indexes.models import (
    SearchIndex, SimpleField, SearchableField,
    SearchFieldDataType
)

# Load environment variables
load_dotenv()

# Define Azure Storage connection details
connection_string = os.getenv("AZURE_STORAGE_CONNECTION_STRING")
container_name = os.getenv("STORAGE_CONTAINER_NAME", "chatbot-documents")

# Define Form Recognizer details
form_recognizer_endpoint = os.getenv("FORM_RECOGNIZER_ENDPOINT")
form_recognizer_key = os.getenv("FORM_RECOGNIZER_KEY")

# Define Search Service details
search_endpoint = os.getenv("SEARCH_ENDPOINT")
search_key = os.getenv("SEARCH_API_KEY")
search_index_name = os.getenv("SEARCH_INDEX_NAME", "documents")

# Initialize BlobServiceClient
blob_service_client = BlobServiceClient.from_connection_string(connection_string)

# Create a container if it doesn't exist
try:
    container_client = blob_service_client.get_container_client(container_name)
    if not container_client.exists():
        container_client = blob_service_client.create_container(container_name)
        print(f"Container '{container_name}' created successfully.")
    else:
        print(f"Using existing container '{container_name}'.")
except Exception as e:
    print(f"Error accessing container: {e}")

# Initialize Form Recognizer client
document_analysis_client = DocumentAnalysisClient(
    endpoint=form_recognizer_endpoint, credential=AzureKeyCredential(form_recognizer_key)
)

# Initialize Search clients
search_credential = AzureKeyCredential(search_key)
search_index_client = SearchIndexClient(endpoint=search_endpoint, credential=search_credential)
search_client = SearchClient(endpoint=search_endpoint, index_name=search_index_name, credential=search_credential)

def upload_document(file_path, blob_name=None):
    try:
        if not blob_name:
            blob_name = f"{str(uuid.uuid4())}-{os.path.basename(file_path)}"
        
        blob_client = blob_service_client.get_blob_client(container=container_name, blob=blob_name)
        
        with open(file_path, "rb") as data:
            blob_client.upload_blob(data, overwrite=True)
        
        print(f"Document '{blob_name}' uploaded successfully.")
        
        sas_token = generate_blob_sas(
            account_name=blob_service_client.account_name,
            container_name=container_name,
            blob_name=blob_name,
            account_key=blob_service_client.credential.account_key,
            permission=BlobSasPermissions(read=True),
            expiry=datetime.now(pytz.UTC) + timedelta(hours=1)
        )
        
        blob_url_with_sas = f"{blob_client.url}?{sas_token}"
        
        return {
            "success": True,
            "blob_name": blob_name,
            "blob_url": blob_client.url,
            "blob_url_with_sas": blob_url_with_sas
        }
    
    except Exception as e:
        print(f"An error occurred while uploading the document: {e}")
        return {"success": False, "error": str(e)}

def extract_text_from_document(blob_url_with_sas):
    try:
        poller = document_analysis_client.begin_analyze_document_from_url(
            "prebuilt-layout", blob_url_with_sas
        )
        
        result = poller.result()
        
        paragraphs = []
        for page in result.pages:
            for paragraph in page.paragraphs if hasattr(page, 'paragraphs') else []:
                paragraphs.append(paragraph.content)
        
        if not paragraphs:
            for page in result.pages:
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
            for kv_pair in result.key_value_pairs:
                if kv_pair.key and kv_pair.value:
                    key = kv_pair.key.content if kv_pair.key else ""
                    value = kv_pair.value.content if kv_pair.value else ""
                    if key:
                        key_value_pairs[key] = value
        
        full_text = "\n\n".join(paragraphs)
        print(f"Text extracted from document: {len(full_text)} characters in {len(paragraphs)} paragraphs")
        
        return {
            "success": True,
            "text": full_text,
            "paragraphs": paragraphs,
            "key_value_pairs": key_value_pairs,
            "page_count": len(result.pages)
        }
    
    except Exception as e:
        print(f"Error extracting document text: {str(e)}")
        return {"success": False, "error": str(e)}

def delete_search_index():
    """Delete the existing search index if it exists."""
    try:
        search_index_client.delete_index(search_index_name)
        print(f"Search index '{search_index_name}' deleted successfully")
        return {"success": True}
    except Exception as e:
        print(f"Error deleting search index: {str(e)}")
        return {"success": False, "error": str(e)}

def ensure_search_index_exists():
    try:
        indexes = list(search_index_client.list_indexes())
        index_exists = any(index.name == search_index_name for index in indexes)
        
        if index_exists:
            print(f"Search index '{search_index_name}' already exists")
            return {"success": True, "created": False}
        
        fields = [
            # Make id field filterable (this was missing before)
            SimpleField(name="id", type=SearchFieldDataType.String, key=True, filterable=True),
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
        
        result = search_index_client.create_or_update_index(index)
        print(f"Search index '{search_index_name}' created with standard configuration")
        
        return {"success": True, "created": True}
    
    except Exception as e:
        print(f"Error creating search index: {str(e)}")
        return {"success": False, "error": str(e)}

def index_document_content(doc_id, blob_info, text_content):
    try:
        ensure_search_index_exists()
        
        search_document = {
            "id": doc_id,
            "blob_name": blob_info.get("blob_name", ""),
            "blob_url": blob_info.get("blob_url", ""),
            "file_name": os.path.basename(blob_info.get("blob_name", "")),
            "file_type": os.path.splitext(blob_info.get("blob_name", ""))[1][1:],
            "created_at": datetime.now(pytz.UTC).isoformat(),
            "page_count": text_content.get("page_count", 0),
            "content": text_content.get("text", ""),
            "paragraph_content": "\n\n".join(text_content.get("paragraphs", []))
        }
        
        result = search_client.upload_documents(documents=[search_document])
        print(f"Document indexed: {doc_id}")
        
        return {
            "success": True,
            "indexed": result[0].succeeded,
            "document_id": doc_id
        }
    
    except Exception as e:
        print(f"Error indexing document content: {str(e)}")
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

def search_documents(query_text, top=5, document_ids=None):
    try:
        # Improved logging for debugging
        if document_ids:
            print(f"Searching for documents with IDs: {document_ids}")
        else:
            print("No document IDs provided for search")
            
        # Create a filter expression if document_ids are provided
        filter_expression = None
        if document_ids and len(document_ids) > 0:  # Check if document_ids is not empty
            # Properly format the filter with single quotes around string IDs
            filter_parts = []
            for doc_id in document_ids:
                # Ensure proper string formatting with quotes
                filter_parts.append(f"id eq '{doc_id}'")
            
            if filter_parts:
                filter_expression = " or ".join(filter_parts)
                print(f"Using filter: {filter_expression}")
        
        # Perform the search
        results = search_client.search(
            search_text=query_text,
            top=top,
            highlight_fields="content,paragraph_content",
            highlight_pre_tag="<em>",
            highlight_post_tag="</em>",
            include_total_count=True,
            filter=filter_expression  # Apply the filter if document_ids are provided
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
        print(f"Search error: {str(e)}")
        return {"success": False, "error": str(e), "results": []}

def recreate_search_index():
    """Helper function to delete and recreate the search index."""
    delete_result = delete_search_index()
    if delete_result.get("success"):
        return ensure_search_index_exists()
    return delete_result

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
