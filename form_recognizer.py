from azure.ai.formrecognizer import DocumentAnalysisClient
from azure.core.credentials import AzureKeyCredential
from dotenv import load_dotenv
import os

# Load environment variables from .env file
load_dotenv()

# Set up Form Recognizer client using environment variables
form_recognizer_endpoint = os.getenv("FORM_RECOGNIZER_ENDPOINT")
form_recognizer_key = os.getenv("FORM_RECOGNIZER_KEY")
document_analysis_client = DocumentAnalysisClient(
    endpoint=form_recognizer_endpoint,
    credential=AzureKeyCredential(form_recognizer_key)
)

# Function to extract text from a document
def extract_text_from_document(blob_url):
    try:
        poller = document_analysis_client.begin_analyze_document_from_url(
            "prebuilt-document", blob_url
        )
        result = poller.result()
        extracted_text = []
        for page in result.pages:
            for line in page.lines:
                extracted_text.append(line.content)
        return extracted_text
    except Exception as e:
        print(f"An error occurred while extracting text: {e}")
        return None

# Example usage
# Replace 'URL_OF_UPLOADED_DOCUMENT' with the URL of your uploaded document
extracted_text = extract_text_from_document("URL_OF_UPLOADED_DOCUMENT")
if extracted_text:
    for line in extracted_text:
        print(line)