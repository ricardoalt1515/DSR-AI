from app.visualization.pdf_sections import build_charts_section


def test_build_charts_section_ignores_process_flow_even_if_present():
    charts = {
        "process_flow": "fake-process-base64",
        "financial_executive": "fake-financial-base64",
    }

    html = build_charts_section(charts)

    assert "WASTE STREAMS & UPCYCLING PATHWAYS" not in html
    assert "pid-diagram" not in html
    assert "ECONOMIC ANALYSIS: SAVINGS & REVENUE" in html


def test_build_charts_section_keeps_financial_chart():
    charts = {"financial_executive": "fake-financial-base64"}

    html = build_charts_section(charts)

    assert "ECONOMIC ANALYSIS: SAVINGS & REVENUE" in html
    assert "data:image/png;base64,fake-financial-base64" in html


def test_build_charts_section_missing_financial_shows_notice():
    charts = {"process_flow": "fake-process-base64"}

    html = build_charts_section(charts)

    assert "ECONOMIC ANALYSIS: SAVINGS & REVENUE" in html
    assert "Visualization not available - insufficient data" in html
    assert "WASTE STREAMS & UPCYCLING PATHWAYS" not in html
