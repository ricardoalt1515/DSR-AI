"""
Assessment Questionnaire Template for Waste Resource Management.

This is the single source of truth for the assessment form structure.
Based on DSR-AI-QUESTIONNAIRE.md - Industrial Waste Resource Upcycling.

Note: Company, Location, Sector, Subsector are captured during project creation,
so they are NOT included in this questionnaire.
"""

# ============================================================================
# QUESTIONNAIRE OPTIONS - from DSR-AI-QUESTIONNAIRE.md
# ============================================================================

# Waste types (exact from document)
WASTE_TYPES = [
    "Plastics",
    "Metals",
    "E-scrap / E-waste",
    "Cardboard",
    "Packaging",
    "Glass / Ceramics",
    "Wood / Textile",
    "Hazardous chemicals",
    "Non-hazardous chemicals",
    "Organic / Biowaste",
    "Construction / Demolition",
    "Pallets / Crates",
    "Totes",
    "Drums",
    "Solvents",
    "Oils / Fuels",
    "Water",
    "Other (describe)",
]

# Volume units (common in waste management - from "kg/day, tons/month, etc.")
VOLUME_UNITS = [
    "kg/day",
    "kg/week",
    "kg/month",
    "tons/day",
    "tons/week",
    "tons/month",
    "cubic meters/day",
    "cubic meters/month",
    "cubic yards/month",
    "liters/day",
    "gallons/day",
]

# Handling practices (exact from document)
HANDLING_PRACTICES = [
    "Landfilling",
    "Incineration",
    "Waste to Energy (third-party recovery)",
    "Recycling",
    "Reuse (internal or external)",
    "Third-party recovery",
]

# Storage infrastructure (common options based on industry standards)
STORAGE_INFRASTRUCTURE = [
    "Compactor",
    "Baler",
    "Roll-off containers",
    "Front-load dumpsters",
    "Covered storage area",
    "Refrigerated storage",
    "Hazmat storage facility",
    "Segregated bin system",
    "No infrastructure",
    "Other",
]

# Operational constraints (exact from document)
OPERATIONAL_CONSTRAINTS = [
    "Space limitations",
    "Budget limitations",
    "Permit / environmental limits",
    "Staff availability",
    "Energy availability",
    "Safety concerns",
]

# Timeframe options (exact from document)
TIMEFRAMES = ["Immediate (0-3 months)", "Mid-term (3-12 months)", "Long-term (>1 year)"]

# Client objectives (from document - for multi-select)
CLIENT_OBJECTIVES = [
    "Reduce landfill volume",
    "Generate secondary revenue",
    "Achieve ESG / CSR sustainability targets",
    "Meet compliance / environmental regulations",
    "Reduce disposal costs",
    "Improve circularity",
]

# CapEx budget ranges
CAPEX_RANGES = ["$0-$50k", "$50k-$100k", "$100k-$250k", "$250k-$500k", "$500k-$1M", ">$1M"]

# Yes/No options (reused)
YES_NO = ["yes", "no"]


def get_assessment_questionnaire() -> list[dict]:
    """
    Returns the standard assessment questionnaire structure.

    Based on DSR-AI-QUESTIONNAIRE.md - focused on critical waste management info.
    Company, Location, Sector already captured during project creation.

    Each field contains:
    - id: unique identifier
    - label: display text
    - value: default value (empty for user input)
    - type: field type (text, select, checkbox-group, radio, textarea)
    - options: available choices (for select/checkbox/radio)
    - required: whether field must be filled
    - source: data source (always "manual" for questionnaire)
    - conditional: optional - show field only if condition met

    Returns:
        List of sections, each containing fields
    """
    return [
        # ================================================================
        # SECTION 1: Waste Generation Details (MOST CRITICAL)
        # ================================================================
        {
            "id": "waste-generation",
            "order": 1,
            "title": "1. Waste Generation Details",
            "description": "Critical information about waste types, volumes, and current handling",
            "fields": [
                {
                    "id": "waste-types",
                    "label": "Type of Waste Generated",
                    "value": "",
                    "type": "combobox",
                    "options": WASTE_TYPES,
                    "required": True,
                    "placeholder": "Search or type a waste type...",
                    "description": "Select a waste type from the list or type a custom one",
                    "source": "manual",
                },
                {
                    "id": "waste-description",
                    "label": "Describe your waste materials",
                    "value": "",
                    "type": "text",
                    "multiline": True,
                    "placeholder": "Example: Post-industrial HDPE scrap from injection molding, mostly clean with some oil residue. Also have cardboard packaging, baled and dry.",
                    "description": "Provide details: material condition, contamination, form (bales, loose, drums), origin, etc.",
                    "source": "manual",
                },
                {
                    "id": "volume-per-category",
                    "label": "Volume per Category (e.g., kg/day, tons/month)",
                    "value": "",
                    "type": "text",
                    "multiline": True,
                    "placeholder": "Plastics: 500 kg/day\nMetals: 200 tons/month\nCardboard: 1.5 cubic meters/day",
                    "description": "Specify volume for each waste type selected above",
                    "source": "manual",
                },
                {
                    "id": "seasonal-variations",
                    "label": "Seasonal Variations in Waste Volumes",
                    "value": "",
                    "type": "text",
                    "multiline": True,
                    "placeholder": "Describe any seasonal variations (e.g., higher volumes in summer) or write 'No significant seasonal variations' if not applicable",
                    "description": "Explain how waste volumes change throughout the year, or indicate if there are no significant variations",
                    "source": "manual",
                },
                {
                    "id": "current-practices",
                    "label": "Existing Waste Handling Practices (select all that apply)",
                    "value": [],
                    "type": "tags",
                    "options": HANDLING_PRACTICES,
                    "required": True,
                    "placeholder": "Select practices or add custom...",
                    "description": "Select current handling methods or add custom practices",
                    "source": "manual",
                },
                {
                    "id": "segregation",
                    "label": "Waste Segregation Practices",
                    "value": "",
                    "type": "text",
                    "multiline": True,
                    "placeholder": "Describe how you segregate waste (e.g., by material type, recyclables vs non-recyclables) or write 'No segregation currently' if not applicable",
                    "description": "Explain your waste segregation process or indicate if you don't currently segregate",
                    "source": "manual",
                },
                {
                    "id": "storage-infrastructure",
                    "label": "Onsite waste storage or processing infrastructure",
                    "value": [],
                    "type": "tags",
                    "options": STORAGE_INFRASTRUCTURE,
                    "placeholder": "Select infrastructure or add custom...",
                    "description": "Select existing infrastructure or describe custom equipment",
                    "source": "manual",
                },
                {
                    "id": "revenue-streams",
                    "label": "Revenue from Waste Streams",
                    "value": "",
                    "type": "text",
                    "multiline": True,
                    "placeholder": "Describe which waste types generate revenue (e.g., scrap metal, cardboard) and approximate amounts, or write 'No revenue currently' if not applicable",
                    "description": "Explain revenue-generating waste streams or indicate if none currently generate revenue",
                    "source": "manual",
                },
                {
                    "id": "waste-audit",
                    "label": "Waste Audit Documentation",
                    "value": "",
                    "type": "text",
                    "multiline": True,
                    "placeholder": "Describe available waste audit documentation (type, date, scope) or write 'No audit documentation available' if not applicable",
                    "description": "Explain what waste audit documentation you have, or indicate if none is available",
                    "source": "manual",
                },
                {
                    "id": "pain-points",
                    "label": "Priority Pain Points",
                    "value": "",
                    "type": "text",
                    "multiline": True,
                    "placeholder": "What are your biggest challenges? (e.g., high disposal costs, compliance issues, sustainability goals)",
                    "description": "EHS, facility, or corporate priorities due to high cost or desire to recycle vs landfill",
                    "source": "manual",
                },
            ],
        },
        # ================================================================
        # SECTION 2: Objectives & Constraints
        # ================================================================
        {
            "id": "objectives-constraints",
            "order": 2,
            "title": "2. Objectives & Constraints",
            "description": "Client priorities and operational limitations",
            "fields": [
                {
                    "id": "primary-objectives",
                    "label": "What are your primary objectives? (select all that apply)",
                    "value": [],
                    "type": "tags",
                    "options": CLIENT_OBJECTIVES,
                    "required": True,
                    "placeholder": "Select all important objectives...",
                    "description": "Select all objectives that are important to your organization",
                    "source": "manual",
                },
                {
                    "id": "objectives-context",
                    "label": "Provide context on your priorities",
                    "value": "",
                    "type": "text",
                    "multiline": True,
                    "placeholder": "Example: Our #1 priority is reducing disposal costs because we currently spend $50,000/month. We also need to meet corporate ESG targets by 2025 to comply with our sustainability commitments.",
                    "description": "Explain which objectives are most important and why. Include specific targets, deadlines, or financial impacts if known.",
                    "source": "manual",
                },
                {
                    "id": "constraints",
                    "label": "Operational Constraints (select all that apply)",
                    "value": [],
                    "type": "tags",
                    "options": OPERATIONAL_CONSTRAINTS,
                    "placeholder": "Select constraints or add custom...",
                    "description": "Select applicable constraints or describe custom limitations",
                    "source": "manual",
                },
                {
                    "id": "regulatory-drivers",
                    "label": "Regulatory Drivers or Corporate/Industry Mandates",
                    "value": "",
                    "type": "text",
                    "multiline": True,
                    "placeholder": "Any specific regulations or mandates driving this initiative?",
                    "source": "manual",
                },
                {
                    "id": "capex-interest",
                    "label": "CapEx Investment Interest & Budget",
                    "value": "",
                    "type": "text",
                    "multiline": True,
                    "placeholder": "Describe your interest in CapEx investments, budget range, or write 'Not interested' if not applicable",
                    "description": "Explain your CapEx investment plans, budget considerations, or indicate if not interested",
                    "source": "manual",
                },
                {
                    "id": "timeframe",
                    "label": "Timeframe for implementation",
                    "value": "",
                    "type": "combobox",
                    "options": TIMEFRAMES,
                    "placeholder": "Search or type timeframe...",
                    "required": True,
                    "source": "manual",
                },
            ],
        },
    ]
