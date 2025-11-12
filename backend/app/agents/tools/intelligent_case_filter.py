"""
Two-Pass Intelligent Case Filter for Water Treatment
Provides curated, relevant cases with intelligent filtering and metadata.
"""

import json
import logging
import re
from pathlib import Path
from typing import Any

from pydantic_ai import RunContext

from app.agents.proposal_agent import ProposalContext

logger = logging.getLogger("hydrous")

# Simple cache
_knowledge_base = None

# Stable contaminant detection tokens (covers 90%+ cases)
CONTAMINANT_TOKENS = {
    "organics": ["bod", "cod", "fog"],
    "suspended": ["tss"],
    "nutrients": ["nitrogen", "phosphorus", "ammonia", "tn", "tp"],  # Added TN, TP from JSON
    "metals": ["metal", "chromium", "nickel", "copper", "zinc", "lead"],
    "hydrocarbons": ["oil", "hydrocarbon", "petroleum"],
    "ph": ["ph:", "ph level", "ph=", "'ph'"],  # Fixed: More specific to avoid false positives (e.g., "phosphorus")
    "color": ["color", "dyes"],  # Added color detection for textile cases
}


def load_knowledge_base() -> dict[str, Any]:
    """Load knowledge base once"""
    global _knowledge_base
    if _knowledge_base is None:
        try:
            path = Path(__file__).parent.parent.parent / "data" / "water_treatment_knowledge.json"
            with open(path) as f:
                _knowledge_base = json.load(f)
            logger.info("✅ Knowledge base loaded")
        except Exception as e:
            logger.error(f"❌ Failed to load knowledge base: {e}")
            _knowledge_base = {"applications": []}
    return _knowledge_base


def extract_user_context(ctx: RunContext[ProposalContext]) -> tuple[str, str]:
    """Extract sector and subsector from context for better matching precision"""
    water_data = ctx.deps.water_data
    client_metadata = ctx.deps.client_metadata

    # Extract sector
    sector = (
        water_data.sector
        or client_metadata.get("selected_sector", "")
        or ""
    ).lower()

    # Extract subsector (NEW - for better precision)
    subsector = (
        getattr(water_data, 'subsector', None)  # May not exist in old data models
        or client_metadata.get("selected_subsector", "")
        or ""
    ).lower()

    return sector, subsector


def extract_user_keywords(
    ctx: RunContext[ProposalContext],
) -> tuple[list[str], list[str], set[str]]:
    """
    Extract keywords from user context with improved subsector support
    Returns: (subsector_keywords, sector_keywords, contaminant_categories)
    """
    # Extract sector and subsector
    sector, subsector = extract_user_context(ctx)

    # Subsector keywords (higher priority for matching)
    subsector_keywords = []
    if subsector:
        # Handle underscore-separated subsectors (e.g., "food_service" -> ["food", "service"])
        subsector_words = subsector.replace("_", " ").split()
        subsector_keywords = [word for word in subsector_words if len(word) > 2]

    # Sector keywords (lower priority)
    sector_keywords = [word for word in sector.split() if len(word) > 2] if sector else []

    # Contaminant detection from water_data dump
    try:
        water_dump = str(ctx.deps.water_data.model_dump(exclude_none=True)).lower()
    except Exception:
        water_dump = ""
        logger.warning("Could not extract water_data dump, using empty string")

    detected_contaminants = set()

    for category, tokens in CONTAMINANT_TOKENS.items():
        for token in tokens:
            if token in water_dump:
                detected_contaminants.add(category)
                break  # One token per category is enough

    return subsector_keywords, sector_keywords, detected_contaminants


def keyword_score(
    case: dict[str, Any],
    subsector_keywords: list[str],
    sector_keywords: list[str],
    contaminant_categories: set[str]
) -> int:
    """
    Score case by keyword matches with weighted scoring
    Subsector matches (5 pts) > Sector matches (2 pts) > Contaminants (1 pt)
    """
    # Combine relevant text fields
    case_text = " ".join(
        [
            case.get("application_type", ""),
            case.get("description", ""),
            case.get("influent_characteristics", ""),
        ]
    ).lower()

    score = 0

    # PRIORITY 1: Subsector keywords (highest weight)
    for keyword in subsector_keywords:
        if keyword in case_text:
            score += 5  # Subsector match is most important

    # PRIORITY 2: Sector keywords (medium weight)
    for keyword in sector_keywords:
        if keyword in case_text:
            score += 2  # Sector match

    # PRIORITY 3: Contaminant categories (base weight)
    for category in contaminant_categories:
        for token in CONTAMINANT_TOKENS[category]:
            if token in case_text:
                score += 1
                break  # One token per category

    return score


def normalize_flow_to_m3_day(value: float, unit: str) -> float:
    """
    Convert flow from any unit to m³/day.
    Supports common flow units used in water treatment.
    
    Args:
        value: Flow value
        unit: Unit string (case-insensitive)
    
    Returns:
        Flow normalized to m³/day
    """
    # Normalize unit to lowercase for comparison
    unit_lower = unit.lower().strip()

    # Conversion factors to m³/day
    conversions = {
        "m³/day": 1.0,
        "m3/day": 1.0,
        "m³/d": 1.0,
        "m3/d": 1.0,
        "l/s": 86.4,      # 1 L/s = 86.4 m³/day
        "lps": 86.4,
        "m³/h": 24.0,     # 1 m³/h = 24 m³/day
        "m3/h": 24.0,
        "m³/hr": 24.0,
        "m3/hr": 24.0,
        "gpm": 5.451,     # 1 GPM = 5.451 m³/day
        "mgd": 3785.41,   # 1 MGD = 3785.41 m³/day
    }

    factor = conversions.get(unit_lower, 1.0)
    return value * factor


def detect_user_flow(ctx: RunContext[ProposalContext]) -> float | None:
    """
    Extract flow rate from FlexibleWaterProjectData.technical_sections.
    Searches for "Water Consumption" or "Wastewater Generated" fields.
    
    Returns:
        Flow in m³/day or None if not found
    """
    try:
        water_data = ctx.deps.water_data

        # Search in technical_sections (where data actually lives)
        if hasattr(water_data, 'technical_sections'):
            for section in water_data.technical_sections:
                for field in section.fields:
                    # Look for flow-related fields
                    if field.label in ["Water Consumption", "Wastewater Generated"]:
                        if field.value:
                            try:
                                value = float(field.value)
                                unit = field.unit or "m³/day"
                                normalized = normalize_flow_to_m3_day(value, unit)

                                # Sanity check
                                if 0.1 <= normalized <= 1_000_000:
                                    logger.info(f"✅ Flow detected: {normalized:.1f} m³/day (from {field.label}: {value} {unit})")
                                    return normalized
                            except (ValueError, TypeError) as e:
                                logger.debug(f"⚠️ Could not parse flow from {field.label}: {e}")
                                continue

        logger.debug("⚠️ No flow detected in technical_sections")
        return None

    except Exception as e:
        logger.warning(f"⚠️ Flow detection error: {e}")
        return None


def parse_flow_range(flow_text: str) -> tuple[float, float] | None:
    """
    Parse flow range from case text
    Examples: "50-150 m³/day", "100 m³/d", "50–5,000"
    Returns: (min_flow, max_flow) or None
    """
    if not flow_text:
        return None

    try:
        # Handle various separators and formats
        flow_clean = re.sub(r"[^\d\-–.–,]", " ", flow_text)

        # Look for range patterns
        range_match = re.search(r"(\d+(?:\.\d+)?)\s*[-–]\s*(\d+(?:,\d+)*(?:\.\d+)?)", flow_clean)
        if range_match:
            min_val = float(range_match.group(1))
            max_val = float(range_match.group(2).replace(",", ""))
            return (min_val, max_val)

        # Single value
        single_match = re.search(r"(\d+(?:\.\d+)?)", flow_clean)
        if single_match:
            val = float(single_match.group(1))
            return (val * 0.8, val * 1.2)  # Assume ±20% range

        return None
    except:
        return None


def is_flow_compatible(user_flow: float, case_flow_range: str) -> bool:
    """
    Check if user flow is compatible with case flow range
    Prioritizes range inclusion over ratio comparisons for wide ranges
    """
    case_range = parse_flow_range(case_flow_range)
    if not case_range:
        return True  # Can't parse, don't exclude

    case_min, case_max = case_range

    # PRIORITY 1: If user flow is within the range, always compatible
    if case_min <= user_flow <= case_max:
        return True

    # PRIORITY 2: For flows outside range, use permissive ratio check
    # Compare to closest boundary instead of average
    if user_flow < case_min:
        ratio = case_min / user_flow
    else:  # user_flow > case_max
        ratio = user_flow / case_max

    # Allow up to 10x difference from range boundaries
    return ratio < 10


def detect_regulatory_mismatch(user_regulation: str, case_regulation: str) -> str | None:
    """
    Detect if regulations are different and suggest adaptation type
    """
    if not user_regulation or not case_regulation:
        return None

    user_reg = user_regulation.lower()
    case_reg = case_regulation.lower()

    # Simple mismatch detection
    if "eu" in user_reg and "epa" in case_reg:
        return "eu_from_epa"
    elif "epa" in user_reg and "eu" in case_reg:
        return "epa_from_eu"
    elif user_reg != case_reg:
        return "regulatory_adjustment_needed"

    return None


def generate_why_relevant(
    case: dict,
    subsector_keywords: list[str],
    sector_keywords: list[str],
    contaminant_categories: set[str],
    user_flow: float | None,
) -> list[str]:
    """
    Generate explanation bullets for why this case is relevant
    """
    reasons = []

    # Subsector relevance (highest priority)
    case_type = case.get("application_type", "").lower()
    subsector_matches = [kw for kw in subsector_keywords if kw in case_type]
    if subsector_matches:
        reasons.append(f"Subsector: {'/'.join(subsector_matches)} match")

    # Sector relevance (medium priority)
    sector_matches = [kw for kw in sector_keywords if kw in case_type]
    if sector_matches and not subsector_matches:  # Only show if no subsector match
        reasons.append(f"Sector: {'/'.join(sector_matches)} match")

    # Contaminant relevance (concise)
    case_contaminants = case.get("influent_characteristics", "").lower()
    contaminant_matches = []
    for category in contaminant_categories:
        for token in CONTAMINANT_TOKENS[category]:
            if token in case_contaminants:
                contaminant_matches.append(category)
                break
    if contaminant_matches:
        reasons.append(f"Contaminants: {', '.join(contaminant_matches)}")

    # Flow relevance (concise)
    if user_flow:
        case_flow = case.get("typical_flow_range", "")
        if is_flow_compatible(user_flow, case_flow):
            reasons.append(f"Flow: {user_flow} vs {case_flow} ✓")
        else:
            reasons.append(f"Flow: {user_flow} vs {case_flow} (scale)")

    return reasons[:3]  # Limit to 3 bullets


def two_pass_filter(applications: list[dict], ctx: RunContext[ProposalContext]) -> list[dict]:
    """
    🎯 Two-Pass Intelligent Filtering System (Enhanced with Subsector Support)

    PASS 1: Weighted keyword scoring (subsector > sector > contaminants)
    PASS 2: Flow compatibility and final ranking (8 → 2-3 cases)
    """
    if not applications:
        return []

    # Extract user context (now includes subsector)
    subsector_keywords, sector_keywords, contaminant_categories = extract_user_keywords(ctx)
    user_flow = detect_user_flow(ctx)

    logger.info(
        f"🔍 Two-Pass filter: subsector={subsector_keywords}, sector={sector_keywords}, "
        f"contaminants={contaminant_categories}, flow={user_flow}"
    )

    # PASS 1: Weighted keyword scoring (subsector priority)
    scored_cases = []
    for case in applications:
        score = keyword_score(case, subsector_keywords, sector_keywords, contaminant_categories)
        if score > 0:  # Only include cases with some relevance
            scored_cases.append((score, case))

    # Sort by score and take top 8 candidates
    scored_cases.sort(key=lambda x: x[0], reverse=True)
    candidates = [case for score, case in scored_cases[:8]]

    if not candidates:
        # Low-signal fallback
        logger.info("⚠️ No keyword matches found, using fallback cases")
        candidates = applications[:3]

    # PASS 2: Sector-aware flow compatibility and final selection
    if user_flow:
        # Separate by sector relevance first, then apply flow filtering
        high_sector_score_cases = []
        low_sector_score_cases = []

        for case in candidates:
            # Get the keyword score for this case (subsector + sector)
            combined_score = keyword_score(case, subsector_keywords, sector_keywords, set())
            if combined_score >= 5:  # Has subsector or strong sector match
                high_sector_score_cases.append(case)
            else:
                low_sector_score_cases.append(case)

        # Apply flow filtering with different priorities
        compatible_cases = []
        incompatible_cases = []

        # PRIORITY 1: Keep sector-relevant cases even if flow is not perfect
        for case in high_sector_score_cases:
            case_flow_range = case.get("typical_flow_range", "")
            if is_flow_compatible(user_flow, case_flow_range):
                compatible_cases.append(case)
            else:
                # For same-sector cases, be more lenient with flow
                case_range = parse_flow_range(case_flow_range)
                if case_range:
                    case_min, case_max = case_range
                    # Allow larger ratios for same-sector cases
                    if case_min <= user_flow <= case_max * 5:  # More lenient upper bound
                        compatible_cases.append(case)
                        # DEBUG-FLOW: Special case inclusion (uncomment for flow debugging)
                        # logger.info(f"🔧 Kept sector-relevant case despite flow: {case.get('application_type')} ({case_flow_range})")
                    else:
                        incompatible_cases.append(
                            (case.get("application_type", ""), case_flow_range)
                        )
                else:
                    compatible_cases.append(case)  # No flow data, keep sector match

        # PRIORITY 2: Add other cases if flow is compatible
        for case in low_sector_score_cases:
            case_flow_range = case.get("typical_flow_range", "")
            if is_flow_compatible(user_flow, case_flow_range):
                compatible_cases.append(case)
            else:
                incompatible_cases.append((case.get("application_type", ""), case_flow_range))

        # Production logging (always active)
        logger.info(
            f"🔍 Flow filtering: {user_flow} m³/d → {len(compatible_cases)} compatible cases"
        )

        # DEBUG-FLOW: Detailed flow analysis (uncomment for flow debugging)
        # logger.info(f"🔧 Flow gating debug: user_flow={user_flow} m³/d")
        # logger.info(f"🔧 High sector relevance cases: {len(high_sector_score_cases)}")
        # logger.info(f"🔧 Compatible cases total: {len(compatible_cases)}")
        # if incompatible_cases:
        #     logger.info(f"🔧 Excluded by flow: {incompatible_cases[:3]}")  # Show first 3

        if compatible_cases:
            candidates = compatible_cases

    # Return top 2-3 cases
    final_cases = candidates[:3]

    logger.info(
        f"✅ Two-Pass complete: {len(applications)} → {len(scored_cases)} → {len(candidates)} → {len(final_cases)}"
    )

    return final_cases


async def get_engineering_references(ctx: RunContext[ProposalContext]) -> dict[str, Any]:
    """
    🎯 Two-Pass Intelligent Case Filter

    Provides 2-3 most relevant cases with metadata explaining relevance.
    Uses keyword scoring + flow compatibility for intelligent selection.

    Returns curated cases with:
    - why_relevant: Explanation bullets
    - regulatory_notes: Adaptation guidance
    - Optimized data structure for token efficiency
    """
    try:
        # Simple validation for critical data
        if not ctx.deps.water_data:
            return {
                "similar_cases": [],
                "user_sector": "unknown",
                "user_subsector": "unknown",
                "total_found": 0,
                "search_profile": {"total_cases": 0},
                "message": "Water project data unavailable. Proceeding with general engineering analysis.",
                "status": "fallback"
            }

        # Load data
        kb = load_knowledge_base()
        applications = kb.get("applications", [])

        if not applications:
            return {
                "similar_cases": [],
                "message": "No reference cases available",
                "search_profile": {"total_cases": 0},
            }

        # Extract user context for logging (now includes subsector)
        subsector_keywords, sector_keywords, contaminant_categories = extract_user_keywords(ctx)
        user_flow = detect_user_flow(ctx)

        # Apply Two-Pass filtering
        filtered_cases = two_pass_filter(applications, ctx)

        if not filtered_cases:
            return {
                "similar_cases": [],
                "message": "Low-signal fallback - no similar cases found",
                "search_profile": {
                    "subsector_keywords": list(subsector_keywords),
                    "sector_keywords": list(sector_keywords),
                    "contaminants": list(contaminant_categories),
                    "candidates_before": len(applications),
                    "candidates_after": 0,
                },
            }

        # Build optimized response with metadata
        user_regulation = ctx.deps.client_metadata.get("regulation", "")
        similar_cases = []

        for case in filtered_cases:
            # Generate relevance explanation (with subsector)
            why_relevant = generate_why_relevant(
                case, subsector_keywords, sector_keywords, contaminant_categories, user_flow
            )

            # Check regulatory compatibility
            case_regulation = case.get("local_regulations", "")
            regulatory_mismatch = detect_regulatory_mismatch(user_regulation, case_regulation)

            if regulatory_mismatch:
                regulatory_notes = f"requires_adjustments: {regulatory_mismatch}"
            else:
                regulatory_notes = "direct_application_possible"

            # DEBUG-METADATA: Case analysis details (uncomment for metadata debugging)
            # logger.debug(f"🔧 Case: {case.get('application_type', 'Unknown')}")
            # logger.debug(f"🔧 Why relevant: {why_relevant}")
            # logger.debug(f"🔧 Regulatory notes: {regulatory_notes}")

            similar_cases.append(
                {
                    "application_type": case.get("application_type"),
                    "flow_range": case.get("typical_flow_range"),
                    "contaminants": case.get("influent_characteristics"),
                    "treatment_train": case.get("recommended_treatment_train"),
                    "why_relevant": why_relevant,
                    "regulatory_notes": regulatory_notes,
                }
            )

        result = {
            "similar_cases": similar_cases,
            "user_sector": " ".join(sector_keywords) if sector_keywords else "unknown",
            "user_subsector": " ".join(subsector_keywords) if subsector_keywords else "unknown",
            "total_found": len(similar_cases),
            "search_profile": {
                "subsector_keywords": list(subsector_keywords),
                "sector_keywords": list(sector_keywords),
                "contaminants": list(contaminant_categories),
                "user_flow": user_flow,
                "candidates_before": len(applications),
                "candidates_after": len(filtered_cases),
            },
            "message": f"Found {len(similar_cases)} highly relevant cases using enhanced Two-Pass filtering",
        }

        # Production logging (always active) - summary of filtering results
        logger.info(
            f"✅ Enhanced Two-Pass filtering complete: {len(applications)} → {len(similar_cases)} relevant cases "
            f"(subsector: {' '.join(subsector_keywords) if subsector_keywords else 'none'}, "
            f"sector: {' '.join(sector_keywords) if sector_keywords else 'none'}, "
            f"contaminants: {len(contaminant_categories)}, flow: {user_flow or 'none'})"
        )

        # Detailed logging of proven cases for deviation tracking
        if similar_cases:
            logger.info("📚 PROVEN CASES RECOMMENDED:")
            for idx, case in enumerate(similar_cases, 1):
                treatment_train = case.get("treatment_train", "N/A")
                app_type = case.get("application_type", "Unknown")
                logger.info(f"   {idx}. {app_type}: {treatment_train}")

        return result

    except Exception as e:
        logger.error(f"❌ Case filtering error: {e}")
        return {
            "similar_cases": [],
            "user_sector": "unknown",
            "user_subsector": "unknown",
            "total_found": 0,
            "search_profile": {"total_cases": 0},
            "message": "Case database temporarily unavailable. Proceeding with general engineering analysis.",
            "status": "fallback",
            "error": str(e)
        }
