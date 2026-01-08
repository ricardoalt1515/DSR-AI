"""
PDF Styles Module.

Contains CSS styles and color constants for PDF generation.
Modern, professional design for sustainability reports.
"""

# Color palette constants - Navy + Forest Green theme
PDF_NAVY = "#1a1a2e"
PDF_NAVY_LIGHT = "#2d2d44"
PDF_FOREST = "#1b4332"
PDF_FOREST_LIGHT = "#2d6a4f"
PDF_TEAL = "#0d9488"
PDF_SLATE = "#475569"
PDF_GRAY_50 = "#f8fafc"
PDF_GRAY_100 = "#f1f5f9"
PDF_GRAY_200 = "#e2e8f0"
PDF_GRAY_300 = "#cbd5e1"
PDF_GRAY_400 = "#94a3b8"
PDF_GRAY_500 = "#64748b"
PDF_GRAY_600 = "#475569"
PDF_GRAY_700 = "#334155"
PDF_GRAY_800 = "#1e293b"
PDF_GRAY_900 = "#0f172a"


def get_professional_css() -> str:
    """
    Return complete CSS for professional PDF generation.

    Design principles:
    - Clean, modern typography with system fonts
    - Navy + Forest Green palette for sustainability focus
    - No gradients - solid colors for print reliability
    - Left accent borders for section hierarchy
    - Minimal shadows for clean appearance
    """
    return f"""
        @page {{
            size: A4;
            margin: 2cm 1.5cm;
            @bottom-center {{
                content: "Sustainability Report | Page " counter(page);
                font-size: 9px;
                color: {PDF_GRAY_500};
            }}
        }}

        * {{
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }}

        body {{
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
            line-height: 1.6;
            color: {PDF_SLATE};
            font-size: 11px;
        }}

        /* COVER PAGE */
        .cover-page {{
            page-break-after: always;
            height: 100vh;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
            text-align: center;
            background: white;
            padding: 2cm;
        }}

        .header-logo h1 {{
            font-size: 42px;
            font-weight: 600;
            margin-bottom: 8px;
            letter-spacing: 1px;
            color: {PDF_NAVY};
        }}

        .header-logo .subtitle {{
            font-size: 16px;
            font-weight: 400;
            color: {PDF_GRAY_500};
        }}

        .company-logo {{
            margin-bottom: 0;
            margin-top: -10px;
        }}

        .logo-placeholder {{
            height: 320px;
            width: 600px;
            margin: 0 auto 5px auto;
            border-radius: 8px;
            display: flex;
            align-items: center;
            justify-content: center;
            background: transparent;
            color: {PDF_GRAY_500};
            font-size: 12px;
            font-weight: 500;
        }}

        .logo-placeholder img {{
            max-height: 320px;
            max-width: 600px;
            width: auto;
            height: auto;
            object-fit: contain;
        }}

        .cover-content {{
            flex-grow: 1;
            display: flex;
            flex-direction: column;
            justify-content: center;
        }}

        .proposal-title {{
            font-size: 32px;
            font-weight: 600;
            margin-bottom: 16px;
            color: {PDF_NAVY};
        }}

        .client-name {{
            font-size: 20px;
            margin-bottom: 8px;
            font-weight: 400;
            color: {PDF_GRAY_600};
        }}

        .company-name {{
            font-size: 28px;
            font-weight: 600;
            margin-bottom: 32px;
            color: {PDF_FOREST};
        }}

        .cover-details {{
            background: {PDF_GRAY_50};
            border: 1px solid {PDF_GRAY_200};
            padding: 20px 24px;
            border-radius: 8px;
            margin: 20px auto;
            max-width: 360px;
        }}

        .cover-details p {{
            font-size: 13px;
            margin: 6px 0;
            color: {PDF_GRAY_600};
            text-align: left;
        }}

        .cover-footer {{
            color: {PDF_GRAY_500};
            font-size: 11px;
        }}

        /* MAIN CONTENT */
        .main-content, .technical-section, .charts-section {{
            margin-bottom: 24px;
        }}

        .section-title {{
            font-size: 18px;
            font-weight: 600;
            color: {PDF_NAVY};
            margin: 28px 0 16px 0;
            padding-left: 12px;
            border-left: 4px solid {PDF_FOREST};
            page-break-after: avoid;
        }}

        h1 {{
            font-size: 22px;
            color: {PDF_NAVY};
            margin: 24px 0 12px 0;
            font-weight: 600;
        }}

        h2 {{
            font-size: 16px;
            color: {PDF_NAVY_LIGHT};
            margin: 20px 0 10px 0;
            font-weight: 600;
        }}

        h3 {{
            font-size: 14px;
            color: {PDF_FOREST};
            margin: 16px 0 8px 0;
            font-weight: 600;
        }}

        h4 {{
            font-size: 12px;
            color: {PDF_GRAY_700};
            margin: 12px 0 6px 0;
            font-weight: 600;
        }}

        p {{
            margin-bottom: 10px;
            text-align: justify;
        }}

        ul, ol {{
            margin: 8px 0 16px 20px;
        }}

        li {{
            margin-bottom: 4px;
        }}

        /* TABLES - Clean, professional */
        table {{
            width: 100%;
            border-collapse: collapse;
            margin: 20px 0;
            font-size: 11px;
            page-break-inside: auto;
            border: 1px solid {PDF_GRAY_200};
            border-radius: 6px;
            overflow: hidden;
        }}

        th {{
            background: {PDF_NAVY};
            color: white;
            padding: 12px 10px;
            text-align: left;
            font-weight: 600;
            font-size: 11px;
            text-transform: uppercase;
            letter-spacing: 0.3px;
            border: none;
        }}

        td {{
            padding: 10px;
            border-bottom: 1px solid {PDF_GRAY_200};
            vertical-align: top;
            font-size: 11px;
            line-height: 1.4;
        }}

        tr:nth-child(even) {{
            background: {PDF_GRAY_50};
        }}

        tr:nth-child(odd) {{
            background: white;
        }}

        tr:last-child td {{
            border-bottom: none;
        }}

        /* SPECIALIZED TABLES */
        .equipment-table, .financial-table, .phases-table {{
            width: 100%;
            border-collapse: collapse;
            margin: 20px 0;
            font-size: 11px;
            page-break-inside: auto;
            border: 1px solid {PDF_GRAY_200};
            border-radius: 6px;
            overflow: hidden;
            table-layout: fixed;
        }}

        .equipment-table th, .financial-table th, .phases-table th {{
            background: {PDF_NAVY};
            color: white;
            padding: 12px 10px;
            text-align: left;
            font-weight: 600;
            font-size: 11px;
            text-transform: uppercase;
            letter-spacing: 0.3px;
            border: none;
        }}

        .equipment-table td, .financial-table td, .phases-table td {{
            padding: 10px 8px;
            border-bottom: 1px solid {PDF_GRAY_200};
            vertical-align: top;
            font-size: 11px;
            line-height: 1.4;
            word-wrap: break-word;
            overflow-wrap: break-word;
        }}

        .equipment-table tr:nth-child(even), .financial-table tr:nth-child(even), .phases-table tr:nth-child(even) {{
            background: {PDF_GRAY_50};
        }}

        .equipment-table tr:nth-child(odd), .financial-table tr:nth-child(odd), .phases-table tr:nth-child(odd) {{
            background: white;
        }}

        /* TECHNOLOGY JUSTIFICATION TABLE */
        .equipment-table.tech-justification {{
            table-layout: fixed;
            width: 100%;
        }}

        .equipment-table.tech-justification th:nth-child(1),
        .equipment-table.tech-justification td:nth-child(1) {{
            width: 20%;
        }}

        .equipment-table.tech-justification th:nth-child(2),
        .equipment-table.tech-justification td:nth-child(2) {{
            width: 40%;
        }}

        .equipment-table.tech-justification th:nth-child(3),
        .equipment-table.tech-justification td:nth-child(3) {{
            width: 25%;
        }}

        .equipment-table.tech-justification th:nth-child(4),
        .equipment-table.tech-justification td:nth-child(4) {{
            width: 15%;
        }}

        .numeric {{
            text-align: right;
            font-weight: 600;
            font-family: "SF Mono", "Consolas", "Monaco", monospace;
            color: {PDF_NAVY};
            padding-right: 12px !important;
        }}

        .stage-name {{
            font-weight: 600;
            color: {PDF_NAVY};
            font-size: 11px;
        }}

        .key-specs {{
            display: block;
            color: {PDF_GRAY_500};
            font-size: 10px;
            font-style: italic;
            margin-top: 4px;
        }}

        .phase-name {{
            font-weight: 600;
            color: {PDF_FOREST};
            font-size: 11px;
        }}

        .total-row {{
            background: {PDF_GRAY_100} !important;
            border-top: 2px solid {PDF_NAVY} !important;
            font-weight: 600 !important;
        }}

        .total-row td {{
            padding: 12px 10px !important;
        }}

        /* EFFICIENCY INDICATORS */
        .efficiency-visual-section {{
            margin: 24px 0;
            padding: 16px;
            background: {PDF_GRAY_50};
            border-radius: 8px;
            border: 1px solid {PDF_GRAY_200};
        }}

        .efficiency-bars {{
            display: flex;
            flex-direction: column;
            gap: 12px;
            margin-top: 16px;
        }}

        .efficiency-item {{
            display: flex;
            align-items: center;
            padding: 10px 16px;
            border-radius: 6px;
            border: 1px solid;
            font-weight: 500;
        }}

        .efficiency-item.efficiency-high {{
            background: #ecfdf5;
            border-color: {PDF_FOREST_LIGHT};
            color: {PDF_FOREST};
        }}

        .efficiency-item.efficiency-medium {{
            background: #fef3c7;
            border-color: #d97706;
            color: #92400e;
        }}

        .efficiency-item.efficiency-low {{
            background: #fef2f2;
            border-color: #dc2626;
            color: #991b1b;
        }}

        .efficiency-label {{
            flex: 1;
            font-size: 13px;
            text-align: left;
        }}

        .efficiency-value {{
            font-size: 16px;
            font-weight: 600;
            text-align: center;
            min-width: 70px;
        }}

        /* SYSTEM SUMMARY BOX */
        .system-summary-section {{
            margin: 24px 0;
        }}

        .system-summary-box {{
            background: #f0fdf4;
            border: 1px solid {PDF_FOREST_LIGHT};
            border-radius: 8px;
            padding: 16px 20px;
            margin: 16px 0;
        }}

        .system-summary-box h4 {{
            color: {PDF_FOREST};
            margin: 0 0 12px 0;
            text-align: center;
            font-size: 14px;
        }}

        .summary-grid {{
            display: flex;
            justify-content: space-around;
            flex-wrap: wrap;
            gap: 12px;
        }}

        .summary-item {{
            text-align: center;
            min-width: 100px;
        }}

        .summary-label {{
            display: block;
            font-size: 11px;
            color: {PDF_GRAY_600};
            margin-bottom: 4px;
        }}

        .summary-value {{
            display: block;
            font-size: 14px;
            font-weight: 600;
            color: {PDF_NAVY};
        }}

        .summary-item .label {{
            display: block;
            font-size: 11px;
            color: {PDF_GRAY_500};
            margin-bottom: 4px;
        }}

        .summary-item .value {{
            display: block;
            font-size: 14px;
            font-weight: 600;
            color: {PDF_NAVY};
        }}

        /* CHART CONTAINERS */
        .chart-container {{
            page-break-inside: avoid;
            margin: 24px 0;
            text-align: center;
            padding: 16px;
            background: white;
            border-radius: 8px;
            border: 1px solid {PDF_GRAY_200};
            width: 100%;
            max-width: 100%;
            overflow: hidden;
        }}

        .chart-full-page.pid-diagram {{
            page-break-inside: avoid;
            margin-bottom: 20px;
        }}

        .chart-image {{
            max-width: 100%;
            width: 100%;
            height: auto;
            border: 1px solid {PDF_GRAY_200};
            border-radius: 4px;
            margin: 0 auto;
            display: block;
            background: white;
            padding: 4px;
        }}

        .chart-full-page.pid-diagram .chart-image {{
            max-height: 650px;
        }}

        .charts-footer {{
            margin-top: 32px;
            padding: 16px;
            background: {PDF_GRAY_50};
            border: 1px solid {PDF_GRAY_200};
            border-radius: 6px;
            font-size: 10px;
            color: {PDF_GRAY_500};
            text-align: center;
        }}

        .chart-title {{
            font-size: 14px;
            font-weight: 600;
            color: {PDF_NAVY};
            margin-bottom: 12px;
            text-align: center;
            padding-bottom: 8px;
            border-bottom: 2px solid {PDF_FOREST};
        }}

        .chart-subtitle {{
            font-size: 11px;
            color: {PDF_GRAY_500};
            margin-top: 8px;
            font-style: italic;
            text-align: center;
        }}

        /* FULL PAGE CHART */
        .chart-full-page {{
            page-break-before: always;
            page-break-after: always;
            margin: 0;
            padding: 8px;
            text-align: center;
            width: 100%;
            height: auto;
            min-height: 750px;
            background: white;
            border: 1px solid {PDF_GRAY_200};
        }}

        .chart-full-page .chart-title {{
            margin-bottom: 10px;
            font-size: 18px;
            font-weight: 600;
            color: {PDF_NAVY};
        }}

        .chart-full-page .chart-subtitle {{
            margin-bottom: 12px;
            font-size: 11px;
            color: {PDF_GRAY_500};
            font-style: italic;
            line-height: 1.4;
            max-width: 80%;
            margin-left: auto;
            margin-right: auto;
        }}

        .chart-full-page .chart-image {{
            max-width: 100%;
            width: 100%;
            height: auto;
            max-height: 800px;
            object-fit: contain;
            margin: 0 auto;
            display: block;
            border: 1px solid {PDF_GRAY_300};
            border-radius: 6px;
            background: white;
            padding: 8px;
        }}

        /* P&ID DIAGRAM */
        .chart-full-page.pid-diagram {{
            background: white;
            border: 1px solid {PDF_GRAY_300};
        }}

        .chart-full-page.pid-diagram .chart-image {{
            border: 1px solid {PDF_NAVY_LIGHT};
        }}

        .missing-chart-notice {{
            background: #fef2f2;
            border: 1px dashed #dc2626;
            padding: 24px;
            margin: 16px 0;
            border-radius: 6px;
            text-align: center;
        }}

        .missing-chart-notice h3 {{
            color: #991b1b;
            margin-bottom: 8px;
            font-size: 14px;
        }}

        .missing-chart-notice p {{
            color: #7f1d1d;
            font-size: 11px;
        }}

        /* FOOTER PAGE */
        .footer-page {{
            page-break-before: always;
            padding: 32px 0;
        }}

        .contact-info {{
            background: {PDF_FOREST};
            color: white;
            padding: 24px;
            border-radius: 8px;
            margin-bottom: 24px;
            text-align: center;
        }}

        .contact-info h3 {{
            font-size: 20px;
            margin-bottom: 16px;
            color: white;
            font-weight: 600;
        }}

        .contact-info p {{
            font-size: 13px;
            margin: 6px 0;
            text-align: center;
        }}

        .disclaimer {{
            background: {PDF_GRAY_50};
            border: 1px solid {PDF_GRAY_200};
            padding: 16px 20px;
            border-radius: 6px;
        }}

        .disclaimer h4 {{
            color: {PDF_GRAY_700};
            margin-bottom: 8px;
            font-size: 12px;
        }}

        .disclaimer p {{
            font-size: 10px;
            line-height: 1.5;
            color: {PDF_GRAY_500};
            text-align: left;
        }}

        /* METRIC BADGES */
        .metric-badge {{
            display: inline-block;
            padding: 4px 12px;
            border-radius: 16px;
            font-size: 11px;
            font-weight: 600;
            text-transform: capitalize;
        }}

        .badge-high {{
            background: #ecfdf5;
            color: {PDF_FOREST};
        }}

        .badge-medium {{
            background: #fef3c7;
            color: #92400e;
        }}

        .badge-low {{
            background: #fef2f2;
            color: #991b1b;
        }}

        .badge-unknown {{
            background: {PDF_GRAY_100};
            color: {PDF_GRAY_600};
        }}

        /* VALORIZATION CARDS */
        .valorization-cards {{
            margin: 16px 0;
        }}

        .valorization-card {{
            background: white;
            border: 1px solid {PDF_GRAY_200};
            border-left: 3px solid {PDF_FOREST};
            border-radius: 6px;
            padding: 12px 16px;
            margin-bottom: 12px;
            page-break-inside: avoid;
        }}

        .valorization-card h4 {{
            color: {PDF_NAVY};
            margin: 0 0 6px 0;
            font-size: 12px;
            font-weight: 600;
        }}

        .valorization-card p {{
            color: {PDF_GRAY_500};
            font-size: 11px;
            margin: 0;
            line-height: 1.5;
        }}

        /* ESG BENEFITS LIST */
        .esg-list {{
            list-style: none;
            margin: 12px 0;
            padding: 0;
        }}

        .esg-list li {{
            padding: 8px 12px;
            margin-bottom: 8px;
            background: #f0fdf4;
            border-radius: 4px;
            border-left: 3px solid {PDF_FOREST_LIGHT};
            font-size: 11px;
            color: {PDF_GRAY_700};
        }}

        /* END USE INDUSTRIES */
        .end-use-grid {{
            display: flex;
            flex-wrap: wrap;
            gap: 8px;
            margin: 12px 0;
        }}

        .end-use-tag {{
            display: inline-block;
            padding: 6px 12px;
            background: {PDF_GRAY_50};
            border: 1px solid {PDF_GRAY_200};
            border-radius: 4px;
            font-size: 11px;
            color: {PDF_GRAY_700};
        }}

        /* UTILITIES */
        .page-break {{
            page-break-before: always;
        }}

        .no-break {{
            page-break-inside: avoid;
        }}
        """
