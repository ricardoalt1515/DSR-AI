"""
Professional PDF generator for water treatment technical proposals
Includes advanced formatting for equipment specifications and technical diagrams
"""

import os
import logging
import asyncio
from datetime import datetime
from typing import Dict, Any, Optional
import markdown
from weasyprint import HTML, CSS
from weasyprint.text.fonts import FontConfiguration
import base64
from io import BytesIO

# Removed efficiency_utils import - working directly with TreatmentEfficiency model

logger = logging.getLogger("hydrous")


class ProfessionalPDFGenerator:
    """
    Corporate-level PDF generator for technical proposals
    Includes specialized formatting for equipment and specifications
    """

    def __init__(self):
        self.font_config = FontConfiguration()
        self.logo_base64 = self._get_logo_base64()

    async def create_pdf(
        self,
        markdown_content: str,
        metadata: Dict[str, Any],
        charts: Dict[str, str],
        conversation_id: str,
    ) -> Optional[str]:
        """
        Generate professional PDF with technical content and visualizations

        Args:
            markdown_content: Proposal narrative content in markdown format
            metadata: Dict containing 'data_for_charts' from ProposalOutput.data_for_charts
            charts: Optional base64-encoded charts dict. Expected keys: 'process_flow', 'financial_executive'
            conversation_id: Unique identifier for the conversation

        Returns:
            str: Download URL/path for generated PDF, or None if generation failed

        Note: metadata['data_for_charts'] must contain the structured technical data from agent output.
              This includes equipment specs, client info, design parameters, and cost breakdowns.
        """
        try:
            logger.info(
                f"📄 Generating technical PDF for conversation {conversation_id}"
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
            pdf_filename = f"proposals/technical_proposal_{conversation_id}_{datetime.now().strftime('%Y%m%d_%H%M')}.pdf"

            from app.services.s3_service import (
                upload_file_to_s3,
                get_presigned_url,
                USE_S3,
            )

            pdf_buffer.seek(0)  # Reset pointer
            await upload_file_to_s3(pdf_buffer, pdf_filename, "application/pdf")

            # Log correctly according to mode
            if USE_S3:
                logger.info(f"✅ PDF uploaded to S3: {pdf_filename}")
            else:
                logger.info(f"✅ PDF saved locally: {pdf_filename}")

            # ✅ Return RELATIVE filename (without /uploads/ prefix)
            # This allows s3_service to construct the correct path
            return pdf_filename  # e.g., "proposals/technical_proposal_xyz.pdf"

        except Exception as e:
            logger.error(f"Error generating PDF: {e}", exc_info=True)
            return None

    def _create_technical_html(
        self, markdown_content: str, metadata: Dict[str, Any], charts: Dict[str, str]
    ) -> str:
        """
        Create complete HTML for waste upcycling business reports.

        The new agent output (ProposalOutput) is passed in metadata["proposal"].
        Legacy water-treatment structures (metadata["data_for_charts"]) are ignored
        for content rendering, but may still be used by chart generators.
        """
        # Convert markdown to HTML (for optional full report section)
        md_html = markdown.markdown(
            markdown_content or "", extensions=["tables", "fenced_code"]
        )

        # Extract ProposalOutput-based data (defensive against missing keys)
        proposal_data = metadata.get("proposal") or {}

        client_name = proposal_data.get("client_name") or proposal_data.get("clientName") or "Client"
        facility_type = proposal_data.get("facility_type") or proposal_data.get("facilityType") or "Facility"
        location = proposal_data.get("location") or "Location not specified"

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
            <title>Waste Upcycling Report - {client_name}</title>
        </head>
        <body>
            <!-- COVER PAGE -->
            <div class="cover-page">
                <div class="header-logo">
                    <div class="company-logo">
                        <div class="logo-placeholder">
                            {f'<img src="{self.logo_base64}" alt="DSR Inc. Logo">' if self.logo_base64 else "[DSR INC. LOGO]"}
                        </div>
                    </div>
                    <h1>DSR INC.</h1>
                    <p class="subtitle">The Disruptor - Behind Your Success</p>
                </div>
                
                <div class="cover-content">
                    <h2 class="proposal-title">WASTE UPCYCLING FEASIBILITY REPORT</h2>
                    <h3 class="client-name">{facility_type}</h3>
                    <h4 class="company-name">{client_name}</h4>
                    
                    <div class="cover-details">
                        <p><strong>Date:</strong> {datetime.now().strftime("%B %d, %Y")}</p>
                        <p><strong>Location:</strong> {location}</p>
                    </div>
                </div>
                
                <div class="cover-footer">
                    <p>Confidential Document - For Client and DSR Internal Use Only</p>
                </div>
            </div>
            
            <!-- BUSINESS OPPORTUNITY & LCA SECTIONS -->
            {business_sections}
            
            <!-- VISUALIZATIONS AND CHARTS (optional) -->
            {charts_section}
            
            <!-- FULL MARKDOWN REPORT (optional) -->
            <div class="technical-section">
                <h2 class="section-title">Full AI-Generated Report</h2>
                {md_html}
            </div>
            
            <!-- FOOTER PAGE -->
            <div class="footer-page">
                <div class="contact-info">
                    <h3>DSR INC.</h3>
                    <p>📧 info@dsr-inc.com</p>
                    <p>🌐 www.dsr-inc.com</p>
                    <p>📱 Contact your DSR representative for next steps</p>
                </div>
                
                <div class="disclaimer">
                    <h4>Legal Notice</h4>
                    <p>This business opportunity report was generated using artificial intelligence based on 
                    information provided by the client and public market data. While every effort has been made to 
                    ensure accuracy, financial estimates and strategic recommendations may contain errors and are 
                    not legally binding. All investment decisions should be validated by DSR Inc. and the client 
                    before execution.</p>
                </div>
            </div>
        </body>
        </html>
        """

        return html_content

    def _create_business_sections(self, proposal_data: Dict[str, Any]) -> str:
        """Create business-focused sections from ProposalOutput-compatible data."""
        sections: list[str] = []

        # Executive decision summary
        business = proposal_data.get("business_opportunity") or proposal_data.get("businessOpportunity") or {}
        lca = proposal_data.get("lca") or proposal_data.get("lifeCycleAssessment") or {}

        overall_recommendation = business.get("overall_recommendation") or business.get("overallRecommendation")
        decision_summary = business.get("decision_summary") or business.get("decisionSummary")
        confidence_level = proposal_data.get("confidence_level") or proposal_data.get("confidenceLevel")

        primary_waste_types = proposal_data.get("primary_waste_types") or proposal_data.get("primaryWasteTypes") or []
        daily_volume = proposal_data.get("daily_monthly_volume") or proposal_data.get("dailyMonthlyVolume")
        disposal_method = proposal_data.get("existing_disposal_method") or proposal_data.get("existingDisposalMethod")

        exec_html = """
        <div class="technical-section">
            <h2 class="section-title">Executive Decision Summary</h2>
        """

        if overall_recommendation or decision_summary or confidence_level:
            exec_html += "<div class=\"executive-content\">"
            if overall_recommendation:
                exec_html += f"<p><strong>Decision:</strong> {overall_recommendation}</p>"
            if confidence_level:
                exec_html += f"<p><strong>Confidence Level:</strong> {confidence_level}</p>"
            if decision_summary:
                exec_html += f"<p>{decision_summary}</p>"
            exec_html += "</div>"

        # Basic waste context
        if primary_waste_types or daily_volume or disposal_method:
            exec_html += """
            <h3>Waste Context</h3>
            <table class="equipment-table">
                <thead>
                    <tr>
                        <th>Parameter</th>
                        <th>Value</th>
                    </tr>
                </thead>
                <tbody>
            """
            if primary_waste_types:
                joined_types = ", ".join(primary_waste_types)
                exec_html += f"<tr><td class=\"stage-name\">Primary Waste Types</td><td>{joined_types}</td></tr>"
            if daily_volume:
                exec_html += f"<tr><td class=\"stage-name\">Total Volume</td><td>{daily_volume}</td></tr>"
            if disposal_method:
                exec_html += f"<tr><td class=\"stage-name\">Current Disposal Method</td><td>{disposal_method}</td></tr>"
            exec_html += """
                </tbody>
            </table>
            """

        exec_html += "</div>"
        sections.append(exec_html)

        # Landfill reduction & cost savings
        landfill = business.get("landfill_reduction") or business.get("landfillReduction") or {}
        savings = business.get("waste_handling_cost_savings") or business.get("wasteHandlingCostSavings") or {}
        revenue = business.get("potential_revenue") or business.get("potentialRevenue") or {}

        if landfill or savings or revenue:
            econ_html = """
            <div class="technical-section">
                <h2 class="section-title">Financial Opportunity Overview</h2>
            """

            # Landfill reduction
            if landfill:
                before = landfill.get("before") or []
                after = landfill.get("after") or []
                annual = landfill.get("annual_savings") or landfill.get("annualSavings") or []
                econ_html += """
                <h3>Landfill Diversion</h3>
                <table class="equipment-table">
                    <thead>
                        <tr>
                            <th>Current Situation</th>
                            <th>After DSR Deal</th>
                            <th>Annual Benefits</th>
                        </tr>
                    </thead>
                    <tbody>
                """
                econ_html += f"<tr><td>{'<br/>'.join(before) if before else 'N/A'}</td>"
                econ_html += f"<td>{'<br/>'.join(after) if after else 'N/A'}</td>"
                econ_html += f"<td>{'<br/>'.join(annual) if annual else 'N/A'}</td></tr>"
                econ_html += """
                    </tbody>
                </table>
                """

            # Cost savings
            if savings:
                before = savings.get("before") or []
                after = savings.get("after") or []
                annual = savings.get("annual_savings") or savings.get("annualSavings") or []
                econ_html += """
                <h3>Waste Handling Cost Savings (Generator)</h3>
                <table class="equipment-table">
                    <thead>
                        <tr>
                            <th>Current Disposal Costs</th>
                            <th>After DSR Deal</th>
                            <th>Annual Savings</th>
                        </tr>
                    </thead>
                    <tbody>
                """
                econ_html += f"<tr><td>{'<br/>'.join(before) if before else 'N/A'}</td>"
                econ_html += f"<td>{'<br/>'.join(after) if after else 'N/A'}</td>"
                econ_html += f"<td>{'<br/>'.join(annual) if annual else 'N/A'}</td></tr>"
                econ_html += """
                    </tbody>
                </table>
                """

            # Revenue potential
            if revenue:
                per_kg = revenue.get("per_kg") or revenue.get("perKg") or []
                annual = revenue.get("annual_potential") or revenue.get("annualPotential") or []
                market_rate = revenue.get("market_rate") or revenue.get("marketRate") or []
                notes = revenue.get("notes") or []
                econ_html += """
                <h3>DSR Revenue Potential</h3>
                <table class="equipment-table">
                    <thead>
                        <tr>
                            <th>Revenue per Unit</th>
                            <th>Annual Revenue Potential</th>
                            <th>Market Rates</th>
                            <th>Notes</th>
                        </tr>
                    </thead>
                    <tbody>
                """
                econ_html += "<tr>"
                econ_html += f"<td>{'<br/>'.join(per_kg) if per_kg else 'N/A'}</td>"
                econ_html += f"<td>{'<br/>'.join(annual) if annual else 'N/A'}</td>"
                econ_html += f"<td>{'<br/>'.join(market_rate) if market_rate else 'N/A'}</td>"
                econ_html += f"<td>{'<br/>'.join(notes) if notes else 'N/A'}</td>"
                econ_html += "</tr>"
                econ_html += """
                    </tbody>
                </table>
                """

            econ_html += "</div>"
            sections.append(econ_html)

        # Strategic guidance
        strategic_recommendations = business.get("strategic_recommendations") or business.get("strategicRecommendations") or []
        circular_options = business.get("circular_economy_options") or business.get("circularEconomyOptions") or []
        risks = business.get("risks") or []

        if strategic_recommendations or circular_options or risks:
            strat_html = """
            <div class="technical-section">
                <h2 class="section-title">Strategic Guidance</h2>
            """
            if strategic_recommendations:
                strat_html += "<h3>Recommendations for DSR</h3><ul>"
                for item in strategic_recommendations:
                    strat_html += f"<li>{item}</li>"
                strat_html += "</ul>"
            if circular_options:
                strat_html += "<h3>Circular Economy Pathways</h3><ul>"
                for item in circular_options:
                    strat_html += f"<li>{item}</li>"
                strat_html += "</ul>"
            if risks:
                strat_html += "<h3>Key Risks</h3><ul>"
                for item in risks:
                    strat_html += f"<li>{item}</li>"
                strat_html += "</ul>"
            strat_html += "</div>"
            sections.append(strat_html)

        # Resource considerations
        resource_considerations = business.get("resource_considerations") or business.get("resourceConsiderations") or {}
        if resource_considerations:
            env = resource_considerations.get("environmental_impact") or resource_considerations.get("environmentalImpact") or {}
            handling = resource_considerations.get("material_handling") or resource_considerations.get("materialHandling") or {}
            market = resource_considerations.get("market_intelligence") or resource_considerations.get("marketIntelligence") or {}

            res_html = """
            <div class="technical-section">
                <h2 class="section-title">Resource & Handling Considerations</h2>
            """
            if env:
                res_html += "<h3>Environmental Impact</h3>"
                current = env.get("current_situation") or env.get("currentSituation")
                benefit = env.get("benefit_if_diverted") or env.get("benefitIfDiverted")
                esg = env.get("esg_story") or env.get("esgStory")
                if current:
                    res_html += f"<p><strong>Current Situation:</strong> {current}</p>"
                if benefit:
                    res_html += f"<p><strong>Benefit if Diverted:</strong> {benefit}</p>"
                if esg:
                    res_html += f"<p><strong>ESG Story:</strong> {esg}</p>"
            if handling:
                res_html += "<h3>Material Handling & Safety</h3>"
                hazard_level = handling.get("hazard_level") or handling.get("hazardLevel")
                if hazard_level:
                    res_html += f"<p><strong>Hazard Level:</strong> {hazard_level}</p>"
                for key, label in [
                    ("specific_hazards", "Specific Hazards"),
                    ("ppe_requirements", "PPE Requirements"),
                    ("regulatory_notes", "Regulatory Notes"),
                    ("storage_requirements", "Storage Requirements"),
                    ("degradation_risks", "Degradation Risks"),
                    ("quality_price_impact", "Quality/Price Impact"),
                ]:
                    values = handling.get(key) or handling.get("".join([key.split("_")[0], "".join([p.capitalize() for p in key.split("_")[1:]])])) or []
                    if values:
                        res_html += f"<p><strong>{label}:</strong> {'; '.join(values)}</p>"
            if market:
                res_html += "<h3>Market Intelligence</h3>"
                buyer_types = market.get("buyer_types") or market.get("buyerTypes") or []
                typical_reqs = market.get("typical_requirements") or market.get("typicalRequirements") or []
                pricing_factors = market.get("pricing_factors") or market.get("pricingFactors") or []
                if buyer_types:
                    res_html += f"<p><strong>Buyer Types:</strong> {'; '.join(buyer_types)}</p>"
                if typical_reqs:
                    res_html += f"<p><strong>Typical Requirements:</strong> {'; '.join(typical_reqs)}</p>"
                if pricing_factors:
                    res_html += f"<p><strong>Pricing Factors:</strong> {'; '.join(pricing_factors)}</p>"
            res_html += "</div>"
            sections.append(res_html)

        # LCA summary
        if lca:
            co2 = lca.get("co2_reduction") or lca.get("co2Reduction") or {}
            toxicity = lca.get("toxicity_impact") or lca.get("toxicityImpact") or {}
            efficiency = lca.get("resource_efficiency") or lca.get("resourceEfficiency") or {}
            env_notes = lca.get("environmental_notes") or lca.get("environmentalNotes")

            lca_html = """
            <div class="technical-section">
                <h2 class="section-title">Life Cycle Assessment (LCA)</h2>
            """
            if co2:
                percent = co2.get("percent") or []
                tons = co2.get("tons") or []
                method = co2.get("method") or []
                lca_html += """
                <h3>CO₂ Reduction</h3>
                <table class="equipment-table">
                    <thead>
                        <tr>
                            <th>Percentage Reduction</th>
                            <th>Absolute tCO₂e Avoided</th>
                            <th>Methodology</th>
                        </tr>
                    </thead>
                    <tbody>
                """
                lca_html += "<tr>"
                lca_html += f"<td>{'<br/>'.join(percent) if percent else 'N/A'}</td>"
                lca_html += f"<td>{'<br/>'.join(tons) if tons else 'N/A'}</td>"
                lca_html += f"<td>{'<br/>'.join(method) if method else 'N/A'}</td>"
                lca_html += "</tr>"
                lca_html += """
                    </tbody>
                </table>
                """
            if toxicity:
                level = toxicity.get("level")
                notes = toxicity.get("notes")
                if level or notes:
                    lca_html += "<h3>Toxicity & Safety</h3>"
                    if level:
                        lca_html += f"<p><strong>Toxicity Level:</strong> {level}</p>"
                    if notes:
                        lca_html += f"<p>{notes}</p>"
            if efficiency:
                mat_percent = efficiency.get("material_recovered_percent") or efficiency.get("materialRecoveredPercent") or []
                eff_notes = efficiency.get("notes")
                if mat_percent or eff_notes:
                    lca_html += "<h3>Resource Efficiency</h3>"
                    if mat_percent:
                        lca_html += f"<p><strong>Material Recovered:</strong> {'; '.join(mat_percent)}</p>"
                    if eff_notes:
                        lca_html += f"<p>{eff_notes}</p>"
            if env_notes:
                lca_html += f"<p><strong>Environmental Summary:</strong> {env_notes}</p>"
            lca_html += "</div>"
            sections.append(lca_html)

        # AI insights
        ai_insights = proposal_data.get("ai_insights") or proposal_data.get("aiInsights") or []
        if ai_insights:
            insights_html = """
            <div class="technical-section">
                <h2 class="section-title">AI Insights & Non-Obvious Opportunities</h2>
                <ul>
            """
            for insight in ai_insights:
                insights_html += f"<li>{insight}</li>"
            insights_html += """
                </ul>
            </div>
            """
            sections.append(insights_html)

        return "\n".join(sections)

    def _get_logo_base64(self) -> str:
        """
        Convert logo to base64 to embed it in HTML
        """
        try:
            logo_path = "app/data/logo.png"
            if os.path.exists(logo_path):
                with open(logo_path, "rb") as img_file:
                    encoded = base64.b64encode(img_file.read()).decode("utf-8")
                    return f"data:image/png;base64,{encoded}"
            else:
                logger.warning(f"Logo not found at: {logo_path}")
                return ""
        except Exception as e:
            logger.error(f"Error loading logo: {e}")
            return ""

    def _create_technical_sections(self, agent_data: Dict[str, Any]) -> str:
        """
        Create specialized technical sections for equipment and specifications
        """
        sections = []

        # COMPLETE STRUCTURE FROM TARGET PDF - EXACT ORDER

        # 1. Análisis del Problema Específico (page 2)
        sections.append(self._create_main_problem_analysis_section(agent_data))

        # 2. Justificación Técnica Detallada (page 2-3)
        sections.append(
            self._create_detailed_technical_justification_section(agent_data)
        )

        # Análisis de Alternativas (page 3)
        sections.append(self._create_alternatives_analysis_section(agent_data))

        # Cálculos Técnicos Específicos (page 3)
        sections.append(self._create_technical_calculations_display_section(agent_data))

        # 3. Especificaciones Técnicas (page 3-4)
        sections.append(self._create_technical_specifications_section(agent_data))

        # 4. Economic Breakdown Analysis (page 4)
        sections.append(self._create_economic_breakdown_section(agent_data))

        # Expected Removal Efficiencies Visual (ONLY if agent provides efficiency data)
        sections.append(self._create_removal_efficiencies_visual_section(agent_data))

        # System Summary (ONLY if agent provides financial and operational data)
        sections.append(self._create_system_summary_section(agent_data))

        return "\n".join(sections)

    def _create_project_background_section(self, agent_data: Dict[str, Any]) -> str:
        """
        Creates project background section with client information
        """
        html = """
        <div class="technical-section">
            <h2 class="section-title">📋 PROJECT BACKGROUND</h2>
        """

        # Get client information with defensive validation
        client_info = agent_data.get("client_info", {})
        if client_info is None:
            client_info = {}
            logger.warning("client_info is None, using empty dictionary")

        # Extract client information with fallbacks
        company = client_info.get("company_name", "Client Company")
        industry = client_info.get("industry", "Industrial")
        location = client_info.get("location", "Not specified")
        flow_rate = agent_data.get("flow_rate_m3_day", 0)

        html += f"""
        <table class="equipment-table">
            <thead>
                <tr>
                    <th>Parameter</th>
                    <th>Value</th>
                </tr>
            </thead>
            <tbody>
                <tr>
                    <td class="stage-name">Company</td>
                    <td>{company}</td>
                </tr>
                <tr>
                    <td class="stage-name">Industry Sector</td>
                    <td>{industry}</td>
                </tr>
                <tr>
                    <td class="stage-name">Location</td>
                    <td>{location}</td>
                </tr>
                <tr>
                    <td class="stage-name">Design Flow Rate</td>
                    <td class="numeric">{flow_rate:.0f} m³/day</td>
                </tr>
            </tbody>
        </table>
        </div>
        """

        return html

    def _create_executive_summary_section(
        self, agent_data: Dict[str, Any], md_html: str
    ) -> str:
        """
        Creates properly formatted executive summary section
        """
        html = """
        <div class="technical-section">
            <h2 class="section-title">📋 EXECUTIVE SUMMARY</h2>
        """

        # Extract key project data
        client_info = agent_data.get("client_info", {})
        company = client_info.get("company_name", "Client Company")
        sector = client_info.get("industry", "Industrial")
        flow_rate = agent_data.get("flow_rate_m3_day", 0)
        capex = agent_data.get("capex_usd", 0)
        implementation = agent_data.get("implementation_months", 12)

        # Create structured executive summary
        html += f"""
        <div class="executive-content">
            <p class="summary-intro">
                <strong>{company}</strong> operates in the <strong>{sector}</strong> sector and requires a comprehensive 
                water treatment solution for <strong>{flow_rate:.0f} m³/day</strong>. Our recommended system 
                represents an investment of <strong>${capex:,.0f} USD</strong> with an implementation 
                timeline of <strong>{implementation} months</strong>.
            </p>
            
            <div class="summary-highlights">
                <h3>Key Project Highlights</h3>
                <div class="highlights-grid">
                    <div class="highlight-item">
                        <span class="highlight-label">Treatment Capacity:</span>
                        <span class="highlight-value">{flow_rate:.0f} m³/day</span>
                    </div>
                    <div class="highlight-item">
                        <span class="highlight-label">Total Investment:</span>
                        <span class="highlight-value">${capex:,.0f} USD</span>
                    </div>
                    <div class="highlight-item">
                        <span class="highlight-label">Implementation:</span>
                        <span class="highlight-value">{implementation} months</span>
                    </div>
                    <div class="highlight-item">
                        <span class="highlight-label">Industry Focus:</span>
                        <span class="highlight-value">{sector}</span>
                    </div>
                </div>
            </div>
        """

        # Add project objectives if available
        objectives = agent_data.get("project_objectives", [])
        if objectives:
            html += """
            <div class="summary-objectives">
                <h3>Project Objectives</h3>
                <ul class="objectives-summary">
            """
            for objective in objectives:  # Show all objectives provided by agent
                html += f"<li>{objective}</li>"
            html += """
                </ul>
            </div>
            """

        # Add treatment efficiency summary
        efficiency_data = agent_data.get("treatment_efficiency", {})
        
        if efficiency_data and "parameters" in efficiency_data:
            parameters = efficiency_data["parameters"]
            if parameters:
                html += """
                <div class="summary-performance">
                    <h3>Expected Performance</h3>
                    <div class="performance-grid">
                """
                for param_obj in parameters:
                    param_name = param_obj.get("parameter_name", "")
                    eff = param_obj.get("removal_efficiency_percent", 0)
                    if param_name and eff > 0:
                        html += f"""
                        <div class="performance-item">
                            <span class="param-name">{param_name}</span>
                            <span class="efficiency-value">{eff:.0f}%</span>
                        </div>
                        """
                html += """
                    </div>
                </div>
                """

        html += """
        </div>
        </div>
        """

        return html

    def _create_main_problem_analysis_section(self, agent_data: Dict[str, Any]) -> str:
        """
        Creates the EXACT structure from target PDF page 2:
        Análisis del Problema Específico with all subsections
        """
        html = """
        <div class="main-proposal-content">
            <h1 class="main-title">Water Treatment Technical Proposal - Client: {company}</h1>
            
            <div class="problem-analysis-section">
                <h2 class="section-title">1. Specific Problem Analysis</h2>
                
                <!-- Company parameters table -->
                <table class="equipment-table company-info">
                    <thead>
                        <tr>
                            <th>PARAMETER</th>
                            <th>VALUE</th>
                        </tr>
                    </thead>
                    <tbody>
        """

        # Get client info
        client_info = agent_data.get("client_info", {})
        company = client_info.get("company_name", "Client Company")
        sector = client_info.get("industry", "Industrial")
        location = client_info.get("location", "Location")
        flow_rate = agent_data.get("flow_rate_m3_day", 0)

        # Fill company info table
        html = html.format(company=company)

        html += f"""
                        <tr>
                            <td class="stage-name">Company</td>
                            <td>{company}</td>
                        </tr>
                        <tr>
                            <td class="stage-name">Sector</td>
                            <td>{sector}</td>
                        </tr>
                        <tr>
                            <td class="stage-name">Location</td>
                            <td>{location}</td>
                        </tr>
                        <tr>
                            <td class="stage-name">Design Flow Rate</td>
                            <td>{flow_rate:.0f} m³/day</td>
                        </tr>
                        <tr>
                            <td class="stage-name">Wastewater Type</td>
                            <td>Sector-specific industrial wastewater</td>
                        </tr>
                    </tbody>
                </table>
                
                <!-- Contaminants section -->
                <h3>Contaminants and Objectives</h3>
        """

        # Add contaminant parameters exactly like target PDF
        problem_analysis = agent_data.get("problem_analysis", {})
        influent = problem_analysis.get("influent_characteristics", {})
        parameters = influent.get("parameters", [])

        for param in parameters:
            param_name = param.get("parameter", "")
            param_value = param.get("value", 0)
            param_unit = param.get("unit", "")

            # Format like target PDF bullet points
            if param_unit == "unitless":
                value_display = f"{param_value}"
            else:
                value_display = f"{param_value} {param_unit}"

            html += f"""
                <p>• <strong>{param_name}:</strong> {value_display}</p>
            """

        # Add quality objectives section (ONLY if provided by agent)
        quality_objectives = problem_analysis.get("quality_objectives", [])
        if quality_objectives:
            html += """
                <h3>Quality and Use Objectives</h3>
            """
            for objective in quality_objectives:
                html += f"<p>• {objective}</p>"

        # Add conditions and restrictions (ONLY if provided by agent)
        conditions = problem_analysis.get("conditions_restrictions", [])
        if conditions:
            html += """
                <h3>Conditions and Restrictions</h3>
            """
            for condition in conditions:
                html += f"<p>• {condition}</p>"

        html += """
            </div>
        </div>
        """

        return html

    def _create_detailed_technical_justification_section(
        self, agent_data: Dict[str, Any]
    ) -> str:
        """
        Creates the technical justification table exactly like target PDF
        """
        html = """
        <div class="technical-justification-section">
            <h2 class="section-title">2. Detailed Technical Justification</h2>
            
            <table class="equipment-table tech-detail">
                <thead>
                    <tr>
                        <th>STAGE</th>
                        <th>SELECTED TECHNOLOGY</th>
                        <th>SPECIFIC JUSTIFICATION</th>
                    </tr>
                </thead>
                <tbody>
        """

        # Use main equipment data
        main_equipment = agent_data.get("main_equipment", [])

        for equipment in main_equipment:
            stage = equipment.get("stage", "secondary")
            tech_type = equipment.get("type", "Technology")
            justification = equipment.get(
                "justification", "Selected based on technical requirements"
            )

            html += f"""
                    <tr>
                        <td class="stage-name">{stage.title()}</td>
                        <td>{tech_type}</td>
                        <td>{justification}</td>
                    </tr>
            """

        html += """
                </tbody>
            </table>
        </div>
        """

        return html

    def _create_alternatives_analysis_section(self, agent_data: Dict[str, Any]) -> str:
        """
        Creates alternatives analysis section - ONLY uses agent data, no hardcoding
        """
        alternatives = agent_data.get("alternative_analysis", [])

        if not alternatives:
            return ""  # Return empty if no data from agent

        html = """
        <div class="alternatives-section">
            <h3>Alternative Analysis</h3>
        """

        for alt in alternatives:
            technology = alt.get("technology", "")
            reason = alt.get("reason_rejected", "")
            if technology and reason:
                html += f"<p>• <strong>{technology}:</strong> {reason}</p>"

        html += "</div>"
        return html

    def _create_technical_calculations_display_section(
        self, agent_data: Dict[str, Any]
    ) -> str:
        """
        Creates technical calculations display - ONLY uses agent calculations, no defaults
        """
        # This section should ONLY show if agent provides calculations
        # No hardcoded calculations
        flow_rate = agent_data.get("flow_rate_m3_day", 0)

        if not flow_rate:
            return ""  # Return empty if no flow rate data

        html = """
        <div class="calculations-section">
            <h3>Specific Technical Calculations</h3>
        """

        # Only basic flow calculation from agent data
        html += f"<p>• <strong>Flow Rate:</strong> {flow_rate:.0f} m³/day (~{flow_rate / 24:.2f} m³/h)</p>"

        # Add any other calculations ONLY if provided by agent
        efficiency_data = agent_data.get("treatment_efficiency", {})
        
        if efficiency_data and "parameters" in efficiency_data:
            for param_obj in efficiency_data["parameters"]:
                param_name = param_obj.get("parameter_name", "")
                eff = param_obj.get("removal_efficiency_percent", 0)
                if param_name and eff > 0:
                    html += f"<p>• <strong>Expected {param_name} removal:</strong> {eff:.0f}% efficiency</p>"

        html += "</div>"
        return html

    def _create_technical_specifications_section(
        self, agent_data: Dict[str, Any]
    ) -> str:
        """
        Creates section 3: Technical Specifications - ONLY from agent data
        """
        main_equipment = agent_data.get("main_equipment", [])

        if not main_equipment:
            return ""  # Return empty if no equipment data

        html = """
        <div class="technical-specs-section">
            <h2 class="section-title">3. Technical Specifications</h2>
            
            <table class="equipment-table">
                <thead>
                    <tr>
                        <th>EQUIPMENT</th>
                        <th>CAPACITY</th>
                        <th>POWER (KW)</th>
                        <th>DIMENSIONS (L×W×H M)</th>
                        <th>COST (USD)</th>
                    </tr>
                </thead>
                <tbody>
        """

        for equipment in main_equipment:
            equip_type = equipment.get("type", "")
            capacity = equipment.get("capacity_m3_day", 0)
            power = equipment.get("power_consumption_kw", 0)
            dimensions = equipment.get("dimensions", "")
            cost = equipment.get("capex_usd", 0)

            # ROBUST DATA VALIDATION: Ensure numeric values are valid
            capacity = capacity if capacity is not None else 0
            power = power if power is not None else 0
            cost = cost if cost is not None else 0

            # Only show if we have meaningful data
            if equip_type:
                html += f"""
                        <tr>
                            <td class="stage-name">{equip_type}</td>
                            <td class="numeric">{capacity:.0f} m³/day</td>
                            <td class="numeric">{power:.1f}</td>
                            <td>{dimensions if dimensions else "TBD"}</td>
                            <td class="numeric">${cost:,.0f}</td>
                        </tr>
                """

        html += """
                </tbody>
            </table>
        """

        # Performance parameters table - ONLY if agent provides data
        problem_analysis = agent_data.get("problem_analysis", {})
        parameters = problem_analysis.get("influent_characteristics", {}).get(
            "parameters", []
        )

        if parameters:
            html += """
            <h4>Performance Parameters</h4>
            <table class="equipment-table">
                <thead>
                    <tr>
                        <th>PARAMETER</th>
                        <th>INPUT</th>
                        <th>ESTIMATED OUTPUT</th>
                        <th>EFFICIENCY (%)</th>
                    </tr>
                </thead>
                <tbody>
            """

            # Get efficiency data from agent
            efficiency_data = agent_data.get("treatment_efficiency", {})
            efficiency_params = efficiency_data.get("parameters", []) if efficiency_data else []
            
            # Create lookup dict for quick access
            efficiency_lookup = {
                p["parameter_name"]: p
                for p in efficiency_params
                if isinstance(p, dict) and "parameter_name" in p
            }

            for param in parameters:
                param_name = param.get("parameter", "")
                input_value = param.get("value", 0)

                # ROBUST DATA VALIDATION: Ensure numeric values are valid
                input_value = input_value if input_value is not None else 0

                # Get efficiency info from agent if available
                param_efficiency = efficiency_lookup.get(param_name, {})
                efficiency = param_efficiency.get("removal_efficiency_percent", 0)
                output_value = param_efficiency.get("effluent_concentration") or (
                    input_value * (1 - efficiency / 100) if efficiency else 0
                )

                if param_name and input_value > 0:
                    # Get unit for this parameter (pH, temperature, etc. may have different units)
                    unit = param.get("unit", "")

                    # Format values with appropriate units
                    if unit and unit.lower() != "unitless":
                        input_display = f"{input_value} {unit}"
                        output_display = f"{output_value:.1f} {unit}"
                    else:
                        input_display = str(input_value)
                        output_display = f"{output_value:.1f}"

                    html += f"""
                            <tr>
                                <td class="stage-name">{param_name}</td>
                                <td class="numeric">{input_display}</td>
                                <td class="numeric">{output_display}</td>
                                <td class="numeric">{efficiency:.0f}%</td>
                            </tr>
                    """

            html += """
                    </tbody>
                </table>
            """

        html += "</div>"
        return html

    def _create_economic_breakdown_section(self, agent_data: Dict[str, Any]) -> str:
        """
        Creates section 4: Economic breakdown - ONLY from agent data
        """
        total_capex = agent_data.get("capex_usd", 0)
        total_opex = agent_data.get("annual_opex_usd", 0)

        if not (total_capex or total_opex):
            return ""  # Return empty if no financial data

        html = """
        <div class="economic-section">
            <h2 class="section-title">4. Economic Breakdown Analysis</h2>
        """

        # CAPEX section - ONLY if data available
        if total_capex > 0:
            html += """
            <h3>Investment (CAPEX)</h3>
            <table class="equipment-table">
                <thead>
                    <tr>
                        <th>COMPONENT</th>
                        <th>COST (USD)</th>
                        <th>% OF TOTAL</th>
                    </tr>
                </thead>
                <tbody>
            """

            capex_breakdown = agent_data.get("capex_breakdown", {})

            if capex_breakdown:
                for component, cost in capex_breakdown.items():
                    # ROBUST DATA VALIDATION: Only process valid numeric values
                    if cost is not None and isinstance(cost, (int, float)) and cost > 0:
                        percentage = (
                            (cost / total_capex * 100) if total_capex > 0 else 0
                        )
                        component_name = component.replace("_", " ").title()
                        html += f"""
                                <tr>
                                    <td class="stage-name">{component_name}</td>
                                    <td class="numeric">${cost:,.0f}</td>
                                    <td class="numeric">{percentage:.0f}%</td>
                                </tr>
                        """
            else:
                # Show total only if no breakdown available
                html += f"""
                        <tr>
                            <td class="stage-name">Total Investment</td>
                            <td class="numeric">${total_capex:,.0f}</td>
                            <td class="numeric">100%</td>
                        </tr>
                """

            html += """
                    </tbody>
                </table>
            """

        # OPEX section - ONLY if data available
        if total_opex > 0:
            html += """
            <h3>Operational Costs (Annual OPEX)</h3>
            <table class="equipment-table">
                <thead>
                    <tr>
                        <th>CONCEPT</th>
                        <th>ANNUAL COST (USD)</th>
                    </tr>
                </thead>
                <tbody>
            """

            opex_breakdown = agent_data.get("opex_breakdown", {})

            if opex_breakdown:
                for concept, cost in opex_breakdown.items():
                    # ROBUST DATA VALIDATION: Only process valid numeric values
                    if (
                        cost is not None
                        and isinstance(cost, (int, float))
                        and cost >= 0
                    ):
                        concept_name = concept.replace("_", " ").title()
                        html += f"""
                                <tr>
                                    <td class="stage-name">{concept_name}</td>
                                    <td class="numeric">${cost:,.0f}</td>
                                </tr>
                        """
            else:
                # Show total only if no breakdown available
                html += f"""
                        <tr>
                            <td class="stage-name">Total Annual OPEX</td>
                            <td class="numeric">${total_opex:,.0f}</td>
                        </tr>
                """

            html += """
                    </tbody>
                </table>
            """

        html += "</div>"
        return html

    def _create_removal_efficiencies_visual_section(
        self, agent_data: Dict[str, Any]
    ) -> str:
        """
        Creates visual removal efficiencies section - ONLY from agent efficiency data
        """
        efficiency_data = agent_data.get("treatment_efficiency", {})
        
        if not efficiency_data or "parameters" not in efficiency_data:
            return ""  # Return empty if agent provides no efficiency data

        parameters = efficiency_data["parameters"]
        
        # Filter out zero/None values
        valid_parameters = [
            p for p in parameters
            if p.get("removal_efficiency_percent", 0) > 0
        ]

        if not valid_parameters:
            return ""

        html = """
        <div class="efficiency-visual-section">
            <h3>Expected Removal Efficiencies</h3>
            <div class="efficiency-bars">
        """

        # Create visual bars for each efficiency (from agent data only)
        for param_obj in valid_parameters:
            param = param_obj.get("parameter_name", "")
            efficiency = param_obj.get("removal_efficiency_percent", 0)
            # Different color classes based on efficiency level
            if efficiency >= 80:
                bar_class = "efficiency-high"
            elif efficiency >= 60:
                bar_class = "efficiency-medium"
            else:
                bar_class = "efficiency-low"

            html += f"""
                <div class="efficiency-item {bar_class}">
                    <div class="efficiency-label">{param}</div>
                    <div class="efficiency-value">{efficiency:.1f}%</div>
                </div>
            """

        html += """
            </div>
        </div>
        """

        return html

    def _create_system_summary_section(self, agent_data: Dict[str, Any]) -> str:
        """
        Creates system summary box - ONLY from agent financial/operational data
        """
        capex = agent_data.get("capex_usd", 0)
        opex = agent_data.get("annual_opex_usd", 0)
        operational_data = agent_data.get("operational_data", {})
        area = operational_data.get("required_area_m2", 0) if operational_data else 0

        # Only create section if we have meaningful data from agent
        if not (capex or opex):
            return ""

        html = """
        <div class="system-summary-section">
            <h3>📋 Technical Equipment Specifications</h3>

            <div class="system-summary-box">
                <h4>System Summary</h4>
                <div class="summary-grid">
        """

        # Add metrics ONLY if agent provides them
        if capex > 0:
            html += f"""
                    <div class="summary-item">
                        <span class="summary-label">CAPEX Total:</span>
                        <span class="summary-value">${capex:,.0f} USD</span>
                    </div>
            """

        if opex > 0:
            html += f"""
                    <div class="summary-item">
                        <span class="summary-label">OPEX Annual:</span>
                        <span class="summary-value">${opex:,.0f} USD</span>
                    </div>
            """

        if area >= 0:  # 0 is valid for area
            html += f"""
                    <div class="summary-item">
                        <span class="summary-label">Required Area:</span>
                        <span class="summary-value">{area:.0f} m²</span>
                    </div>
            """

        html += """
                </div>
            </div>
        </div>
        """

        return html

    def _create_charts_section(self, charts: Dict[str, str]) -> str:
        """
        Crea sección de gráficos estratégicos para formato cliente
        Enfoque: Calidad profesional > Cantidad de gráficos
        """
        if not charts:
            return ""

        html = """
        <div class="charts-section">
            <h2 class="section-title">📊 WASTE UPCYCLING ANALYTICS</h2>
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
                "💰 ECONOMIC ANALYSIS: SAVINGS & REVENUE",
                "Executive view of generator savings, DSR revenue potential, and landfill diversion benefits.",
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
                content: "DSR Inc. - Waste Upcycling Report | Page " counter(page);
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
            content: '🔧';
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
            content: '📅';
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

