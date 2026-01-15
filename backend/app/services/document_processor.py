"""Document processing service for project files.

This module serves as an ORCHESTRATOR that delegates to specialized agents:
- Images (jpg/jpeg/png) → image_analysis_agent (pydantic-ai)
- PDFs → (future) pdf_analysis_agent
- Spreadsheets → (future) direct parsing

Returns a dict with `text` (summary) and `analysis` (structured JSON)
that can be stored on `ProjectFile`.
"""

import mimetypes
from typing import Any, BinaryIO

import structlog

logger = structlog.get_logger(__name__)


class DocumentProcessor:
    """Document processor that delegates to specialized AI agents.

    Design goals:
    - Act as orchestrator/router for different file types
    - Delegate actual analysis to typed pydantic-ai agents
    - Maintain simple IO contract: BinaryIO in, dict out
    - Easy to extend with additional handlers (PDF, Excel, etc.)
    """

    async def process(
        self,
        file_content: BinaryIO,
        filename: str,
        file_type: str,
        project_sector: str | None = None,
        project_subsector: str | None = None,
    ) -> dict[str, Any]:
        """Process a file with AI based on its type/extension.

        Args:
            file_content: Binary file content
            filename: Original filename
            file_type: File extension (with or without dot)
            project_sector: Optional sector for context
            project_subsector: Optional subsector for context

        Returns:
            dict with `text` (summary) and `analysis` (structured data)

        Raises:
            ValueError: For unsupported file types
        """
        extension = file_type.lstrip(".").lower()

        if extension in ("jpg", "jpeg", "png"):
            return await self._process_image(
                file_content, filename, extension, project_sector, project_subsector
            )

        # Future: PDF handling
        # if extension == "pdf":
        #     return await self._process_pdf(file_content, filename)

        raise ValueError(f"Unsupported file type for AI processing: {extension}")

    async def _process_image(
        self,
        file_content: BinaryIO,
        filename: str,
        extension: str,
        project_sector: str | None = None,
        project_subsector: str | None = None,
    ) -> dict[str, Any]:
        """Delegate image analysis to the dedicated image_analysis_agent.

        Returns:
            dict with keys:
            - `text`: short human-readable summary
            - `analysis`: structured JSON-ready dict (ImageAnalysisOutput)
        """
        # Import here to avoid circular imports
        from app.agents.image_analysis_agent import ImageAnalysisError, analyze_image

        data = file_content.read()
        if not data:
            raise ValueError(f"Empty image file: {filename}")

        mime_type = mimetypes.types_map.get(f".{extension}", "image/jpeg")

        try:
            # Delegate to pydantic-ai agent
            result = await analyze_image(
                image_data=data,
                filename=filename,
                media_type=mime_type,
                project_sector=project_sector,
                project_subsector=project_subsector,
            )

            # Convert typed output to dict for storage
            return {
                "text": result.summary,
                "analysis": result.model_dump(),
            }

        except ImageAnalysisError as e:
            logger.error(f"Image analysis failed: {e}")
            # Return a minimal fallback response
            return {
                "text": f"Image analysis failed for {filename}",
                "analysis": {"error": str(e), "filename": filename},
            }
