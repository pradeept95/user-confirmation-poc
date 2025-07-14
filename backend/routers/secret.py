from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from azure.identity import DefaultAzureCredential
from azure.keyvault.secrets import SecretClient
import os

# import environment variables from .env file
from dotenv import load_dotenv
load_dotenv()

# Create a router for secret management
AZURE_CLIENT_ID = os.getenv("AZURE_CLIENT_ID")
AZURE_TENANT_ID = os.getenv("AZURE_TENANT_ID")
AZURE_CLIENT_SECRET = os.getenv("AZURE_CLIENT_SECRET")

secret_router = APIRouter(prefix="/api/secret", tags=["secret"])

key_vault_url = "https://prt-az-key-vault.vault.azure.net/"
credential = DefaultAzureCredential()
client = SecretClient(vault_url=key_vault_url, credential=credential)

class SecretCreateRequest(BaseModel):
    key: str
    value: str

@secret_router.post("/create")
async def add_secret(request: SecretCreateRequest):
    try:
        client.set_secret(request.key, request.value)
        return {"message": "Secret added successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    

# get single key value
@secret_router.get("/{key}")
async def get_secret(key: str):
    try:
        secret = client.get_secret(key)
        return {"key": key, "value": secret.value}
    except Exception as e:
        raise HTTPException(status_code=404, detail=f"Secret not found: {str(e)}")
    
# get all keys
@secret_router.get("/all")
async def get_all_secrets():
    try:
        secrets = client.list_properties_of_secrets()
        secret_list = []
        for secret in secrets:
            secret_value = client.get_secret(secret.name)
            secret_list.append({"key": secret.name, "value": secret_value.value})
        return {"secrets": secret_list}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))