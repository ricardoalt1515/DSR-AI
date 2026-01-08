"""
PDF Templates Module.

Contains HTML templates for PDF document structure.
Extracted from pdf_generator.py for modularity.
"""

from datetime import datetime


def get_document_template(
    report_title: str,
    client_name: str,
    cover_html: str,
    business_sections_html: str,
    charts_section_html: str,
    markdown_section_html: str,
    footer_html: str,
) -> str:
    """
    Wrap all content in a complete HTML document.

    Args:
        report_title: Title for the HTML document
        client_name: Client name for the title
        cover_html: Cover page HTML
        business_sections_html: Business sections HTML
        charts_section_html: Charts section HTML
        markdown_section_html: Markdown section HTML (for internal reports)
        footer_html: Footer page HTML

    Returns:
        Complete HTML document string
    """
    return f"""
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>{report_title} - {client_name}</title>
    </head>
    <body>
        {cover_html}

        <!-- BUSINESS OPPORTUNITY & LCA SECTIONS -->
        {business_sections_html}

        <!-- VISUALIZATIONS AND CHARTS (optional) -->
        {charts_section_html}

        {markdown_section_html}

        {footer_html}
    </body>
    </html>
    """


def get_cover_template(
    report_title: str,
    audience_label: str,
    proposal_title: str,
    facility_type: str,
    client_name: str,
    location: str,
) -> str:
    """
    Generate cover page HTML.

    Args:
        report_title: Main report title
        audience_label: "Internal" or "Client" (used for internal tracking only)
        proposal_title: Proposal title (not displayed - use report_title)
        facility_type: Type of facility
        client_name: Client/company name
        location: Project location

    Returns:
        Cover page HTML string
    """
    date_str = datetime.now().strftime("%B %d, %Y")
    is_internal = audience_label.lower() == "internal"

    return f"""
    <!-- COVER PAGE -->
    <div class="cover-page">
        <div class="header-logo">
            <h1>{report_title}</h1>
        </div>

        <div class="cover-content">
            <h4 class="company-name">{client_name}</h4>
            <h3 class="client-name">{facility_type}</h3>

            <div class="cover-details">
                <p><strong>Date:</strong> {date_str}</p>
                <p><strong>Location:</strong> {location}</p>
                {"<p><strong>Report Type:</strong> Internal Analysis</p>" if is_internal else ""}
            </div>
        </div>

        <div class="cover-footer">
            <p>Confidential Document - For Intended Recipient Only</p>
        </div>
    </div>
    """


def get_footer_template() -> str:
    """
    Generate footer page HTML with contact info and disclaimer.

    Returns:
        Footer page HTML string
    """
    return """
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
    """


def get_markdown_section_template(md_html: str) -> str:
    """
    Generate markdown section HTML for internal reports.

    Args:
        md_html: Converted markdown as HTML

    Returns:
        Markdown section HTML string
    """
    return f"""
    <!-- FULL MARKDOWN REPORT (optional) -->
    <div class="technical-section">
        <h2 class="section-title">Report Details</h2>
        {md_html}
    </div>
    """
