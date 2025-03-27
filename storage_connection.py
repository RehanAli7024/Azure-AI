from azure.storage.blob import BlobServiceClient, generate_blob_sas, BlobSasPermissions
from datetime import datetime, timedelta
from dotenv import load_dotenv
import os
from form_recognizer import extract_text_from_document

# Load environment variables from .env file
load_dotenv()

# Define Azure Storage connection details
connection_string = os.getenv("AZURE_STORAGE_CONNECTION_STRING")
container_name = "chatbot-documents"

# Initialize BlobServiceClient
blob_service_client = BlobServiceClient.from_connection_string(connection_string)

# Create a container if it doesn't exist
try:
    container_client = blob_service_client.create_container(container_name)
    print(f"Container '{container_name}' created successfully.")
except Exception as e:
    print(f"Container '{container_name}' already exists or an error occurred: {e}")

# Function to upload a document
def upload_document(file_path, blob_name):
    try:
        # Initialize the BlobClient
        blob_client = blob_service_client.get_blob_client(container=container_name, blob=blob_name)
        
        # Upload the document
        with open(file_path, "rb") as data:
            blob_client.upload_blob(data)
            print(f"Document '{blob_name}' uploaded successfully.")
        
        # Generate a SAS token for the blob
        sas_token = generate_blob_sas(
            account_name=blob_service_client.account_name,
            container_name=container_name,
            blob_name=blob_name,
            account_key=blob_service_client.credential.account_key,
            permission=BlobSasPermissions(read=True),
            expiry=datetime.utcnow() + timedelta(hours=1)
        )
        
        # Form the blob URL with SAS token
        blob_url = f"{blob_client.url}?{sas_token}"
        
        # Extract text from the uploaded document
        extracted_text = extract_text_from_document(blob_url)
        if extracted_text:
            print("Extracted Text:")
            for line in extracted_text:
                print(line)
    except Exception as e:
        print(f"An error occurred while uploading the document: {e}")

# Example usage
# Replace 'example.pdf' with the path to your document
upload_document("example.pdf", "example5.pdf")