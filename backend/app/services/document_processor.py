"""Document processing service for project files.

Currently supports image files (jpg/jpeg/png) using the configured OpenAI
model with vision capabilities. Returns a dict with `text` (summary) and
`analysis` (structured JSON) that can be stored on `ProjectFile`.

This module is intentionally small and focused so it can be reused from
multiple HTTP endpoints (waste, water, invoices, etc.).
"""

from typing import Any, BinaryIO
import base64
import json
import logging
import mimetypes

from openai import AsyncOpenAI

from app.core.config import settings

logger = logging.getLogger(__name__)


class DocumentProcessor:
    """Minimal document processor for AI analysis of project files.

    Design goals:
    - Keep this class small and stateless (per-instance OpenAI client).
    - Focus on deterministic IO contract: BinaryIO in, dict out.
    - Make it easy to extend with additional handlers (PDF, Excel, etc.).
    """

    def __init__(self, model: str | None = None) -> None:
        self._model = model or settings.OPENAI_MODEL
        self._client = AsyncOpenAI()

    async def process(
        self,
        file_content: BinaryIO,
        filename: str,
        file_type: str,
    ) -> dict[str, Any]:
        """Process a file with AI based on its type/extension.

        Currently only image types are supported. For unsupported types a
        ValueError is raised so callers can decide how to handle it.
        """

        extension = file_type.lstrip(".").lower()
        if extension in ("jpg", "jpeg", "png"):
            return await self._process_image(file_content, filename, extension)

        raise ValueError(f"Unsupported file type for AI processing: {extension}")

    async def _process_image(
        self,
        file_content: BinaryIO,
        filename: str,
        extension: str,
    ) -> dict[str, Any]:
        """Analyze an image of a waste resource using a vision model.

        Returns:
            dict with keys:
            - `text`: short human-readable summary
            - `analysis`: structured JSON-ready dict
        """

        data = file_content.read()
        if not data:
            raise ValueError(f"Empty image file: {filename}")

        mime_type = mimetypes.types_map.get(f".{extension}", "image/jpeg")
        base64_image = base64.b64encode(data).decode("utf-8")
        image_url = f"data:{mime_type};base64,{base64_image}"

        prompt = (
            "You are an expert in industrial waste upcycling.\n"
            "You receive a photo of a waste resource.\n"
            "Analyse the image and return ONLY a single JSON object with these fields: \n"
            "{"  # JSON object start
            '"type": "waste_photo",'
            '"materialAppearance": string,'
            '"visibleContaminants": string[],'
            '"packaging": string,'
            '"moistureLevel": string,'
            '"estimatedHomogeneity": string,'
            '"safetyRisks": string[],'
            '"commentsForUpcycling": string,'
            '"summary": string,'
            '"confidence": "High" | "Medium" | "Low"'
            "}"
        )

        response = await self._client.chat.completions.create(
            model=self._model,
            messages=[
                {
                    "role": "user",
                    "content": [
                        {"type": "text", "text": prompt},
                        {"type": "image_url", "image_url": {"url": image_url}},
                    ],
                }
            ],
        )

        message_content = response.choices[0].message.content or ""
        try:
            analysis = json.loads(message_content)
        except json.JSONDecodeError:
            logger.warning("Image analysis response was not valid JSON; storing raw output")
            analysis = {"raw_output": message_content}

        summary = analysis.get("summary")
        if not isinstance(summary, str) or not summary.strip():
            summary = f"Waste resource image analysis for {filename}"

        return {
            "text": summary,
            "analysis": analysis,
        }
