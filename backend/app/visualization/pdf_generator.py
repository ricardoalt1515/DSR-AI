"""
Professional PDF generator for opportunity reports.
Audience-aware rendering with optional charts.

This module serves as the orchestrator, delegating to:
- pdf_styles.py: CSS styles and color constants
- pdf_templates.py: HTML document templates
- pdf_sections.py: Section builders
"""

from datetime import datetime
from io import BytesIO
from typing import Any

import markdown
import structlog
from weasyprint import CSS, HTML
from weasyprint.text.fonts import FontConfiguration

from app.visualization.pdf_sections import (
    build_business_sections,
    build_charts_section,
)
from app.visualization.pdf_styles import get_professional_css
from app.visualization.pdf_templates import (
    get_cover_template,
    get_document_template,
    get_footer_template,
    get_markdown_section_template,
)

logger = structlog.get_logger(__name__)


class ProfessionalPDFGenerator:
    """Corporate-level PDF generator for opportunity reports."""

    def __init__(self):
        self.font_config = FontConfiguration()

    async def create_pdf(
        self,
        markdown_content: str,
        metadata: dict[str, Any],
        charts: dict[str, str],
        conversation_id: str,
    ) -> str | None:
        """
        Generate professional PDF with report content and visualizations.

        Args:
            markdown_content: Proposal narrative content in markdown format
            metadata: Report metadata and chart inputs
            charts: Optional base64-encoded charts dict.
                    Expected keys: 'process_flow', 'financial_executive'
            conversation_id: Unique identifier for the conversation

        Returns:
            str: Download URL/path for generated PDF, or None if generation failed

        Note: metadata may include chart inputs for internal reports.
        """
        try:
            logger.info(f"Generating report PDF for conversation {conversation_id}")

            html_content = self._create_technical_html(markdown_content, metadata, charts)
            css_content = get_professional_css()

            pdf_buffer = BytesIO()
            html_doc = HTML(string=html_content)
            css_doc = CSS(string=css_content)
            html_doc.write_pdf(pdf_buffer, stylesheets=[css_doc], font_config=self.font_config)

            pdf_filename = (
                f"proposals/opportunity_report_{conversation_id}_"
                f"{datetime.now().strftime('%Y%m%d_%H%M')}.pdf"
            )

            from app.services.s3_service import (
                USE_S3,
                upload_file_to_s3,
            )

            pdf_buffer.seek(0)
            await upload_file_to_s3(pdf_buffer, pdf_filename, "application/pdf")

            if USE_S3:
                logger.info(f"PDF uploaded to S3: {pdf_filename}")
            else:
                logger.info(f"PDF saved locally: {pdf_filename}")

            return pdf_filename

        except Exception as e:
            logger.error(f"Error generating PDF: {e}", exc_info=True)
            return None

    def _create_technical_html(
        self,
        markdown_content: str,
        metadata: dict[str, Any],
        charts: dict[str, str],
    ) -> str:
        """
        Create complete HTML for waste upcycling business reports.

        The agent output (ProposalOutput) is passed in metadata["proposal"].
        """
        md_html = markdown.markdown(markdown_content or "", extensions=["tables", "fenced_code"])

        proposal_data = metadata.get("proposal") or {}
        audience = metadata.get("audience", "internal")

        report_title = (
            "Opportunity Report" if audience == "internal" else "Sustainability Opportunity Report"
        )
        audience_label = "Internal" if audience == "internal" else "Client"

        client_name = (
            metadata.get("client_name")
            or proposal_data.get("client")
            or proposal_data.get("client_name")
            or proposal_data.get("clientName")
            or "Client"
        )
        facility_type = (
            metadata.get("facility_type")
            or proposal_data.get("facility_type")
            or proposal_data.get("facilityType")
            or "Facility"
        )
        location = (
            metadata.get("client_location")
            or proposal_data.get("location")
            or "Location not specified"
        )

        context = metadata.get("context") or {}

        # Build cover page
        cover_html = get_cover_template(
            report_title=report_title,
            audience_label=audience_label,
            proposal_title=(report_title if audience == "internal" else "Sustainability Report"),
            facility_type=facility_type,
            client_name=client_name,
            location=location,
        )

        # Build business sections
        business_sections_html = build_business_sections(
            proposal_data=proposal_data,
            audience=audience,
            context=context if audience == "external" else None,
        )

        # Build charts section
        charts_section_html = build_charts_section(charts)

        # Build markdown section (internal only)
        markdown_section_html = ""
        if audience == "internal":
            markdown_section_html = get_markdown_section_template(md_html)

        # Build footer
        footer_html = get_footer_template()

        return get_document_template(
            report_title=report_title,
            client_name=client_name,
            cover_html=cover_html,
            business_sections_html=business_sections_html,
            charts_section_html=charts_section_html,
            markdown_section_html=markdown_section_html,
            footer_html=footer_html,
        )


# Global service instance
pdf_generator = ProfessionalPDFGenerator()
