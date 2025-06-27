from agno.embedder.azure_openai import AzureOpenAIEmbedder
from agno.models.azure import AzureOpenAI
from agno.models.ollama import Ollama
import os
from dotenv import load_dotenv
load_dotenv()

db_url = "postgresql+psycopg://pradeept95:Admin%40123456%24@ninds-chat-db.postgres.database.azure.com:5432/ai"

def create_azure_openai_embedder():
    return AzureOpenAIEmbedder(  
        id=os.getenv("AZURE_EMBEDDINGS_MODEL"),
        api_key=os.getenv("AZURE_EMBEDDINGS_API_KEY"),
        api_version=os.getenv("AZURE_EMBEDDINGS_API_VERSION"),
        azure_endpoint=os.getenv("AZURE_EMBEDDINGS_ENDPOINT"),
        azure_deployment=os.getenv("AZURE_EMBEDDINGS_DEPLOYMENT") 
    )

def create_azure_openai_model():
    return AzureOpenAI(
        name="AzureOpenAI",
        id=os.getenv("AZURE_OPENAI_MODEL"),
        api_key=os.getenv("AZURE_OPENAI_API_KEY"),
        api_version=os.getenv("AZURE_OPENAI_API_VERSION"),      
        azure_endpoint=os.getenv("AZURE_OPENAI_ENDPOINT"),
        azure_deployment=os.getenv("AZURE_OPENAI_DEPLOYMENT")
    )


def create_ollama_model(model_name: str):
    print(f"Creating Ollama model with ID: {model_name}")
    return Ollama(
        host="http://10.1.10.247:11434",
        id=model_name
    )