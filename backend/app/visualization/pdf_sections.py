"""
PDF Sections Module.

Contains section builders for PDF content generation.
Extracted from pdf_generator.py for modularity.
"""

from typing import Any

from app.services.proposal_service import sanitize_external_list, sanitize_external_text


def _get_badge_class(value: str) -> str:
    """Return CSS class for badge based on value."""
    normalized = value.lower().strip()
    if normalized in {"high", "yes", "proceed"}:
        return "badge-high"
    if normalized in {"medium", "investigate"}:
        return "badge-medium"
    if normalized in {"low", "no", "pass"}:
        return "badge-low"
    return "badge-unknown"


def build_business_sections(
    proposal_data: dict[str, Any],
    audience: str,
    context: dict[str, Any] | None = None,
) -> str:
    """
    Build business-focused HTML sections from proposal data.

    Args:
        proposal_data: ProposalOutput data as dict
        audience: "internal" or "external"
        context: Additional context for external reports

    Returns:
        HTML string with all business sections
    """
    if not proposal_data:
        return ""

    if audience == "external":
        return _build_external_sections(proposal_data, context)
    return _build_internal_sections(proposal_data)


def _build_external_sections(
    proposal_data: dict[str, Any],
    context: dict[str, Any] | None = None,
) -> str:
    """Build external/client-facing sections."""
    sections: list[str] = []
    context = context or {}

    sustainability = proposal_data.get("sustainability") or {}
    profitability_band = proposal_data.get("profitabilityBand") or "Unknown"

    def clean_context_value(value: str | None) -> str | None:
        return sanitize_external_text(value)

    def clean_context_list(values: Any) -> list[str]:
        if not isinstance(values, list):
            return []
        return sanitize_external_list(values)

    def format_metric(metric: dict[str, Any]) -> str:
        value = metric.get("value")
        if not value or value in {"N/A", "Not computed"}:
            return ""
        return value

    profitability_statement = clean_context_value(proposal_data.get("profitabilityStatement"))
    is_highly_profitable = profitability_statement == "Highly profitable"

    summary = sustainability.get("summary")
    overall_impact = sustainability.get("overallEnvironmentalImpact")

    co2 = sustainability.get("co2eReduction") or {}
    water = sustainability.get("waterSavings") or {}
    circularity = sustainability.get("circularity") or []

    # Material & Scope section
    external_html = """
    <div class="technical-section">
        <h2 class="section-title">Material & Scope</h2>
    """
    material = clean_context_value(context.get("material"))
    volume = clean_context_value(context.get("volume"))
    location = clean_context_value(context.get("location"))
    facility_type = clean_context_value(context.get("facilityType"))
    material_description = clean_context_value(proposal_data.get("materialDescription"))

    show_material_line = False
    if material:
        if not material_description:
            show_material_line = True
        else:
            normalized_material = " ".join(material.lower().split())
            normalized_description = " ".join(material_description.lower().split())
            show_material_line = (
                len(material) < 120
                and normalized_material
                and normalized_material not in normalized_description
            )

    if show_material_line:
        external_html += f"<p><strong>Material:</strong> {material}</p>"
    if volume:
        external_html += f"<p><strong>Volume:</strong> {volume}</p>"
    if location:
        external_html += f"<p><strong>Location:</strong> {location}</p>"
    if facility_type:
        external_html += f"<p><strong>Facility:</strong> {facility_type}</p>"
    if material_description:
        external_html += f"<p><strong>Description:</strong> {material_description}</p>"

    if any([material, volume, location, facility_type, material_description]):
        if not is_highly_profitable and profitability_band and profitability_band != "Unknown":
            badge_class = _get_badge_class(profitability_band)
            external_html += (
                f"<p><strong>Opportunity Level:</strong> "
                f'<span class="metric-badge {badge_class}">{profitability_band}</span></p>'
            )
        external_html += "</div>"
    else:
        external_html = ""

    # Summary block
    summary_block = ""
    if summary:
        summary_block = f"""
        <div class="technical-section">
            <h2 class="section-title">Sustainability Summary</h2>
            <p>{summary}</p>
        </div>
        """

    # Metrics block
    metric_sections = []
    co2_block = format_metric(co2)
    if co2_block:
        metric_sections.append(f"<h3>CO2e Reduction</h3><p>{co2_block}</p>")
    water_block = format_metric(water)
    if water_block:
        metric_sections.append(f"<h3>Water Savings</h3><p>{water_block}</p>")

    circularity_blocks = []
    if circularity:
        for indicator in circularity:
            name = indicator.get("name") or "Indicator"
            metric = indicator.get("metric") or {}
            indicator_value = format_metric(metric)
            if indicator_value:
                badge_class = _get_badge_class(indicator_value)
                circularity_blocks.append(
                    f"<p><strong>{name}:</strong> "
                    f'<span class="metric-badge {badge_class}">{indicator_value}</span></p>'
                )
        if circularity_blocks:
            metric_sections.append("<h3>Circularity Indicators</h3>" + "".join(circularity_blocks))

    metrics_block = ""
    if metric_sections:
        metrics_block = '<div class="technical-section">' + "".join(metric_sections) + "</div>"

    # Overall impact block
    overall_block = ""
    if overall_impact:
        overall_block = (
            '<div class="technical-section">'
            f"<p><strong>Overall Impact:</strong> {overall_impact}</p>"
            "</div>"
        )

    # Annual Impact Estimate
    annual_impact_block = ""
    annual_narrative = clean_context_value(proposal_data.get("annualImpactNarrative"))
    annual_band = clean_context_value(proposal_data.get("annualImpactMagnitudeBand"))
    annual_basis = clean_context_value(proposal_data.get("annualImpactBasis"))
    annual_confidence = clean_context_value(proposal_data.get("annualImpactConfidence"))
    annual_notes = clean_context_list(proposal_data.get("annualImpactNotes"))
    if annual_band == "Unknown":
        annual_band = None
    if annual_basis == "Unknown":
        annual_basis = None

    if annual_narrative:
        annual_impact_block = (
            '<div class="technical-section">'
            '<h2 class="section-title">Annual Impact Estimate</h2>'
            f"<p>{annual_narrative}</p>"
            "</div>"
        )
    elif annual_band or annual_basis or annual_confidence or annual_notes:
        annual_impact_parts = []
        label = annual_band or "To be confirmed"
        annual_impact_parts.append(f"<p><strong>Estimated magnitude:</strong> {label}</p>")
        if annual_basis:
            annual_impact_parts.append(f"<p><strong>Basis:</strong> {annual_basis}</p>")
        if annual_confidence:
            annual_impact_parts.append(f"<p><strong>Confidence:</strong> {annual_confidence}</p>")
        if annual_notes:
            notes = "".join(f"<li>{note}</li>" for note in annual_notes)
            annual_impact_parts.append(f'<ul class="esg-list">{notes}</ul>')
        annual_impact_block = (
            '<div class="technical-section">'
            '<h2 class="section-title">Annual Impact Estimate</h2>'
            + "".join(annual_impact_parts)
            + "</div>"
        )

    # Valorization Options section (cards)
    valorization_block = ""
    valorization = context.get("valorization") or []
    recommended_actions = clean_context_list(proposal_data.get("recommendedActions"))
    if valorization:
        cards = "".join(
            f'<div class="valorization-card">'
            f"<h4>{clean_context_value(v.get('action')) or ''}</h4>"
            f"<p>{clean_context_value(v.get('rationale')) or ''}</p>"
            f"</div>"
            for v in valorization
        )
        valorization_block = (
            '<div class="technical-section">'
            '<h2 class="section-title">Valorization Options</h2>'
            f'<div class="valorization-cards">{cards}</div>'
            "</div>"
        )
    elif recommended_actions:
        cards = "".join(
            f'<div class="valorization-card"><h4>{action}</h4></div>'
            for action in recommended_actions
        )
        valorization_block = (
            '<div class="technical-section">'
            '<h2 class="section-title">Valorization Options</h2>'
            f'<div class="valorization-cards">{cards}</div>'
            "</div>"
        )

    # Handling Requirements section (styled list)
    handling_block = ""
    handling_guidance = clean_context_list(proposal_data.get("handlingGuidance"))
    if handling_guidance:
        items = "".join(f"<li>{item}</li>" for item in handling_guidance)
        handling_block = (
            '<div class="technical-section">'
            '<h2 class="section-title">Handling Requirements</h2>'
            f'<ul class="esg-list">{items}</ul>'
            "</div>"
        )

    # ESG Benefits section (styled list)
    esg_block = ""
    esg_benefits = clean_context_list(context.get("esgBenefits"))
    if esg_benefits:
        items = "".join(f"<li>{b}</li>" for b in esg_benefits)
        esg_block = (
            '<div class="technical-section">'
            '<h2 class="section-title">ESG Benefits for Stakeholders</h2>'
            f'<ul class="esg-list">{items}</ul>'
            "</div>"
        )

    # Opportunity Assessment section
    opportunity_block = ""
    opportunity_narrative = clean_context_value(proposal_data.get("opportunityNarrative"))
    viable_count = context.get("viablePathwaysCount") or 0
    opportunity_parts = []

    if opportunity_narrative:
        opportunity_parts.append(f"<p>{opportunity_narrative}</p>")
    elif viable_count > 0:
        plural = "s" if viable_count != 1 else ""
        opportunity_parts.append(
            f"<p><strong>{viable_count} viable pathway{plural}</strong> "
            "identified for material valorization.</p>"
        )

    if is_highly_profitable:
        opportunity_parts.append(
            '<p><span class="metric-badge badge-high">Highly Profitable</span></p>'
        )
    elif profitability_band and profitability_band != "Unknown":
        badge_class = _get_badge_class(profitability_band)
        opportunity_parts.append(
            f"<p><strong>Opportunity Level:</strong> "
            f'<span class="metric-badge {badge_class}">{profitability_band}</span></p>'
        )

    if opportunity_parts:
        opportunity_block = (
            '<div class="technical-section">'
            '<h2 class="section-title">Opportunity Assessment</h2>'
            + "".join(opportunity_parts)
            + "</div>"
        )

    # End-Use Industries section (tags)
    end_use_block = ""
    end_use_examples = proposal_data.get("endUseIndustryExamples") or []
    if end_use_examples:
        tags = "".join(f'<span class="end-use-tag">{ex}</span>' for ex in end_use_examples)
        end_use_block = (
            '<div class="technical-section">'
            '<h2 class="section-title">Potential End-Use Industries</h2>'
            "<p>Example markets for valorized materials:</p>"
            f'<div class="end-use-grid">{tags}</div>'
            "</div>"
        )

    sections.extend(
        block
        for block in [
            external_html,
            summary_block,
            metrics_block,
            overall_block,
            annual_impact_block,
            valorization_block,
            handling_block,
            esg_block,
            end_use_block,
            opportunity_block,
        ]
        if block
    )
    return "\n".join(sections)


def _build_internal_sections(proposal_data: dict[str, Any]) -> str:
    """Build internal report sections."""
    sections: list[str] = []

    recommendation = proposal_data.get("recommendation") or "INVESTIGATE"
    headline = proposal_data.get("headline") or "Opportunity summary pending."
    confidence = proposal_data.get("confidence") or "Medium"
    client = proposal_data.get("client") or "Client"
    location = proposal_data.get("location") or "Location not specified"
    material = proposal_data.get("material") or "Material details pending."
    volume = proposal_data.get("volume") or "Volume pending."

    financials = proposal_data.get("financials") or {}
    current_cost = financials.get("currentCost") or "N/A"
    offer_terms = financials.get("offerTerms") or "N/A"
    estimated_margin = financials.get("estimatedMargin") or "N/A"

    economics = proposal_data.get("economicsDeepDive") or {}
    profitability_band = economics.get("profitabilityBand") or "Unknown"
    profitability_summary = economics.get("profitabilitySummary") or "Summary pending."

    environment = proposal_data.get("environment") or {}
    safety = proposal_data.get("safety") or {}
    pathways = proposal_data.get("pathways") or []

    # Executive Summary
    internal_html = """
    <div class="technical-section">
        <h2 class="section-title">Executive Summary</h2>
    """
    internal_html += f"<p><strong>Decision:</strong> {recommendation}</p>"
    internal_html += f"<p><strong>Headline:</strong> {headline}</p>"
    internal_html += f"<p><strong>Confidence:</strong> {confidence}</p>"
    internal_html += "</div>"

    # Project Context
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
    internal_html += f'<tr><td class="stage-name">Client</td><td>{client}</td></tr>'
    internal_html += f'<tr><td class="stage-name">Location</td><td>{location}</td></tr>'
    internal_html += f'<tr><td class="stage-name">Material</td><td>{material}</td></tr>'
    internal_html += f'<tr><td class="stage-name">Volume</td><td>{volume}</td></tr>'
    internal_html += """
            </tbody>
        </table>
    </div>
    """
    sections.append(internal_html)

    # Financial Snapshot
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
    finance_html += (
        f"<tr><td>{current_cost}</td><td>{offer_terms}</td><td>{estimated_margin}</td></tr>"
    )
    finance_html += """
            </tbody>
        </table>
    </div>
    """
    sections.append(finance_html)

    # Economics Deep Dive
    econ_html = """
    <div class="technical-section">
        <h2 class="section-title">Economics Deep Dive</h2>
    """
    econ_html += f"<p><strong>Profitability Band:</strong> {profitability_band}</p>"
    econ_html += f"<p>{profitability_summary}</p>"

    cost_breakdown = economics.get("costBreakdown") or []
    if cost_breakdown:
        econ_html += "<h3>Cost Breakdown</h3><ul>"
        for item in cost_breakdown:
            econ_html += f"<li>{item}</li>"
        econ_html += "</ul>"

    scenarios = economics.get("scenarioSummary") or []
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

    data_gaps = economics.get("dataGaps") or []
    if data_gaps:
        econ_html += "<h3>Data Gaps</h3><ul>"
        for item in data_gaps:
            econ_html += f"<li>{item}</li>"
        econ_html += "</ul>"

    econ_html += "</div>"
    sections.append(econ_html)

    # Environmental Impact
    env_html = """
    <div class="technical-section">
        <h2 class="section-title">Environmental Impact</h2>
    """
    co2_avoided = environment.get("co2Avoided") or "N/A"
    esg_headline = environment.get("esgHeadline") or "N/A"
    current_harm = environment.get("currentHarm") or "N/A"
    env_html += f"<p><strong>CO2 Avoided:</strong> {co2_avoided}</p>"
    env_html += f"<p><strong>ESG Headline:</strong> {esg_headline}</p>"
    env_html += f"<p><strong>If Not Diverted:</strong> {current_harm}</p>"
    env_html += "</div>"
    sections.append(env_html)

    # Safety & Handling
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

    # Business Pathways
    if pathways:
        pathways_html = """
        <div class="technical-section">
            <h2 class="section-title">Business Pathways</h2>
        """
        for idx, pathway in enumerate(pathways, 1):
            action = pathway.get("action") or f"Pathway {idx}"
            buyer_types = pathway.get("buyerTypes") or "N/A"
            price_range = pathway.get("priceRange") or "N/A"
            annual_value = pathway.get("annualValue") or "N/A"
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


def build_charts_section(charts: dict[str, str]) -> str:
    """
    Build charts HTML section.

    Args:
        charts: Dictionary with chart keys and base64-encoded image data

    Returns:
        HTML string with charts section
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

    essential_charts = [
        (
            "process_flow",
            "WASTE STREAMS & UPCYCLING PATHWAYS",
            "High-level flow of waste generation, segregation, and upcycling pathways "
            "designed for circular economy deals.",
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
            html += f"""
            <div class="missing-chart-notice">
                <h3>{chart_title}</h3>
                <p>Visualization not available - insufficient data</p>
            </div>
            """

    html += """
    <div class="charts-footer">
        <p><strong>Technical Note:</strong> All specifications, costs and schedules presented
        are based on industry standards and may vary according to specific site conditions
        and particular client requirements.</p>
    </div>
    </div>
    """
    return html
