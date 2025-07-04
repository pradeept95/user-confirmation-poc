import re
import asyncio
from typing import Dict, List, Any, Optional
from io import BytesIO
import requests
import urllib3
from pathlib import Path

# Specialized libraries for better PDF processing
import pdfplumber
import pymupdf4llm  # Advanced PDF to markdown conversion
import markdownify  # HTML to markdown conversion
from pydantic import BaseModel
from fastapi import HTTPException
import logging

# Disable SSL warnings
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class PDFProcessingResult(BaseModel):
    """Result model for PDF processing"""
    success: bool
    markdown_content: str
    error_message: Optional[str] = None
    metadata: Dict[str, Any] = {}


class AdvancedPDFProcessor:
    """Advanced PDF to Markdown processor using multiple libraries"""
    
    def __init__(self):
        self.session = requests.Session()
        self.session.verify = False
        
    async def process_pdf_from_url(
        self, 
        url: str, 
        method: str = "pymupdf4llm",
        session_id: Optional[str] = None
    ) -> PDFProcessingResult:
        """
        Process PDF from URL with support for session-based cancellation
        """
        try:
            logger.info(f"Processing PDF from URL: {url} using method: {method}")
            
            # Download PDF with progress tracking
            response = await self._download_pdf(url, session_id)
            if not response:
                raise HTTPException(status_code=400, detail="Failed to download PDF")
                
            pdf_content = response.content
            
            # Process based on selected method
            if method == "pymupdf4llm":
                result = await self._process_with_pymupdf4llm(pdf_content, session_id)
            elif method == "pdfplumber":
                result = await self._process_with_pdfplumber(pdf_content, session_id)
            elif method == "hybrid":
                result = await self._process_hybrid(pdf_content, session_id)
            else:
                raise ValueError(f"Unsupported method: {method}")
            
            return result
            
        except Exception as e:
            logger.error(f"Error processing PDF: {str(e)}")
            return PDFProcessingResult(
                success=False,
                markdown_content="",
                error_message=str(e)
            )
    
    async def _download_pdf(self, url: str, session_id: Optional[str] = None) -> Optional[requests.Response]:
        """Download PDF with session support for cancellation"""
        try:
            # Check if session is cancelled
            if session_id and await self._is_session_cancelled(session_id):
                return None
                
            response = self.session.get(url, timeout=30)
            response.raise_for_status()
            return response
        except Exception as e:
            logger.error(f"Error downloading PDF: {str(e)}")
            return None
    
    async def _process_with_pymupdf4llm(
        self, 
        pdf_content: bytes, 
        session_id: Optional[str] = None
    ) -> PDFProcessingResult:
        """Process PDF using pymupdf4llm - best for LLM-ready markdown"""
        try:
            # Check cancellation
            if session_id and await self._is_session_cancelled(session_id):
                return PDFProcessingResult(success=False, markdown_content="", error_message="Cancelled")
            
            # Save to temporary file
            temp_path = Path("temp_pdf.pdf")
            temp_path.write_bytes(pdf_content)
            
            # Extract markdown with advanced formatting
            markdown_content = pymupdf4llm.to_markdown(
                str(temp_path),
                page_chunks=True,
                write_images=False,
                embed_images=False,
                show_progress=True,
                margins=(0, 0, 0, 0),
                dpi=150
            )
            
            # Clean up
            temp_path.unlink(missing_ok=True)
            
            # Post-process markdown
            processed_content = await self._post_process_markdown(markdown_content)
            
            return PDFProcessingResult(
                success=True,
                markdown_content=processed_content,
                metadata={"method": "pymupdf4llm", "pages": "auto-detected"}
            )
            
        except Exception as e:
            logger.error(f"Error with pymupdf4llm: {str(e)}")
            return PDFProcessingResult(
                success=False,
                markdown_content="",
                error_message=str(e)
            )
    
    async def _process_with_pdfplumber(
        self, 
        pdf_content: bytes, 
        session_id: Optional[str] = None
    ) -> PDFProcessingResult:
        """Process PDF using pdfplumber - best for tables and structured content"""
        try:
            # Check cancellation
            if session_id and await self._is_session_cancelled(session_id):
                return PDFProcessingResult(success=False, markdown_content="", error_message="Cancelled")
            
            pdf_file = BytesIO(pdf_content)
            markdown_content = ""
            page_count = 0
            
            with pdfplumber.open(pdf_file) as pdf:
                for page_num, page in enumerate(pdf.pages):
                    # Check cancellation between pages
                    if session_id and await self._is_session_cancelled(session_id):
                        return PDFProcessingResult(success=False, markdown_content="", error_message="Cancelled")
                    
                    if page_num > 0:
                        markdown_content += "\n\n---\n\n"
                    
                    # Extract text
                    text = page.extract_text()
                    if text:
                        markdown_content += text + "\n\n"
                    
                    # Extract tables
                    tables = page.extract_tables()
                    for table in tables:
                        if table:
                            markdown_content += self._table_to_markdown(table) + "\n\n"
                    
                    page_count += 1
            
            # Post-process markdown
            processed_content = await self._post_process_markdown(markdown_content)
            
            return PDFProcessingResult(
                success=True,
                markdown_content=processed_content,
                metadata={"method": "pdfplumber", "pages": page_count}
            )
            
        except Exception as e:
            logger.error(f"Error with pdfplumber: {str(e)}")
            return PDFProcessingResult(
                success=False,
                markdown_content="",
                error_message=str(e)
            )
    
    async def _process_hybrid(
        self, 
        pdf_content: bytes, 
        session_id: Optional[str] = None
    ) -> PDFProcessingResult:
        """Hybrid approach combining multiple methods"""
        try:
            # Try pymupdf4llm first
            result = await self._process_with_pymupdf4llm(pdf_content, session_id)
            
            if result.success and len(result.markdown_content) > 100:
                result.metadata["method"] = "hybrid-pymupdf4llm"
                return result
            
            # Fallback to pdfplumber
            logger.info("Falling back to pdfplumber method")
            result = await self._process_with_pdfplumber(pdf_content, session_id)
            if result.success:
                result.metadata["method"] = "hybrid-pdfplumber"
            
            return result
            
        except Exception as e:
            logger.error(f"Error with hybrid processing: {str(e)}")
            return PDFProcessingResult(
                success=False,
                markdown_content="",
                error_message=str(e)
            )
    
    def _table_to_markdown(self, table: List[List[str]]) -> str:
        """Convert table to markdown format"""
        if not table:
            return ""
        
        markdown = ""
        for i, row in enumerate(table):
            if row:
                # Clean cells
                cleaned_row = [str(cell).strip() if cell else "" for cell in row]
                markdown += "| " + " | ".join(cleaned_row) + " |\n"
                
                # Add header separator after first row
                if i == 0:
                    markdown += "| " + " | ".join(["---"] * len(cleaned_row)) + " |\n"
        
        return markdown
    
    async def _post_process_markdown(self, content: str) -> str:
        """Advanced post-processing of markdown content"""
        # Remove excessive whitespace
        content = re.sub(r'\n{3,}', '\n\n', content)
        
        # Fix common markdown issues
        content = re.sub(r'\*\*\s+\*\*', '', content)  # Empty bold
        content = re.sub(r'\*\s+\*', '', content)      # Empty italic
        content = re.sub(r'~~\s+~~', '', content)      # Empty strikethrough
        
        # Fix bullet points
        content = re.sub(r'^\s*[•·▪▫◦‣⁃]\s', '- ', content, flags=re.MULTILINE)
        
        # Fix numbered lists
        content = re.sub(r'^\s*(\d+)[\.\)]\s', r'\1. ', content, flags=re.MULTILINE)
        
        # Clean up special characters
        replacements = {
            ''': "'", ''': "'", '"': '"', '"': '"',
            '–': '-', '—': '--', '…': '...',
            '®': '&reg;', '©': '&copy;', '™': '&trade;'
        }
        
        for old, new in replacements.items():
            content = content.replace(old, new)
        
        # Normalize whitespace
        content = re.sub(r'[ \t]+', ' ', content)
        content = re.sub(r'\n[ \t]+\n', '\n\n', content)
        
        return content.strip()
    
    async def _is_session_cancelled(self, session_id: str) -> bool:
        """Check if session is cancelled - implement based on your session management"""
        # This would integrate with your WebSocket-based session management
        # For now, return False (not cancelled)
        return False


# FastAPI integration
from fastapi import FastAPI, BackgroundTasks
from fastapi.responses import FileResponse

app = FastAPI()
processor = AdvancedPDFProcessor()

@app.post("/process-pdf")
async def process_pdf_endpoint(
    url: str,
    method: str = "hybrid",
    session_id: Optional[str] = None
):
    """Process PDF from URL and return markdown"""
    result = await processor.process_pdf_from_url(url, method, session_id)
    return result

@app.post("/process-pdf-background")
async def process_pdf_background(
    background_tasks: BackgroundTasks,
    url: str,
    method: str = "hybrid",
    session_id: Optional[str] = None
):
    """Process PDF in background with session support"""
    background_tasks.add_task(
        processor.process_pdf_from_url, 
        url, 
        method, 
        session_id
    )
    return {"message": "Processing started", "session_id": session_id}


# Example usage
if __name__ == "__main__":
    import asyncio
    
    async def main():
        processor = AdvancedPDFProcessor()
        
        url = "https://impaciiservice.ninds.nih.gov/ERAImage.aspx?IMG_TYPE=SS&APPL_ID=9984088"
        
        # Process with different methods
        for method in ["pymupdf4llm", "pdfplumber", "hybrid"]:
            print(f"\n--- Processing with {method} ---")
            result = await processor.process_pdf_from_url(url, method)
            
            if result.success:
                print(f"Success! Length: {len(result.markdown_content)}")
                print(f"Metadata: {result.metadata}")
                
                # Save to file
                with open(f"output_{method}.md", "w", encoding="utf-8") as f:
                    f.write(result.markdown_content)
            else:
                print(f"Failed: {result.error_message}")
    
    asyncio.run(main())