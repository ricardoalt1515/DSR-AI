"""
Professional PDF generator for opportunity reports.
Audience-aware rendering with optional charts.
"""

import structlog
import asyncio
from datetime import datetime
from typing import Dict, Any, Optional
import markdown
from weasyprint import HTML, CSS
from weasyprint.text.fonts import FontConfiguration
from io import BytesIO

logger = structlog.get_logger(__name__)


class ProfessionalPDFGenerator:
    """Corporate-level PDF generator for opportunity reports."""

    def __init__(self):
        self.font_config = FontConfiguration()

    async def create_pdf(
        self,
        markdown_content: str,
        metadata: Dict[str, Any],
        charts: Dict[str, str],
        conversation_id: str,
    ) -> Optional[str]:
        """
        Generate professional PDF with report content and visualizations

        Args:
            markdown_content: Proposal narrative content in markdown format
            metadata: Report metadata and chart inputs
            charts: Optional base64-encoded charts dict. Expected keys: 'process_flow', 'financial_executive'
            conversation_id: Unique identifier for the conversation

        Returns:
            str: Download URL/path for generated PDF, or None if generation failed

        Note: metadata may include chart inputs for internal reports.
        """
        try:
            logger.info(
                f"Generating report PDF for conversation {conversation_id}"
            )

            # Prepare HTML and CSS
            html_content = self._create_technical_html(
                markdown_content, metadata, charts
            )
            css_content = self._get_professional_css()

            # Generate PDF IN MEMORY (not on disk)
            pdf_buffer = BytesIO()
            html_doc = HTML(string=html_content)
            css_doc = CSS(string=css_content)
            html_doc.write_pdf(
                pdf_buffer, stylesheets=[css_doc], font_config=self.font_config
            )

            # Upload to S3 or save locally
            pdf_filename = f"proposals/opportunity_report_{conversation_id}_{datetime.now().strftime('%Y%m%d_%H%M')}.pdf"

            from app.services.s3_service import (
                upload_file_to_s3,
                get_presigned_url,
                USE_S3,
            )

            pdf_buffer.seek(0)  # Reset pointer
            await upload_file_to_s3(pdf_buffer, pdf_filename, "application/pdf")

            # Log correctly according to mode
            if USE_S3:
                logger.info(f"PDF uploaded to S3: {pdf_filename}")
            else:
                logger.info(f"PDF saved locally: {pdf_filename}")

            # ✅ Return RELATIVE filename (without /uploads/ prefix)
            # This allows s3_service to construct the correct path
            return pdf_filename  # e.g., "proposals/opportunity_report_xyz.pdf"

        except Exception as e:
            logger.error(f"Error generating PDF: {e}", exc_info=True)
            return None

    def _create_technical_html(
        self, markdown_content: str, metadata: Dict[str, Any], charts: Dict[str, str]
    ) -> str:
        """
        Create complete HTML for waste upcycling business reports.

        The new agent output (ProposalOutput) is passed in metadata["proposal"].
        Legacy chart inputs (metadata["data_for_charts"]) are ignored for
        content rendering, but may still be used by chart generators.
        """
        # Convert markdown to HTML (for optional full report section)
        md_html = markdown.markdown(
            markdown_content or "", extensions=["tables", "fenced_code"]
        )

        # Extract ProposalOutput-based data (defensive against missing keys)
        proposal_data = metadata.get("proposal") or {}

        audience = metadata.get("audience", "internal")
        report_title = (
            "Opportunity Report"
            if audience == "internal"
            else "Sustainability Opportunity Report"
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

        # Build new business-focused sections
        business_sections = self._create_business_sections(proposal_data)

        # Charts section (may still rely on legacy metadata structure)
        charts_section = self._create_charts_section(charts)

        html_content = f"""
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>{report_title} - {client_name}</title>
        </head>
        <body>
            <!-- COVER PAGE -->
            <div class="cover-page">
                <div class="header-logo">
                    <h1>{report_title}</h1>
                    <p class="subtitle">Audience: {audience_label}</p>
                </div>
                
                <div class="cover-content">
                    <h2 class="proposal-title">{report_title}</h2>
                    <h3 class="client-name">{facility_type}</h3>
                    <h4 class="company-name">{client_name}</h4>
                    
                    <div class="cover-details">
                        <p><strong>Date:</strong> {datetime.now().strftime("%B %d, %Y")}</p>
                        <p><strong>Location:</strong> {location}</p>
                    </div>
                </div>
                
                <div class="cover-footer">
                    <p>Confidential Document - For Intended Recipient Only</p>
                </div>
            </div>
            
            <!-- BUSINESS OPPORTUNITY & LCA SECTIONS -->
            {business_sections}
            
            <!-- VISUALIZATIONS AND CHARTS (optional) -->
            {charts_section}
            
            <!-- FULL MARKDOWN REPORT (optional) -->
            <div class="technical-section">
                <h2 class="section-title">Report Details</h2>
                {md_html}
            </div>
            
            <!-- FOOTER PAGE -->
            <div class="footer-page">
                <div class="contact-info">
                    <h3>Report Contact</h3>
                    <p>Contact your project representative for next steps.</p>
                </div>
                
                <div class="disclaimer">
                    <h4>Legal Notice</h4>
                    <p>This business opportunity report was generated using artificial intelligence based on 
                    information provided by the client and public market data. While every effort has been made to 
                    ensure accuracy, financial estimates and strategic recommendations may contain errors and are 
                    not legally binding. All investment decisions should be validated by authorized stakeholders 
                    before execution.</p>
                </div>
            </div>
        </body>
        </html>
        """

        return html_content

    def _create_business_sections(self, proposal_data: Dict[str, Any]) -> str:
        """Create business-focused sections from internal or external data."""
        if not proposal_data:
            return ""

        sections: list[str] = []

        if proposal_data.get("sustainability"):
            sustainability = proposal_data.get("sustainability") or {}
            profitability_band = (
                proposal_data.get("profitability_band")
                or proposal_data.get("profitabilityBand")
                or "Unknown"
            )
            end_use_examples = (
                proposal_data.get("end_use_industry_examples")
                or proposal_data.get("endUseIndustryExamples")
                or []
            )

            summary = sustainability.get("summary") or "Sustainability summary pending."
            overall_impact = sustainability.get("overall_environmental_impact") or sustainability.get(
                "overallEnvironmentalImpact"
            ) or "Environmental impact summary pending."

            def format_metric(metric: Dict[str, Any]) -> str:
                status = metric.get("status", "not_computed")
                value = metric.get("value") or "Not computed"
                basis = metric.get("basis") or "N/A"
                data_needed = metric.get("data_needed") or metric.get("dataNeeded") or []
                data_text = "<br/>".join(data_needed) if data_needed else "N/A"
                return f"""
                <p><strong>Status:</strong> {status}</p>
                <p><strong>Value:</strong> {value}</p>
                <p><strong>Basis:</strong> {basis}</p>
                <p><strong>Data Needed:</strong> {data_text}</p>
                """

            co2 = sustainability.get("co2e_reduction") or sustainability.get("co2eReduction") or {}
            water = sustainability.get("water_savings") or sustainability.get("waterSavings") or {}
            circularity = sustainability.get("circularity") or []

            external_html = """
            <div class="technical-section">
                <h2 class="section-title">Sustainability Summary</h2>
            """
            external_html += f"<p>{summary}</p>"
            external_html += "<h3>CO2e Reduction</h3>"
            external_html += format_metric(co2)
            external_html += "<h3>Water Savings</h3>"
            external_html += format_metric(water)

            if circularity:
                external_html += "<h3>Circularity Indicators</h3><ul>"
                for indicator in circularity:
                    name = indicator.get("name") or "Indicator"
                    metric = indicator.get("metric") or {}
                    external_html += f"<li><strong>{name}</strong>{format_metric(metric)}</li>"
                external_html += "</ul>"

            external_html += f"<p><strong>Overall Impact:</strong> {overall_impact}</p>"
            external_html += f"<p><strong>Profitability Band:</strong> {profitability_band}</p>"
            if end_use_examples:
                external_html += "<h3>End-Use Industry Examples</h3><ul>"
                for item in end_use_examples:
                    external_html += f"<li>{item}</li>"
                external_html += "</ul>"
            external_html += "</div>"
            sections.append(external_html)
            return "\n".join(sections)

        recommendation = proposal_data.get("recommendation") or "INVESTIGATE"
        headline = proposal_data.get("headline") or "Opportunity summary pending."
        confidence = proposal_data.get("confidence") or "Medium"
        client = proposal_data.get("client") or "Client"
        location = proposal_data.get("location") or "Location not specified"
        material = proposal_data.get("material") or "Material details pending."
        volume = proposal_data.get("volume") or "Volume pending."

        financials = proposal_data.get("financials") or {}
        current_cost = financials.get("current_cost") or financials.get("currentCost") or "N/A"
        offer_terms = financials.get("offer_terms") or financials.get("offerTerms") or "N/A"
        estimated_margin = financials.get("estimated_margin") or financials.get("estimatedMargin") or "N/A"

        economics = proposal_data.get("economics_deep_dive") or proposal_data.get("economicsDeepDive") or {}
        profitability_band = economics.get("profitability_band") or economics.get("profitabilityBand") or "Unknown"
        profitability_summary = economics.get("profitability_summary") or economics.get(
            "profitabilitySummary"
        ) or "Summary pending."

        environment = proposal_data.get("environment") or {}
        safety = proposal_data.get("safety") or {}
        pathways = proposal_data.get("pathways") or []

        internal_html = """
        <div class="technical-section">
            <h2 class="section-title">Executive Summary</h2>
        """
        internal_html += f"<p><strong>Decision:</strong> {recommendation}</p>"
        internal_html += f"<p><strong>Headline:</strong> {headline}</p>"
        internal_html += f"<p><strong>Confidence:</strong> {confidence}</p>"
        internal_html += "</div>"

        internal_html += """
        <div class="technical-section">
            <h2 class="section-title">Project Context</h2>
            <table class="equipment-table">
                <thead>
                    <tr>
                        <th>Parameter</th>
                        <th>Value</th>
                    </tr>
                </thead>
                <tbody>
        """
        internal_html += f"<tr><td class=\"stage-name\">Client</td><td>{client}</td></tr>"
        internal_html += f"<tr><td class=\"stage-name\">Location</td><td>{location}</td></tr>"
        internal_html += f"<tr><td class=\"stage-name\">Material</td><td>{material}</td></tr>"
        internal_html += f"<tr><td class=\"stage-name\">Volume</td><td>{volume}</td></tr>"
        internal_html += """
                </tbody>
            </table>
        </div>
        """
        sections.append(internal_html)

        finance_html = """
        <div class="technical-section">
            <h2 class="section-title">Financial Snapshot</h2>
            <table class="equipment-table">
                <thead>
                    <tr>
                        <th>Current Cost</th>
                        <th>Offer Terms</th>
                        <th>Estimated Margin</th>
                    </tr>
                </thead>
                <tbody>
        """
        finance_html += f"<tr><td>{current_cost}</td><td>{offer_terms}</td><td>{estimated_margin}</td></tr>"
        finance_html += """
                </tbody>
            </table>
        </div>
        """
        sections.append(finance_html)

        econ_html = """
        <div class="technical-section">
            <h2 class="section-title">Economics Deep Dive</h2>
        """
        econ_html += f"<p><strong>Profitability Band:</strong> {profitability_band}</p>"
        econ_html += f"<p>{profitability_summary}</p>"

        cost_breakdown = economics.get("cost_breakdown") or economics.get("costBreakdown") or []
        if cost_breakdown:
            econ_html += "<h3>Cost Breakdown</h3><ul>"
            for item in cost_breakdown:
                econ_html += f"<li>{item}</li>"
            econ_html += "</ul>"

        scenarios = economics.get("scenario_summary") or economics.get("scenarioSummary") or []
        if scenarios:
            econ_html += "<h3>Scenarios</h3><ul>"
            for item in scenarios:
                econ_html += f"<li>{item}</li>"
            econ_html += "</ul>"

        assumptions = economics.get("assumptions") or []
        if assumptions:
            econ_html += "<h3>Assumptions</h3><ul>"
            for item in assumptions:
                econ_html += f"<li>{item}</li>"
            econ_html += "</ul>"

        data_gaps = economics.get("data_gaps") or economics.get("dataGaps") or []
        if data_gaps:
            econ_html += "<h3>Data Gaps</h3><ul>"
            for item in data_gaps:
                econ_html += f"<li>{item}</li>"
            econ_html += "</ul>"

        econ_html += "</div>"
        sections.append(econ_html)

        env_html = """
        <div class="technical-section">
            <h2 class="section-title">Environmental Impact</h2>
        """
        co2_avoided = environment.get("co2_avoided") or environment.get("co2Avoided") or "N/A"
        esg_headline = environment.get("esg_headline") or environment.get("esgHeadline") or "N/A"
        current_harm = environment.get("current_harm") or environment.get("currentHarm") or "N/A"
        env_html += f"<p><strong>CO2 Avoided:</strong> {co2_avoided}</p>"
        env_html += f"<p><strong>ESG Headline:</strong> {esg_headline}</p>"
        env_html += f"<p><strong>If Not Diverted:</strong> {current_harm}</p>"
        env_html += "</div>"
        sections.append(env_html)

        safety_html = """
        <div class="technical-section">
            <h2 class="section-title">Safety & Handling</h2>
        """
        hazard = safety.get("hazard") or "Low"
        warnings = safety.get("warnings") or "N/A"
        storage = safety.get("storage") or "N/A"
        safety_html += f"<p><strong>Hazard:</strong> {hazard}</p>"
        safety_html += f"<p><strong>Warnings:</strong> {warnings}</p>"
        safety_html += f"<p><strong>Storage:</strong> {storage}</p>"
        safety_html += "</div>"
        sections.append(safety_html)

        if pathways:
            pathways_html = """
            <div class="technical-section">
                <h2 class="section-title">Business Pathways</h2>
            """
            for idx, pathway in enumerate(pathways, 1):
                action = pathway.get("action") or f"Pathway {idx}"
                buyer_types = pathway.get("buyer_types") or pathway.get("buyerTypes") or "N/A"
                price_range = pathway.get("price_range") or pathway.get("priceRange") or "N/A"
                annual_value = pathway.get("annual_value") or pathway.get("annualValue") or "N/A"
                feasibility = pathway.get("feasibility") or "Medium"
                pathways_html += f"""
                <h3>{action}</h3>
                <p><strong>Buyers:</strong> {buyer_types}</p>
                <p><strong>Price:</strong> {price_range}</p>
                <p><strong>Annual Value:</strong> {annual_value}</p>
                <p><strong>Feasibility:</strong> {feasibility}</p>
                """
            pathways_html += "</div>"
            sections.append(pathways_html)

        return "\n".join(sections)

    def _create_charts_section(self, charts: Dict[str, str]) -> str:
        """
        Crea sección de gráficos estratégicos para formato cliente
        Enfoque: Calidad profesional > Cantidad de gráficos
        """
        if not charts:
            return ""

        html = """
        <div class="charts-section">
            <h2 class="section-title">WASTE UPCYCLING ANALYTICS</h2>
            <p style="text-align: center; margin-bottom: 30px; font-style: italic; color: #666;">
                Data-driven visualizations of waste streams, diversion, savings, and revenue opportunities
            </p>
        """

        # Los 2 gráficos estratégicos principales PREMIUM
        essential_charts = [
            (
                "process_flow",
                "♻️ WASTE STREAMS & UPCYCLING PATHWAYS",
                "High-level flow of waste generation, segregation, and upcycling pathways designed for circular economy deals.",
            ),
            (
                "financial_executive",
                "ECONOMIC ANALYSIS: SAVINGS & REVENUE",
                "Executive view of generator savings, revenue potential, and landfill diversion benefits.",
            ),
        ]

        for chart_key, chart_title, chart_description in essential_charts:
            if chart_key in charts:
                chart_data = charts[chart_key]
                # Usar layout premium especializado para diagrama P&ID
                if chart_key == "process_flow":
                    html += f"""
                    <div class="chart-full-page pid-diagram">
                        <h3 class="chart-title">{chart_title}</h3>
                        <p class="chart-subtitle">{chart_description}</p>
                        <img src="data:image/png;base64,{chart_data}" class="chart-image" alt="{chart_title}">
                    </div>
                    """
                else:
                    html += f"""
                    <div class="chart-container">
                        <h3 class="chart-title">{chart_title}</h3>
                        <p class="chart-subtitle">{chart_description}</p>
                        <img src="data:image/png;base64,{chart_data}" class="chart-image" alt="{chart_title}">
                    </div>
                    """
            else:
                # Log de gráfico faltante para debugging
                html += f"""
                <div class="missing-chart-notice">
                    <h3>⚠️ {chart_title}</h3>
                    <p>Visualización no disponible - datos insuficientes</p>
                </div>
                """

        html += """
        <div class="charts-footer">
            <p><strong>Technical Note:</strong> All specifications, costs and schedules presented 
            están basados en estándares de la industria y pueden variar según condiciones específicas del sitio 
            y requerimientos particulares del cliente.</p>
        </div>
        </div>
        """
        return html

    def _get_professional_css(self) -> str:
        """
        Professional CSS for technical proposals
        """
        return """
        @page {
            size: A4;
            margin: 2cm 1.5cm;
            @bottom-center {
                content: "Opportunity Report | Page " counter(page);
                font-size: 10px;
                color: #666;
            }
        }
        
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: 'Arial', 'Helvetica', sans-serif;
            line-height: 1.6;
            color: #333;
            font-size: 11px;
        }
        
        /* PORTADA */
        .cover-page {
            page-break-after: always;
            height: 100vh;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
            text-align: center;
            background: white;
            color: #333;
            padding: 1cm 2cm 3cm 2cm;
            border: 1px solid #e5e7eb;
        }
        
        .header-logo h1 {
            font-size: 48px;
            font-weight: bold;
            margin-bottom: 10px;
            letter-spacing: 2px;
            color: #1e3a8a;
        }
        
        .header-logo .subtitle {
            font-size: 18px;
            font-weight: 300;
            color: #f97316;
        }
        
        .company-logo {
            margin-bottom: 0px;
            margin-top: -10px;
        }
        
        .logo-placeholder {
            height: 320px;
            width: 600px;
            margin: 0 auto 5px auto;
            border-radius: 8px;
            display: flex;
            align-items: center;
            justify-content: center;
            background: transparent;
            color: #64748b;
            font-size: 12px;
            font-weight: 500;
        }
        
        .logo-placeholder img {
            max-height: 320px;
            max-width: 600px;
            width: auto;
            height: auto;
            object-fit: contain;
        }
        
        .cover-content {
            flex-grow: 1;
            display: flex;
            flex-direction: column;
            justify-content: center;
        }
        
        .proposal-title {
            font-size: 36px;
            font-weight: bold;
            margin-bottom: 20px;
            text-transform: uppercase;
            letter-spacing: 1px;
            color: #1e3a8a;
        }
        
        .client-name {
            font-size: 24px;
            margin-bottom: 10px;
            font-weight: 300;
            color: #374151;
        }
        
        .company-name {
            font-size: 32px;
            font-weight: bold;
            margin-bottom: 40px;
            color: #16a34a;
        }
        
        .cover-details {
            background: #f8fafc;
            border: 2px solid #e2e8f0;
            padding: 20px;
            border-radius: 10px;
            margin: 20px auto;
            max-width: 400px;
        }
        
        .cover-details p {
            font-size: 14px;
            margin: 5px 0;
            color: #4b5563;
        }
        
        .cover-footer {
            color: #6b7280;
            font-size: 12px;
        }
        
        /* CONTENIDO PRINCIPAL */
        .main-content, .technical-section, .charts-section {
            margin-bottom: 30px;
        }
        
        /* IMÁGENES DE GRÁFICOS (Optimización para PDF) */
        .chart-container {
            page-break-inside: avoid;
            margin-bottom: 24px;
        }
        .chart-full-page.pid-diagram {
            page-break-inside: avoid;
            margin-bottom: 24px;
        }
        .chart-image {
            width: 100%;
            height: auto;
            display: block;
            margin: 8px auto 0 auto;
            page-break-inside: avoid;
        }
        .chart-full-page.pid-diagram .chart-image {
            /* Limitar altura para evitar cortes en A4 */
            max-height: 650px;
        }
        
        .section-title {
            font-size: 20px;
            font-weight: bold;
            color: #166534;
            margin: 30px 0 20px 0;
            padding-bottom: 10px;
            border-bottom: 3px solid #16a34a;
            page-break-after: avoid;
        }
        
        h1 {
            font-size: 24px;
            color: #1e3a8a;
            margin: 25px 0 15px 0;
            font-weight: bold;
        }
        
        h2 {
            font-size: 18px;
            color: #1e40af;
            margin: 20px 0 12px 0;
            font-weight: bold;
        }
        
        h3 {
            font-size: 16px;
            color: #2563eb;
            margin: 15px 0 10px 0;
            font-weight: bold;
        }
        
        h4 {
            font-size: 14px;
            color: #3b82f6;
            margin: 12px 0 8px 0;
            font-weight: bold;
        }
        
        p {
            margin-bottom: 10px;
            text-align: justify;
        }
        
        /* TABLAS PROFESIONALES ESTILO INGENIERIL */
        table {
            width: 100%;
            border-collapse: collapse;
            margin: 25px 0;
            font-size: 11px;
            page-break-inside: auto;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
            border-radius: 8px;
            overflow: hidden;
        }
        
        th {
            background: linear-gradient(135deg, #16a34a 0%, #22c55e 50%, #334155 100%);
            color: white;
            padding: 15px 12px;
            text-align: left;
            font-weight: bold;
            font-size: 12px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            border: none;
            position: relative;
        }
        
        th::after {
            content: '';
            position: absolute;
            bottom: 0;
            left: 0;
            right: 0;
            height: 2px;
            background: #3b82f6;
        }
        
        td {
            padding: 12px;
            border: 1px solid #e2e8f0;
            vertical-align: top;
            font-size: 11px;
            line-height: 1.4;
        }
        
        tr:nth-child(even) {
            background: linear-gradient(90deg, #f8fafc 0%, #ffffff 100%);
        }
        
        tr:nth-child(odd) {
            background: white;
        }
        
        tr:hover {
            background: linear-gradient(90deg, #e2e8f0 0%, #f1f5f9 100%);
            transform: scale(1.001);
            transition: all 0.2s ease;
        }
        
        /* TABLAS ESPECIALIZADAS ESTILO INGENIERIL */
        .equipment-table, .financial-table, .phases-table {
            width: 100%;
            border-collapse: collapse;
            margin: 25px 0;
            font-size: 12px;
            page-break-inside: auto;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
            border-radius: 10px;
            overflow: hidden;
            border: 2px solid #e2e8f0;
            table-layout: fixed;
        }
        
        .equipment-table th, .financial-table th, .phases-table th {
            background: linear-gradient(135deg, #166534 0%, #16a34a 40%, #f97316 100%);
            color: white;
            padding: 16px 12px;
            text-align: left;
            font-weight: bold;
            font-size: 12px;
            text-transform: uppercase;
            letter-spacing: 0.8px;
            border: none;
            position: relative;
            text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
        }
        
        .equipment-table th::before, .financial-table th::before, .phases-table th::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: linear-gradient(45deg, transparent 30%, rgba(255,255,255,0.1) 50%, transparent 70%);
        }
        
        .equipment-table td, .financial-table td, .phases-table td {
            padding: 12px 8px;
            border: 1px solid #e2e8f0;
            vertical-align: top;
            font-size: 11px;
            line-height: 1.4;
            position: relative;
            word-wrap: break-word;
            overflow-wrap: break-word;
        }
        
        .equipment-table tr:nth-child(even), .financial-table tr:nth-child(even), .phases-table tr:nth-child(even) {
            background: linear-gradient(90deg, #f8fafc 0%, #ffffff 50%, #f8fafc 100%);
        }
        
        .equipment-table tr:nth-child(odd), .financial-table tr:nth-child(odd), .phases-table tr:nth-child(odd) {
            background: white;
        }
        
        .equipment-table tr:hover, .financial-table tr:hover, .phases-table tr:hover {
            background: linear-gradient(90deg, #dbeafe 0%, #e0f2fe 50%, #dbeafe 100%);
            transform: scale(1.002);
            transition: all 0.3s ease;
            box-shadow: 0 2px 8px rgba(59, 130, 246, 0.15);
        }
        
        /* SPECIFIC STYLING FOR TECHNOLOGY JUSTIFICATION TABLE */
        .equipment-table.tech-justification {
            table-layout: fixed;
            width: 100%;
        }
        
        .equipment-table.tech-justification th:nth-child(1),
        .equipment-table.tech-justification td:nth-child(1) {
            width: 20%;
        }
        
        .equipment-table.tech-justification th:nth-child(2),
        .equipment-table.tech-justification td:nth-child(2) {
            width: 40%;
        }
        
        .equipment-table.tech-justification th:nth-child(3),
        .equipment-table.tech-justification td:nth-child(3) {
            width: 25%;
        }
        
        .equipment-table.tech-justification th:nth-child(4),
        .equipment-table.tech-justification td:nth-child(4) {
            width: 15%;
        }

        /* VISUAL EFFICIENCY BARS SECTION */
        .efficiency-visual-section {
            margin: 30px 0;
            padding: 20px;
            background: #f8fafc;
            border-radius: 10px;
        }

        .efficiency-bars {
            display: flex;
            flex-direction: column;
            gap: 15px;
            margin-top: 20px;
        }

        .efficiency-item {
            display: flex;
            align-items: center;
            padding: 12px 20px;
            border-radius: 8px;
            border: 2px solid;
            font-weight: bold;
        }

        .efficiency-item.efficiency-high {
            background: #d1fae5;
            border-color: #22c55e;
            color: #15803d;
        }

        .efficiency-item.efficiency-medium {
            background: #fef3c7;
            border-color: #f59e0b;
            color: #d97706;
        }

        .efficiency-item.efficiency-low {
            background: #fee2e2;
            border-color: #ef4444;
            color: #dc2626;
        }

        .efficiency-label {
            flex: 1;
            font-size: 14px;
            text-align: left;
        }

        .efficiency-value {
            font-size: 18px;
            font-weight: bold;
            text-align: center;
            min-width: 80px;
        }

        /* SYSTEM SUMMARY BOX */
        .system-summary-section {
            margin: 30px 0;
        }

        .system-summary-box {
            background: #e0f2fe;
            border: 2px solid #0284c7;
            border-radius: 10px;
            padding: 20px;
            margin: 20px 0;
        }

        .system-summary-box h4 {
            color: #0284c7;
            margin: 0 0 15px 0;
            text-align: center;
            font-size: 16px;
        }

        .summary-grid {
            display: flex;
            justify-content: space-around;
            flex-wrap: wrap;
            gap: 15px;
        }

        .summary-item {
            text-align: center;
            min-width: 120px;
        }

        .summary-label {
            display: block;
            font-size: 12px;
            color: #475569;
            margin-bottom: 5px;
        }

        .summary-value {
            display: block;
            font-size: 16px;
            font-weight: bold;
            color: #1e40af;
        }
        
        .numeric {
            text-align: right;
            font-weight: 600;
            font-family: 'Courier New', monospace;
            color: #1e40af;
            background: linear-gradient(90deg, transparent 0%, #f0f9ff 100%);
            padding-right: 16px !important;
        }
        
        .stage-name {
            font-weight: bold;
            color: #1e3a8a;
            text-transform: uppercase;
            font-size: 12px;
            letter-spacing: 0.5px;
            position: relative;
        }
        
        .stage-name::before {
            content: '*';
            margin-right: 8px;
            font-size: 14px;
        }
        
        .key-specs {
            display: block;
            color: #64748b;
            font-size: 10px;
            font-style: italic;
            text-transform: none;
            letter-spacing: 0;
        }
        
        .phase-name {
            font-weight: bold;
            color: #1e40af;
            text-transform: uppercase;
            font-size: 12px;
            letter-spacing: 0.5px;
        }
        
        .phase-name::before {
            content: '*';
            margin-right: 8px;
            font-size: 14px;
        }
        
        .total-row {
            background: linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%) !important;
            border-top: 3px solid #1e3a8a !important;
            border-bottom: 3px solid #1e3a8a !important;
            font-weight: bold !important;
            font-size: 12px !important;
        }
        
        .total-row td {
            padding: 16px 12px !important;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }
        
        /* Removed unused CSS for deleted sections: justification, efficiency-summary, summary-box/duration-box, and no-data-message */
        .summary-item {
            text-align: center;
        }
        
        .summary-item .label {
            display: block;
            font-size: 12px;
            color: #64748b;
            margin-bottom: 5px;
        }
        
        .summary-item .value {
            display: block;
            font-size: 16px;
            font-weight: bold;
            color: #1e3a8a;
        }
        
.charts-footer {
    margin-top: 40px;
    padding: 20px;
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    font-size: 10px;
    color: #64748b;
    text-align: center;
}
        
/* GRÁFICOS PREMIUM - CORREGIDO PARA WEASYPRINT */
.chart-container {
    margin: 30px 0;
    page-break-inside: avoid;
    text-align: center;
    padding: 15px;
    background: #f8fafc;
    border-radius: 8px;
    border: 1px solid #e2e8f0;
    width: 100%;
    max-width: 100%;
    overflow: hidden;
}
        
.chart-title {
    font-size: 16px;
    font-weight: bold;
    color: #1e3a8a;
    margin-bottom: 15px;
    text-align: center;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    padding-bottom: 8px;
    border-bottom: 2px solid #3b82f6;
}
        
.chart-image {
    max-width: 100%;
    width: 100%;
    height: auto;
    border: 1px solid #cbd5e1;
    border-radius: 4px;
    margin: 0 auto;
    display: block;
    background: white;
    padding: 5px;
}
        
.chart-subtitle {
    font-size: 11px;
    color: #64748b;
    margin-top: 10px;
    font-style: italic;
    text-align: center;
}
        
/* CONTENEDOR PREMIUM PARA DIAGRAMAS P&ID PROFESIONALES */
.chart-full-page {
    page-break-before: always;
    page-break-after: always;
    margin: 0;
    padding: 8px;  /* Padding optimizado para máximo espacio */
    text-align: center;
    width: 100%;
    height: auto;
    min-height: 750px;  /* Altura premium para diagramas complejos */
    background: linear-gradient(135deg, #f8fafc 0%, #ffffff 100%);
    border: 2px solid #e2e8f0;
}
        
.chart-full-page .chart-title {
    margin-bottom: 12px;
    font-size: 22px;  /* Título premium más prominente */
    font-weight: bold;
    color: #1e3a8a;
    text-transform: uppercase;
    letter-spacing: 1px;
    text-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
}
        
.chart-full-page .chart-subtitle {
    margin-bottom: 15px;
    font-size: 12px;
    color: #64748b;
    font-style: italic;
    line-height: 1.4;
    max-width: 80%;
    margin-left: auto;
    margin-right: auto;
}
            border-radius: 8px;
            text-align: center;
        }
        
        .missing-chart-notice h3 {
            color: #dc2626;
            margin-bottom: 10px;
        }
        
        .missing-chart-notice p {
            color: #7f1d1d;
            font-size: 12px;
        }
        
        .charts-footer {
            margin-top: 40px;
            padding: 20px;
            background: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 8px;
            font-size: 10px;
            color: #64748b;
            text-align: center;
        }
        
        /* GRÁFICOS PREMIUM - CORREGIDO PARA WEASYPRINT */
        .chart-container {
            margin: 30px 0;
            page-break-inside: avoid;
            text-align: center;
            padding: 15px;
            background: #f8fafc;
            border-radius: 8px;
            border: 1px solid #e2e8f0;
            width: 100%;
            max-width: 100%;
            overflow: hidden;
        }
        
        .chart-title {
            font-size: 16px;
            font-weight: bold;
            color: #1e3a8a;
            margin-bottom: 15px;
            text-align: center;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            padding-bottom: 8px;
            border-bottom: 2px solid #3b82f6;
        }
        
        .chart-image {
            max-width: 100%;
            width: 100%;
            height: auto;
            border: 1px solid #cbd5e1;
            border-radius: 4px;
            margin: 0 auto;
            display: block;
            background: white;
            padding: 5px;
        }
        
        .chart-subtitle {
            font-size: 11px;
            color: #64748b;
            margin-top: 10px;
            font-style: italic;
            text-align: center;
        }
        
        /* CONTENEDOR PREMIUM PARA DIAGRAMAS P&ID PROFESIONALES */
        .chart-full-page {
            page-break-before: always;
            page-break-after: always;
            margin: 0;
            padding: 8px;  /* Padding optimizado para máximo espacio */
            text-align: center;
            width: 100%;
            height: auto;
            min-height: 750px;  /* Altura premium para diagramas complejos */
            background: linear-gradient(135deg, #f8fafc 0%, #ffffff 100%);
            border: 2px solid #e2e8f0;
        }
        
        .chart-full-page .chart-title {
            margin-bottom: 12px;
            font-size: 22px;  /* Título premium más prominente */
            font-weight: bold;
            color: #1e3a8a;
            text-transform: uppercase;
            letter-spacing: 1px;
            text-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
        }
        
        .chart-full-page .chart-subtitle {
            margin-bottom: 15px;
            font-size: 12px;
            color: #64748b;
            font-style: italic;
            line-height: 1.4;
            max-width: 80%;
            margin-left: auto;
            margin-right: auto;
        }
        
        .chart-full-page .chart-image {
            max-width: 100%;
            width: 100%;
            height: auto;
            max-height: 800px;  /* Máxima altura premium */
            object-fit: contain;
            margin: 0 auto;
            display: block;
            border: 2px solid #3b82f6;  /* Borde premium azul corporativo */
            border-radius: 8px;
            background: white;
            padding: 8px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);  /* Sombra premium */
        }
        
        /* ESTILO PREMIUM ESPECÍFICO PARA DIAGRAMA P&ID */
        .chart-full-page.pid-diagram {
            background: linear-gradient(135deg, #f0f9ff 0%, #ffffff 100%);
            border: 3px solid #1e3a8a;
        }
        
        .chart-full-page.pid-diagram .chart-image {
            border: 3px solid #1e40af;
            box-shadow: 0 6px 16px rgba(30, 64, 175, 0.2);
        }
        
        /* PIE DE PÁGINA */
        .footer-page {
            page-break-before: always;
            padding: 40px 0;
        }
        
        .contact-info {
            background: #1e3a8a;
            color: white;
            padding: 30px;
            border-radius: 10px;
            margin-bottom: 30px;
            text-align: center;
        }
        
        .contact-info h3 {
            font-size: 24px;
            margin-bottom: 20px;
            color: white;
        }
        
        .contact-info p {
            font-size: 14px;
            margin: 8px 0;
        }
        
        .disclaimer {
            background: #f8fafc;
            border: 1px solid #e2e8f0;
            padding: 20px;
            border-radius: 8px;
        }
        
        .disclaimer h4 {
            color: #dc2626;
            margin-bottom: 10px;
        }
        
        .disclaimer p {
            font-size: 10px;
            line-height: 1.5;
            color: #64748b;
        }
        
        /* UTILIDADES */
        .page-break {
            page-break-before: always;
        }
        
        .no-break {
            page-break-inside: avoid;
        }
        """


# Instancia global
pdf_generator = ProfessionalPDFGenerator()
