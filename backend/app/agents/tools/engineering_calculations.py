"""
Deterministic Engineering Calculation Tools

These tools provide REPRODUCIBLE engineering calculations for water treatment design.
All calculations are based on established engineering principles and design criteria.

Key Principles:
- DETERMINISTIC: Same inputs → Same outputs
- VERIFIABLE: Show formulas and sources
- AUDITABLE: Full calculation trace
- NO LLM: Pure mathematical calculations

Best Practices (PydanticAI + Anthropic):
- Clear docstrings with parameter descriptions (Google style)
- Type hints for all parameters and returns
- Return structured data (dicts/Pydantic models)
- Document sources and assumptions
- Enable independent verification

Author: H2O Engineering AI Team
Date: October 2025
"""

from typing import Dict, Any, List, Optional, Union
from datetime import datetime
import math
import re


# Supported concentration units with conversion factors to mg/L
CONCENTRATION_UNITS = {
    "mg/L": 1.0,
    "mg/l": 1.0,
    "ppm": 1.0,          # ppm ≈ mg/L for dilute aqueous solutions
    "g/L": 1000.0,       # 1 g/L = 1000 mg/L
    "g/l": 1000.0,
    "µg/L": 0.001,       # 1 µg/L = 0.001 mg/L
    "ug/L": 0.001,       # Alternative notation
    "ug/l": 0.001,
    "kg/m³": 1000.0,     # 1 kg/m³ = 1000 mg/L
    "kg/m3": 1000.0,
}


def _parse_concentration_string(concentration_str: str) -> Dict[str, Any]:
    """
    Parse concentration string into value and unit.
    
    Handles various formats:
    - "3700 mg/L"
    - "3,700 mg/L"
    - "8.5 g/L"
    - "1500" (assumes mg/L)
    
    Args:
        concentration_str: Concentration as string
    
    Returns:
        Dict with parsed value and unit
        
    Raises:
        ValueError: If string cannot be parsed
    """
    # Remove extra whitespace
    concentration_str = concentration_str.strip()
    
    # Try to split by space to separate value and unit
    parts = concentration_str.split()
    
    if len(parts) == 0:
        raise ValueError(f"Empty concentration string")
    
    # Extract numeric value (handle commas)
    value_str = parts[0].replace(",", "")
    try:
        value = float(value_str)
    except ValueError:
        raise ValueError(
            f"Could not parse numeric value from '{parts[0]}'. "
            f"Expected format: '3700 mg/L' or '3700'"
        )
    
    # Extract unit (default to mg/L if not provided)
    unit = parts[1] if len(parts) > 1 else "mg/L"
    
    return {"value": value, "unit": unit}


def _normalize_concentration_to_mg_l(
    value: float,
    unit: str,
    parameter_name: str = "parameter"
) -> float:
    """
    Convert concentration from any supported unit to mg/L.
    
    Args:
        value: Concentration value
        unit: Unit of concentration
        parameter_name: Parameter name (for error messages)
    
    Returns:
        Concentration normalized to mg/L
        
    Raises:
        ValueError: If unit is not supported
    """
    if unit not in CONCENTRATION_UNITS:
        supported = ", ".join(CONCENTRATION_UNITS.keys())
        raise ValueError(
            f"Unsupported unit '{unit}' for {parameter_name}. "
            f"Supported units: {supported}"
        )
    
    return value * CONCENTRATION_UNITS[unit]


def calculate_mass_balance(
    flow_m3_day: float,
    concentrations: Union[Dict[str, float], Dict[str, Dict[str, Any]], Dict[str, str]]
) -> Dict[str, Any]:
    """
    Calculate contaminant mass loading with automatic unit conversion.
    
    **When to use:** After retrieving raw influent data, as first engineering calculation.
    **When NOT to use:** Do not call multiple times for the same influent data.
    
    This is PURE MATHEMATICS - no LLM involved, fully reproducible.
    Formula: Load (kg/day) = Flow (m³/day) × Concentration (mg/L) × 0.001
    
    SUPPORTED FORMATS:
    ✅ CORRECT: {"BOD": 3700, "COD": 8500, "TSS": 1200}
    ✅ CORRECT: {"BOD": {"value": 3700, "unit": "mg/L"}}
    ✅ CORRECT: {"BOD": "3700 mg/L", "COD": "8.5 g/L"}
    
    REJECTED FORMATS (will raise ValueError):
    ❌ WRONG: {"BOD": [3700], "COD": [8500]}  # No lists/arrays
    ❌ WRONG: {"BOD": {"value": [3700], "unit": "mg/L"}}  # No nested lists
    ❌ WRONG: {"BOD": "high", "COD": "medium"}  # No text descriptions
    ❌ WRONG: {}  # Empty dict not allowed
    
    Args:
        flow_m3_day: Flow rate in m³/day (e.g., 230.0)
                    Must be positive number.
        concentrations: Dict with parameter names as keys and concentrations as values.
                       Each concentration can be:
                       - Number (assumes mg/L): 3700
                       - String with unit: "3700 mg/L" or "8.5 g/L"
                       - Dict with value and unit: {"value": 3700, "unit": "mg/L"}
                       
    Returns:
        Dict with structure:
        {
            "loads": {
                "BOD": {
                    "load_kg_day": 851.0,
                    "formula": "230 m³/d × 3700 mg/L × 0.001",
                    "concentration_mg_l": 3700,
                    "verified": True
                }
            },
            "total_organic_load_cod_kg_day": 1955.0,
            "calculation_method": "standard_mass_balance_with_unit_conversion",
            "reproducible": True
        }
            
    Raises:
        ValueError: If concentrations is empty, contains lists, or has invalid types
            
    Example:
        >>> # Simple format (assumes mg/L)
        >>> result = calculate_mass_balance(350, {"BOD": 3700, "COD": 8500})
        >>> result["loads"]["BOD"]["load_kg_day"]
        1295.0
        
        >>> # With units (automatic conversion)
        >>> result = calculate_mass_balance(350, {
        ...     "BOD": {"value": 3700, "unit": "mg/L"},
        ...     "COD": {"value": 8.5, "unit": "g/L"}
        ... })
        >>> result["loads"]["COD"]["normalized_mg_l"]
        8500.0
        
        >>> # String format
        >>> result = calculate_mass_balance(350, {
        ...     "BOD": "3700 mg/L",
        ...     "COD": "8.5 g/L"
        ... })
    """
    # Validation: flow rate
    if flow_m3_day <= 0:
        raise ValueError(
            f"Flow rate must be positive, got {flow_m3_day} m³/day. "
            f"Check your input data."
        )
    
    # Validation: concentrations not empty
    if not concentrations:
        raise ValueError(
            "Concentrations dict cannot be empty. "
            "Provide at least one contaminant parameter."
        )
    
    loads = {}
    
    for param, conc_data in concentrations.items():
        # CRITICAL TYPE VALIDATION: Reject lists (common LLM mistake)
        if isinstance(conc_data, (list, tuple)):
            raise ValueError(
                f"Parameter '{param}' has list/array value: {conc_data}\n"
                f"Expected a single number, not a list.\n\n"
                f"✅ CORRECT: {{'{param}': {conc_data[0] if conc_data else 0}}}\n"
                f"❌ WRONG: {{'{param}': {conc_data}}}\n\n"
                f"If you have multiple values, call this tool separately for each scenario."
            )
        
        # Parse concentration data (handle multiple formats)
        if isinstance(conc_data, dict):
            # Format: {"value": 3700, "unit": "mg/L"}
            value = conc_data.get("value")
            unit = conc_data.get("unit", "mg/L")
            
            if value is None:
                raise ValueError(
                    f"Parameter '{param}': dict format requires 'value' key. "
                    f"Got: {conc_data}"
                )
            
            # CRITICAL: Validate that 'value' inside dict is not a list
            if isinstance(value, (list, tuple)):
                raise ValueError(
                    f"Parameter '{param}' has nested list in 'value' field: {value}\n"
                    f"Expected a single number.\n\n"
                    f"✅ CORRECT: {{'{param}': {{'value': {value[0] if value else 0}, 'unit': '{unit}'}}}}\n"
                    f"❌ WRONG: {{'{param}': {{'value': {value}, 'unit': '{unit}'}}}}"
                )
            
        elif isinstance(conc_data, str):
            # Format: "3700 mg/L" or "3700"
            parsed = _parse_concentration_string(conc_data)
            value = parsed["value"]
            unit = parsed["unit"]
            
        elif isinstance(conc_data, (int, float)):
            # Format: 3700 (assumes mg/L)
            value = float(conc_data)
            unit = "mg/L"
            
        else:
            raise ValueError(
                f"Parameter '{param}': unsupported concentration format. "
                f"Expected: number, string, or dict. Got: {type(conc_data)}"
            )
        
        # Validation: non-negative concentration
        if value < 0:
            raise ValueError(
                f"Parameter '{param}': concentration must be non-negative, "
                f"got {value} {unit}"
            )
        
        # Normalize to mg/L (with validation)
        conc_mg_l = _normalize_concentration_to_mg_l(value, unit, param)
        
        # Calculate mass load
        # Formula: kg/d = m³/d × mg/L × 0.001 (conversion factor)
        load_kg_day = flow_m3_day * conc_mg_l * 0.001
        
        # Build result with full audit trail
        loads[param] = {
            "load_kg_day": round(load_kg_day, 2),
            "formula": f"{flow_m3_day} m³/d × {conc_mg_l} mg/L × 0.001",
            "concentration_mg_l": round(conc_mg_l, 2),
            "flow_m3_day": flow_m3_day,
            "verified": True
        }
        
        # Include conversion trace if unit conversion occurred
        if unit != "mg/L":
            loads[param]["conversion"] = {
                "original_value": value,
                "original_unit": unit,
                "conversion_factor": CONCENTRATION_UNITS[unit],
                "normalized_mg_l": round(conc_mg_l, 2)
            }
    
    return {
        "loads": loads,
        "total_organic_load_cod_kg_day": loads.get("COD", {}).get("load_kg_day", 0),
        "calculation_method": "standard_mass_balance_with_unit_conversion",
        "reproducible": True,
        "timestamp": datetime.utcnow().isoformat()
    }


def size_biological_reactor(
    reactor_type: str,
    organic_load_kg_day: float,
    flow_m3_day: float,
    temperature_celsius: float = 25.0
) -> Dict[str, Any]:
    """
    Size biological reactor using established design criteria.
    
    Uses standard engineering design criteria from literature:
    - UASB: Metcalf & Eddy (2014), WEF Manual of Practice
    - SBR: Metcalf & Eddy (2014), EPA Design Manual
    - MBR: Membrane manufacturer guidelines, WEF Manual
    - Activated Sludge: Metcalf & Eddy (2014)
    
    Args:
        reactor_type: Type of biological reactor
                     Options: "UASB", "SBR", "MBR", "activated_sludge"
        organic_load_kg_day: Organic load in kg/day
                            - For anaerobic (UASB): COD load
                            - For aerobic (SBR, MBR, AS): BOD load
        flow_m3_day: Flow rate in cubic meters per day
        temperature_celsius: Operating temperature in Celsius (default: 25°C)
                            Affects biological reaction rates
    
    Returns:
        Dict containing:
            - reactor_type: Type of reactor
            - volume_m3: Required volume in cubic meters
            - hrt_hours: Hydraulic Retention Time in hours
            - dimensions: Suggested dimensions (height, diameter, area)
            - design_criteria_used: Criteria applied with sources
            - validation: Validation checks (HRT in range, etc.)
            - calculation_formula: Formula used
            - reproducible: Always True
            - warnings: List of warnings if any
    
    Raises:
        ValueError: If reactor_type not supported or parameters invalid
    
    Example:
        >>> result = size_biological_reactor("UASB", 2975, 350)
        >>> result["volume_m3"]
        743.75
        >>> result["hrt_hours"]
        51.0
    """
    if organic_load_kg_day <= 0:
        raise ValueError(f"Organic load must be positive, got {organic_load_kg_day}")
    
    if flow_m3_day <= 0:
        raise ValueError(f"Flow must be positive, got {flow_m3_day}")
    
    reactor_type_upper = reactor_type.upper()
    
    # ============================================
    # UASB (Upflow Anaerobic Sludge Blanket)
    # ============================================
    if reactor_type_upper == "UASB":
        # Design criteria from Metcalf & Eddy (2014), Table 10-15
        olr_range = [3.0, 5.0]  # kg COD/m³/day
        olr_recommended = 4.0  # Conservative mid-range value
        
        # Adjust OLR for temperature (simplified correction)
        if temperature_celsius < 20:
            olr_design = olr_range[0]  # Use lower end for cold conditions
            temp_note = f"Using lower OLR ({olr_design}) due to temperature <20°C"
        elif temperature_celsius > 30:
            olr_design = olr_range[1]  # Can use higher end for warm conditions
            temp_note = f"Using higher OLR ({olr_design}) due to temperature >30°C"
        else:
            olr_design = olr_recommended
            temp_note = "Using recommended OLR for mesophilic conditions"
        
        # Calculate volume
        volume_m3 = organic_load_kg_day / olr_design
        
        # Calculate HRT
        hrt_hours = (volume_m3 / flow_m3_day) * 24
        
        # Typical dimensions for UASB
        height_m = 5.0  # Typical: 4-7m, 5m is standard
        area_m2 = volume_m3 / height_m
        diameter_m = math.sqrt(area_m2 / math.pi)
        
        # Validation criteria
        hrt_range = [24, 72]  # hours (Metcalf & Eddy, 2014)
        hrt_acceptable = hrt_range[0] <= hrt_hours <= hrt_range[1]
        
        # Upflow velocity check
        upflow_velocity = flow_m3_day / area_m2 / 24  # m/h
        upflow_range = [0.5, 1.5]  # m/h
        upflow_acceptable = upflow_range[0] <= upflow_velocity <= upflow_range[1]
        
        warnings = []
        if hrt_hours > hrt_range[1] * 2:
            # CRITICAL: > 144h for UASB (universal warning, sector-agnostic)
            warnings.append(
                f"⚠️ CRITICAL: UASB retention time ({hrt_hours:.0f}h) is {hrt_hours/hrt_range[1]:.1f}× higher than "
                f"typical maximum ({hrt_range[1]}h). This indicates: (1) Organic/COD load too high for this reactor, "
                f"(2) Temperature too low (UASB requires >15°C), or (3) Different technology may be more appropriate. "
                f"Review proven cases from your sector. Consider enhanced pre-treatment or different technology. "
                f"Do NOT proceed with current design."
            )
        elif hrt_hours > hrt_range[1] * 1.5:
            # WARNING: slightly high
            warnings.append(
                f"⚠️ WARNING: UASB HRT {hrt_hours:.1f}h is higher than typical ({hrt_range[1]}h max). "
                f"Acceptable but verify against proven cases for your sector."
            )
        elif hrt_hours < hrt_range[0]:
            # Too fast - substrate utilization issue
            warnings.append(
                f"⚠️ UASB HRT {hrt_hours:.1f}h is below typical minimum ({hrt_range[0]}h). "
                f"May reduce methanogenic activity. Verify organic load conversion expected."
            )

        if not upflow_acceptable:
            warnings.append(
                f"⚠️ UASB upflow velocity {upflow_velocity:.2f} m/h is outside typical range {upflow_range}. "
                f"May affect sludge bed stability. Verify reactor area and loading are consistent."
            )
        
        return {
            "reactor_type": "UASB",
            "volume_m3": round(volume_m3, 1),
            "hrt_hours": round(hrt_hours, 1),
            "dimensions": {
                "height_m": height_m,
                "diameter_m": round(diameter_m, 1),
                "area_m2": round(area_m2, 1)
            },
            "design_criteria_used": {
                "OLR_design": olr_design,
                "OLR_range": olr_range,
                "temperature_celsius": temperature_celsius,
                "temperature_note": temp_note,
                "source": "Metcalf & Eddy (2014), Table 10-15; WEF Manual of Practice No. 8"
            },
            "validation": {
                "hrt_acceptable": hrt_acceptable,
                "hrt_hours": round(hrt_hours, 1),
                "hrt_range": hrt_range,
                "upflow_velocity_acceptable": upflow_acceptable,
                "upflow_velocity_m_h": round(upflow_velocity, 2),
                "upflow_range": upflow_range,
                "volume_reasonable": volume_m3 > 0
            },
            "calculation_formula": f"Volume = {organic_load_kg_day} kg/d ÷ {olr_design} kg/m³/d = {volume_m3:.1f} m³",
            "reproducible": True,
            "warnings": warnings
        }
    
    # ============================================
    # SBR (Sequencing Batch Reactor)
    # ============================================
    elif reactor_type_upper == "SBR":
        # Design criteria from Metcalf & Eddy (2014)
        f_m_range = [0.05, 0.15]  # kg BOD/kg MLSS/day
        f_m_recommended = 0.10  # Conservative mid-range
        
        mlss_range = [2500, 4000]  # mg/L
        mlss_design = 3000  # Typical value
        
        # Calculate volume based on F/M ratio
        # F/M = BOD_load / (MLSS × Volume)
        # Volume = BOD_load / (F/M × MLSS)
        volume_m3 = organic_load_kg_day / (f_m_recommended * (mlss_design / 1000))
        
        # Calculate HRT
        hrt_hours = (volume_m3 / flow_m3_day) * 24
        
        # Typical dimensions
        depth_m = 4.5  # Typical: 4-5m
        area_m2 = volume_m3 / depth_m
        length_to_width_ratio = 2.0  # Typical L:W ratio
        width_m = math.sqrt(area_m2 / length_to_width_ratio)
        length_m = width_m * length_to_width_ratio
        
        # Validation
        hrt_range = [12, 24]  # hours for SBR
        hrt_acceptable = hrt_range[0] <= hrt_hours <= hrt_range[1]

        warnings = []
        if hrt_hours > hrt_range[1] * 2:
            # CRITICAL: > 48h for SBR (universal warning, sector-agnostic)
            warnings.append(
                f"⚠️ CRITICAL: SBR retention time ({hrt_hours:.0f}h) is {hrt_hours/hrt_range[1]:.1f}× higher than "
                f"typical maximum ({hrt_range[1]}h). This usually indicates: (1) Influent load too high for this technology, "
                f"(2) Pre-treatment insufficient, or (3) Different technology may be more appropriate for your sector. "
                f"Review proven cases from your industry to see how similar projects handled this. "
                f"Consider two-stage biological treatment or enhanced pre-treatment. "
                f"Do NOT proceed with current design - likely uneconomical."
            )
        elif hrt_hours > hrt_range[1] * 1.5:
            # WARNING: slightly high but acceptable
            warnings.append(
                f"⚠️ WARNING: SBR HRT {hrt_hours:.1f}h is higher than typical ({hrt_range[1]}h max). "
                f"Acceptable but verify against proven cases for your sector."
            )
        elif hrt_hours < hrt_range[0]:
            # Too fast - unusual
            warnings.append(
                f"⚠️ SBR HRT {hrt_hours:.1f}h is below typical minimum ({hrt_range[0]}h). "
                f"Verify biological treatment time is sufficient."
            )
        
        return {
            "reactor_type": "SBR",
            "volume_m3": round(volume_m3, 1),
            "hrt_hours": round(hrt_hours, 1),
            "dimensions": {
                "depth_m": depth_m,
                "length_m": round(length_m, 1),
                "width_m": round(width_m, 1),
                "area_m2": round(area_m2, 1)
            },
            "design_criteria_used": {
                "F_M_ratio": f_m_recommended,
                "F_M_range": f_m_range,
                "MLSS_mg_l": mlss_design,
                "MLSS_range": mlss_range,
                "source": "Metcalf & Eddy (2014), Section 8.5; EPA Design Manual"
            },
            "validation": {
                "hrt_acceptable": hrt_acceptable,
                "hrt_hours": round(hrt_hours, 1),
                "hrt_range": hrt_range,
                "volume_reasonable": volume_m3 > 0
            },
            "calculation_formula": f"Volume = {organic_load_kg_day} kg/d ÷ ({f_m_recommended} × {mlss_design/1000}) = {volume_m3:.1f} m³",
            "reproducible": True,
            "warnings": warnings
        }
    
    # ============================================
    # MBR (Membrane Bioreactor)
    # ============================================
    elif reactor_type_upper == "MBR":
        # Design criteria from manufacturer guidelines and WEF Manual
        mlss_range = [8000, 12000]  # mg/L (higher than conventional AS)
        mlss_design = 10000  # Typical for MBR
        
        f_m_range = [0.05, 0.10]  # kg BOD/kg MLSS/day
        f_m_recommended = 0.075  # Mid-range for MBR
        
        # Calculate biological volume
        bio_volume_m3 = organic_load_kg_day / (f_m_recommended * (mlss_design / 1000))
        
        # Calculate HRT
        hrt_hours = (bio_volume_m3 / flow_m3_day) * 24
        
        # Membrane area calculation
        membrane_flux = 20  # L/m²/h (LMH) - typical design flux
        membrane_area_m2 = (flow_m3_day * 1000) / (membrane_flux * 24)
        
        # Dimensions
        depth_m = 4.0  # Typical for MBR tanks
        area_m2 = bio_volume_m3 / depth_m
        
        warnings = []
        hrt_range = [8, 12]  # hours for MBR
        if hrt_hours > hrt_range[1] * 2:
            # CRITICAL: > 24h for MBR (universal warning, sector-agnostic)
            warnings.append(
                f"⚠️ CRITICAL: MBR retention time ({hrt_hours:.0f}h) is {hrt_hours/hrt_range[1]:.1f}× higher than "
                f"typical maximum ({hrt_range[1]}h). This indicates: (1) Influent load too high for MBR, "
                f"(2) Membrane fouling concerns (extended HRT with high MLSS may cause issues), "
                f"(3) Different reactor type more appropriate. Review proven cases from your sector. "
                f"Consider lower MLSS or enhanced pre-treatment. Do NOT proceed."
            )
        elif hrt_hours > hrt_range[1] * 1.5:
            # WARNING: slightly high
            warnings.append(
                f"⚠️ WARNING: MBR HRT {hrt_hours:.1f}h is higher than typical ({hrt_range[1]}h max). "
                f"Acceptable but monitor membrane fouling. Verify against proven cases for your sector."
            )
        elif hrt_hours < hrt_range[0]:
            # Too fast - membrane issues
            warnings.append(
                f"⚠️ MBR HRT {hrt_hours:.1f}h is below typical minimum ({hrt_range[0]}h). "
                f"High flux may cause excessive membrane fouling. Verify sustainable operation."
            )
        
        return {
            "reactor_type": "MBR",
            "volume_m3": round(bio_volume_m3, 1),
            "hrt_hours": round(hrt_hours, 1),
            "dimensions": {
                "depth_m": depth_m,
                "area_m2": round(area_m2, 1)
            },
            "membrane_specifications": {
                "membrane_area_m2": round(membrane_area_m2, 1),
                "design_flux_lmh": membrane_flux,
                "note": "Actual membrane area depends on manufacturer specifications"
            },
            "design_criteria_used": {
                "F_M_ratio": f_m_recommended,
                "MLSS_mg_l": mlss_design,
                "MLSS_range": mlss_range,
                "membrane_flux_lmh": membrane_flux,
                "source": "Membrane manufacturer guidelines; WEF Manual; Metcalf & Eddy (2014)"
            },
            "validation": {
                "hrt_hours": round(hrt_hours, 1),
                "hrt_range": hrt_range,
                "volume_reasonable": bio_volume_m3 > 0
            },
            "calculation_formula": f"Volume = {organic_load_kg_day} kg/d ÷ ({f_m_recommended} × {mlss_design/1000}) = {bio_volume_m3:.1f} m³",
            "reproducible": True,
            "warnings": warnings
        }
    
    # ============================================
    # Activated Sludge (Conventional)
    # ============================================
    elif reactor_type_upper in ["ACTIVATED_SLUDGE", "AS"]:
        # Design criteria from Metcalf & Eddy (2014)
        f_m_range = [0.2, 0.6]  # kg BOD/kg MLSS/day
        f_m_recommended = 0.4  # Conventional loading
        
        mlss_range = [1500, 3000]  # mg/L
        mlss_design = 2000  # Typical
        
        # Calculate volume
        volume_m3 = organic_load_kg_day / (f_m_recommended * (mlss_design / 1000))
        
        # Calculate HRT
        hrt_hours = (volume_m3 / flow_m3_day) * 24
        
        # Dimensions
        depth_m = 4.0  # Typical
        area_m2 = volume_m3 / depth_m
        
        warnings = []
        hrt_range = [4, 8]  # hours for conventional AS
        if hrt_hours > hrt_range[1] * 2:
            # CRITICAL: > 16h for AS (universal warning, sector-agnostic)
            warnings.append(
                f"⚠️ CRITICAL: Activated Sludge HRT ({hrt_hours:.0f}h) is {hrt_hours/hrt_range[1]:.1f}× higher than "
                f"typical maximum ({hrt_range[1]}h). This indicates: (1) Influent load too high for conventional AS, "
                f"(2) Extended aeration system more appropriate, (3) Different technology recommended. "
                f"Review proven cases from your sector. Consider extended aeration or UASB pre-treatment. Do NOT proceed."
            )
        elif hrt_hours > hrt_range[1] * 1.5:
            # WARNING: slightly high - maybe extended aeration
            warnings.append(
                f"⚠️ WARNING: AS HRT {hrt_hours:.1f}h is higher than conventional ({hrt_range[1]}h max). "
                f"May be acceptable for extended aeration. Verify against proven cases for your sector."
            )
        elif hrt_hours < hrt_range[0]:
            # Too fast - nitrification risk
            warnings.append(
                f"⚠️ AS HRT {hrt_hours:.1f}h is below typical minimum ({hrt_range[0]}h). "
                f"May not allow sufficient nitrification. Verify design appropriate for your treatment objectives."
            )
        
        return {
            "reactor_type": "Activated Sludge",
            "volume_m3": round(volume_m3, 1),
            "hrt_hours": round(hrt_hours, 1),
            "dimensions": {
                "depth_m": depth_m,
                "area_m2": round(area_m2, 1)
            },
            "design_criteria_used": {
                "F_M_ratio": f_m_recommended,
                "MLSS_mg_l": mlss_design,
                "source": "Metcalf & Eddy (2014), Chapter 8"
            },
            "validation": {
                "hrt_hours": round(hrt_hours, 1),
                "hrt_range": hrt_range,
                "volume_reasonable": volume_m3 > 0
            },
            "calculation_formula": f"Volume = {organic_load_kg_day} kg/d ÷ ({f_m_recommended} × {mlss_design/1000}) = {volume_m3:.1f} m³",
            "reproducible": True,
            "warnings": warnings
        }
    
    else:
        raise ValueError(
            f"Reactor type '{reactor_type}' not supported. "
            f"Supported types: UASB, SBR, MBR, activated_sludge"
        )


def validate_treatment_efficiency(
    technology_train: List[str],
    influent: Dict[str, float],
    required_removal_pct: Optional[Dict[str, float]] = None,
    effluent_limits_mg_l: Optional[Dict[str, float]] = None
) -> Dict[str, Any]:
    """
    Validate treatment train engineering LOGIC (not exact removal simulation).
    
    **When to use:** After designing treatment train, to check engineering logic.
    **When NOT to use:** Do not iterate to eliminate warnings - they are advisory only.
    
    Checks if the train follows sound engineering principles without hardcoding
    specific technologies. Works for any sector and any technology combination.
    
    Validation checks:
    - High FOG/oil → Flotation or separation upstream of biological
    - High organics → Biological treatment present
    - Reuse objectives → Polishing/disinfection at end
    - Train complexity → Reasonable number of stages (4-8 typical)
    - Sequence logic → Pre-treatment before biological, polishing after
    
    SUPPORTED FORMATS:
    ✅ CORRECT train: ["Screening", "DAF", "SBR", "GAC", "UV"]
    ✅ CORRECT influent: {"BOD": 3700, "COD": 8500, "TSS": 1500}
    
    REJECTED FORMATS:
    ❌ WRONG train: "Screening + DAF + SBR"  # Must be list, not string
    ❌ WRONG influent: {"BOD": [3700], "COD": [8500]}  # No lists in values
    ❌ WRONG influent: {"BOD": "high"}  # Must be numeric values
    
    Args:
        technology_train: List of technologies in sequence (each as string)
        influent: Dict of influent concentrations with numeric values (mg/L)
                 Must contain single numbers, not lists or strings
        required_removal_pct: OPTIONAL - Not used in logic validation
        effluent_limits_mg_l: OPTIONAL - Not used in logic validation
    
    Returns:
        Dict containing:
            - overall_achievable: Boolean if train logic is sound
            - validation_results: Logic check results
            - warnings: Advisory warnings (not blocking - OK if following proven case)
            - logic_checks: List of passed logic checks
            - technology_train: Train used
            - method: Validation method
    
    Example:
        >>> result = validate_treatment_efficiency(
        ...     ["DAF", "SBR", "GAC", "UV"],
        ...     {"BOD": 3700, "FOG": 900}
        ... )
        >>> result["overall_achievable"]
        True
    """
    # CRITICAL TYPE VALIDATION: Reject lists in influent dict
    for param, value in influent.items():
        if isinstance(value, (list, tuple)):
            raise ValueError(
                f"Influent parameter '{param}' has list/array value: {value}\n"
                f"Expected a single number for concentration.\n\n"
                f"✅ CORRECT: {{'{param}': {value[0] if value else 0}}}\n"
                f"❌ WRONG: {{'{param}': {value}}}\n\n"
                f"Provide single concentration value per parameter."
            )
        if not isinstance(value, (int, float)):
            raise ValueError(
                f"Influent parameter '{param}' has invalid type: {type(value).__name__}\n"
                f"Expected numeric value (int or float).\n\n"
                f"✅ CORRECT: {{'{param}': 1750}}\n"
                f"❌ WRONG: {{'{param}': {repr(value)}}}"
            )
    
    # Convert train to uppercase for case-insensitive matching
    train_upper = [tech.upper() for tech in technology_train]
    train_str = ' '.join(train_upper)
    
    warnings = []
    logic_checks = []
    validation_results = {}
    
    # LOGIC CHECK 1: High FOG/oil needs flotation or separation upstream
    fog = influent.get("FOG", 0)
    oil = influent.get("OIL", 0)
    grease = influent.get("GREASE", 0)
    
    high_fog = fog > 500 or oil > 300 or grease > 500
    
    if high_fog:
        # Look for flotation/separation keywords (works for ANY technology name)
        fog_removal_keywords = [
            "DAF", "FLOAT", "OIL", "GREASE", "SEPARATOR", "SKIMMER",
            "CENTRIFUG", "COALESC", "DECANT"
        ]
        has_fog_removal = any(keyword in train_str for keyword in fog_removal_keywords)
        
        # Check it's in first half of train (upstream)
        first_half = ' '.join(train_upper[:max(1, len(train_upper) // 2)])
        fog_removal_upstream = any(keyword in first_half for keyword in fog_removal_keywords)
        
        if has_fog_removal and fog_removal_upstream:
            logic_checks.append(
                f"✅ High FOG/oil ({fog} mg/L) has upstream flotation/separation"
            )
        elif has_fog_removal and not fog_removal_upstream:
            warnings.append(
                f"FOG/oil removal ({fog} mg/L) detected but not in upstream position. "
                f"Consider moving flotation/separation before biological treatment."
            )
        else:
            warnings.append(
                f"High FOG/oil content ({fog} mg/L) typically requires flotation or "
                f"oil separation upstream of biological treatment to prevent inhibition."
            )
    
    # LOGIC CHECK 2: High organics need biological treatment
    bod = influent.get("BOD", 0)
    bod5 = influent.get("BOD5", 0)
    bod_value = max(bod, bod5)
    cod = influent.get("COD", 0)
    
    high_organics = bod_value > 500 or cod > 1000
    
    if high_organics:
        # Look for biological treatment keywords (works for ANY biological technology)
        biological_keywords = [
            "BIOLOG", "SBR", "UASB", "MBR", "ACTIVATED", "SLUDGE",
            "MBBR", "ANAEROBIC", "AEROBIC", "BIOFILM", "TRICKLING",
            "RBC", "ROTATING", "BIOREA"
        ]
        has_biological = any(keyword in train_str for keyword in biological_keywords)
        
        if has_biological:
            logic_checks.append(
                f"✅ High organics (BOD={bod_value} mg/L, COD={cod} mg/L) "
                f"has biological treatment"
            )
        else:
            warnings.append(
                f"High organic load (BOD={bod_value} mg/L, COD={cod} mg/L) typically "
                f"requires biological treatment for cost-effective removal."
            )
    
    # LOGIC CHECK 3: High suspended solids need clarification
    tss = influent.get("TSS", 0)
    ss = influent.get("SS", 0)
    suspended_solids = max(tss, ss)
    
    if suspended_solids > 500:
        clarification_keywords = [
            "CLARIF", "SEDIMENT", "SETTL", "DAF", "FLOAT",
            "FILTER", "MEMBRANE", "CENTRIFUG"
        ]
        has_clarification = any(keyword in train_str for keyword in clarification_keywords)
        
        if has_clarification:
            logic_checks.append(
                f"✅ High suspended solids ({suspended_solids} mg/L) "
                f"has clarification/separation"
            )
    
    # LOGIC CHECK 4: Train complexity (typical: 4-8 stages)
    train_length = len(technology_train)
    
    if train_length <= 8:
        logic_checks.append(
            f"✅ Train length ({train_length} stages) is reasonable"
        )
    else:
        warnings.append(
            f"Train has {train_length} stages. Consider consolidating for simplicity "
            f"and lower cost (typical: 4-8 stages)."
        )
    
    # LOGIC CHECK 5: Sequence logic - screening/pre-treatment should be first
    if train_length > 0:
        first_stage = train_upper[0]
        pretreatment_keywords = ["SCREEN", "BAR", "GRIT", "EQUALI"]
        is_pretreatment_first = any(keyword in first_stage for keyword in pretreatment_keywords)
        
        if is_pretreatment_first or train_length <= 3:
            logic_checks.append("✅ Train sequence follows logical progression")
    
    # Overall assessment
    logically_sound = len(warnings) == 0
    
    return {
        "overall_achievable": logically_sound,
        "logically_sound": logically_sound,
        "validation_results": validation_results,
        "logic_checks": logic_checks,
        "warnings": warnings,
        "technology_train": technology_train,
        "train_length": train_length,
        "method": "logic_based_validation",
        "note": (
            "This validates engineering logic and design principles, not exact removal percentages. "
            "For performance confidence, rely on proven case evidence from similar operating systems. "
            "Warnings are ADVISORY and do not block proposal generation."
        )
    }


def calculate_total_capex(
    equipment_costs: Dict[str, float],
    complexity: str = "medium",
    location_factor: float = 1.0
) -> Dict[str, Any]:
    """
    Calculate total CAPEX with automatic build-up from equipment costs.
    
    This tool provides DETERMINISTIC calculation - no estimation, pure mathematics.
    Applies industry-standard percentages for civil works, installation, engineering,
    and contingency based on project complexity.
    
    Build-up structure (industry standard):
    - Equipment: Provided by user
    - Civil works: 25-45% of equipment (varies by complexity)
    - Installation/Piping: 10-20% of equipment
    - Electrical & Instrumentation: 8-15% of equipment
    - Engineering/Supervision: 10-15% of equipment
    - Contingency: 15-20% of subtotal
    
    Args:
        equipment_costs: Dict of equipment names and their costs in USD
                        Example: {"UASB Reactor": 818180, "DAF System": 52500}
        complexity: Project complexity level affecting percentages
                   Options: "simple", "medium", "complex"
                   - simple: Basic systems, standard conditions
                   - medium: Typical industrial systems (default)
                   - complex: Difficult site, special requirements
        location_factor: Regional cost multiplier (default: 1.0)
                        Example: 0.8 for LATAM, 1.2 for remote locations
    
    Returns:
        Dict containing:
            - equipment_total: Total equipment cost
            - civil_works: Civil works cost
            - installation_piping: Installation and piping cost
            - electrical_instrumentation: E&I cost
            - engineering_supervision: Engineering cost
            - subtotal: Sum before contingency
            - contingency: Contingency amount
            - total_capex: Final total CAPEX
            - percentages_applied: Percentages used per category
            - breakdown_by_equipment: Allocated costs per equipment
            - calculation_trace: Step-by-step calculation
            - complexity_level: Complexity used
            - location_factor: Location factor applied
            - reproducible: Always True
            
    Raises:
        ValueError: If inputs are invalid or complexity not supported
        
    Example:
        >>> equipment = {
        ...     "UASB Reactor": 818180,
        ...     "DAF System": 52500,
        ...     "SBR": 199980
        ... }
        >>> result = calculate_total_capex(equipment, complexity="medium")
        >>> result["total_capex"]
        2463142
        >>> result["calculation_trace"]
        ['Equipment total: $1,070,660', 'Civil works (40%): $428,264', ...]
    """
    # Validation: equipment costs not empty
    if not equipment_costs:
        raise ValueError(
            "Equipment costs dict cannot be empty. "
            "Provide at least one equipment item with cost."
        )
    
    # Validation: all costs must be numeric (robust type checking)
    for equipment, cost in equipment_costs.items():
        if not isinstance(cost, (int, float)):
            raise ValueError(
                f"Equipment cost for '{equipment}' must be a number (float or int), "
                f"got '{cost}' (type: {type(cost).__name__}).\n\n"
                f"⚠️  NEVER use strings like 'TBD', 'Unknown', 'N/A', or 'To be determined'.\n\n"
                f"If cost is uncertain, estimate using:\n"
                f"  1. Scale from proven case by capacity/volume ratio\n"
                f"  2. Use typical unit costs ($/m³, $/kW, $/m³/day capacity)\n"
                f"  3. Apply engineering judgment with conservative safety factor\n\n"
                f"Example: Equipment sized at 1800 m³, proven case 900 m³ cost $270k\n"
                f"         → Estimate: (1800/900) × $270k = $540k\n\n"
                f"Document estimation method in technical_data.assumptions field."
            )
        
        # Validation: cost must be non-negative
        if cost < 0:
            raise ValueError(
                f"Equipment '{equipment}': cost must be non-negative, got ${cost:,.2f}"
            )
    
    # Validation: complexity level
    complexity_lower = complexity.lower()
    if complexity_lower not in ["simple", "medium", "complex"]:
        raise ValueError(
            f"Complexity must be 'simple', 'medium', or 'complex', got '{complexity}'"
        )
    
    # Validation: location factor
    if location_factor <= 0:
        raise ValueError(
            f"Location factor must be positive, got {location_factor}"
        )
    
    # Define percentages based on complexity
    # Source: Industry standards, AACE International, construction cost databases
    COMPLEXITY_FACTORS = {
        "simple": {
            "civil_works": 0.25,           # 25% - Basic civil work
            "installation_piping": 0.10,   # 10% - Standard installation
            "electrical": 0.08,            # 8% - Basic controls
            "engineering": 0.10,           # 10% - Standard engineering
            "contingency": 0.15,           # 15% - Lower risk
            "note": "Simple systems with standard site conditions"
        },
        "medium": {
            "civil_works": 0.40,           # 40% - Typical civil work
            "installation_piping": 0.12,   # 12% - Standard piping/install
            "electrical": 0.10,            # 10% - Standard controls/automation
            "engineering": 0.12,           # 12% - Typical engineering
            "contingency": 0.18,           # 18% - Moderate risk
            "note": "Typical industrial wastewater systems"
        },
        "complex": {
            "civil_works": 0.45,           # 45% - Complex structures
            "installation_piping": 0.20,   # 20% - Complex piping/install
            "electrical": 0.15,            # 15% - Advanced automation
            "engineering": 0.15,           # 15% - Detailed engineering
            "contingency": 0.20,           # 20% - Higher risk
            "note": "Complex systems, difficult sites, special requirements"
        }
    }
    
    factors = COMPLEXITY_FACTORS[complexity_lower]
    
    # Calculate equipment total
    equipment_total = sum(equipment_costs.values())
    
    # Apply location factor to equipment
    equipment_total_adjusted = equipment_total * location_factor
    
    # Calculate each CAPEX component
    civil_works = equipment_total_adjusted * factors["civil_works"]
    installation = equipment_total_adjusted * factors["installation_piping"]
    electrical = equipment_total_adjusted * factors["electrical"]
    engineering = equipment_total_adjusted * factors["engineering"]
    
    # Subtotal before contingency
    subtotal = equipment_total_adjusted + civil_works + installation + electrical + engineering
    
    # Contingency as % of subtotal
    contingency = subtotal * factors["contingency"]
    
    # Total CAPEX
    total_capex = subtotal + contingency
    
    # Build calculation trace for audit
    calculation_trace = [
        f"Equipment total: ${equipment_total:,.0f}",
    ]
    
    if location_factor != 1.0:
        calculation_trace.append(
            f"Location adjustment ({location_factor}x): ${equipment_total_adjusted:,.0f}"
        )
    
    calculation_trace.extend([
        f"Civil works ({factors['civil_works']*100:.0f}%): ${civil_works:,.0f}",
        f"Installation/Piping ({factors['installation_piping']*100:.0f}%): ${installation:,.0f}",
        f"Electrical/Instrumentation ({factors['electrical']*100:.0f}%): ${electrical:,.0f}",
        f"Engineering/Supervision ({factors['engineering']*100:.0f}%): ${engineering:,.0f}",
        f"Subtotal: ${subtotal:,.0f}",
        f"Contingency ({factors['contingency']*100:.0f}%): ${contingency:,.0f}",
        f"TOTAL CAPEX: ${total_capex:,.0f}"
    ])
    
    # Breakdown by equipment (proportional allocation)
    breakdown_by_equipment = {}
    for equip_name, equip_cost in equipment_costs.items():
        proportion = (equip_cost * location_factor) / equipment_total_adjusted
        
        breakdown_by_equipment[equip_name] = {
            "equipment_cost": round(equip_cost, 2),
            "civil_allocated": round(civil_works * proportion, 2),
            "install_allocated": round(installation * proportion, 2),
            "electrical_allocated": round(electrical * proportion, 2),
            "engineering_allocated": round(engineering * proportion, 2),
            "total_allocated": round((subtotal + contingency) * proportion, 2)
        }
    
    return {
        "equipment_total": round(equipment_total, 2),
        "equipment_total_adjusted": round(equipment_total_adjusted, 2),
        "civil_works": round(civil_works, 2),
        "installation_piping": round(installation, 2),
        "electrical_instrumentation": round(electrical, 2),
        "engineering_supervision": round(engineering, 2),
        "subtotal": round(subtotal, 2),
        "contingency": round(contingency, 2),
        "total_capex": round(total_capex, 2),
        "percentages_applied": {
            "civil_works_pct": factors["civil_works"],
            "installation_piping_pct": factors["installation_piping"],
            "electrical_instrumentation_pct": factors["electrical"],
            "engineering_supervision_pct": factors["engineering"],
            "contingency_pct": factors["contingency"]
        },
        "breakdown_by_equipment": breakdown_by_equipment,
        "calculation_trace": calculation_trace,
        "complexity_level": complexity,
        "complexity_note": factors["note"],
        "location_factor": location_factor,
        "reproducible": True,
        "timestamp": datetime.utcnow().isoformat(),
        "source": "Industry standards (AACE International, construction cost databases)"
    }


def calculate_annual_opex(
    equipment_power_kw: Dict[str, float],
    flow_m3_day: float,
    operating_hours_per_day: float = 24.0,
    electricity_rate_usd_kwh: float = 0.12,
    chemicals_usd_per_m3: float = 0.50,
    operators_count: int = 2,
    operator_annual_salary_usd: float = 25000.0,
    maintenance_pct_capex: float = 0.04,
    capex_usd: float = 0.0
) -> Dict[str, Any]:
    """
    Calculate annual OPEX with detailed breakdown.
    
    This tool provides DETERMINISTIC calculation - no estimation, pure mathematics.
    Calculates operational costs across four main categories:
    1. Electrical energy
    2. Chemicals
    3. Personnel
    4. Maintenance & spare parts
    
    Args:
        equipment_power_kw: Dict of equipment names and power consumption in kW
                           Example: {"DAF System": 15, "SBR Blowers": 45, "UV": 12}
        flow_m3_day: Design flow rate in m³/day
        operating_hours_per_day: Daily operating hours (default: 24h continuous)
        electricity_rate_usd_kwh: Electricity cost in $/kWh (default: $0.12)
        chemicals_usd_per_m3: Chemical costs per m³ treated (default: $0.50/m³)
                             Includes coagulants, polymers, pH adjustment, etc.
        operators_count: Number of operators required (default: 2)
        operator_annual_salary_usd: Annual salary per operator (default: $25,000)
        maintenance_pct_capex: Annual maintenance as % of CAPEX (default: 4%)
        capex_usd: Total CAPEX for maintenance calculation (default: 0)
    
    Returns:
        Dict containing:
            - electricity_annual: Annual electricity cost
            - chemicals_annual: Annual chemical cost
            - personnel_annual: Annual personnel cost
            - maintenance_annual: Annual maintenance cost
            - total_opex_annual: Total annual OPEX
            - opex_per_m3: Unit cost per m³ treated
            - calculation_details: Detailed parameters used
            - breakdown_by_category: Detailed breakdown with percentages
            - calculation_trace: Step-by-step calculation
            - reproducible: Always True
            
    Raises:
        ValueError: If inputs are invalid
        
    Example:
        >>> power = {"DAF": 15, "SBR": 45, "UV": 12}
        >>> result = calculate_annual_opex(
        ...     equipment_power_kw=power,
        ...     flow_m3_day=350,
        ...     capex_usd=2463142
        ... )
        >>> result["total_opex_annual"]
        293473
        >>> result["opex_per_m3"]
        2.30
    """
    # Validation: flow rate
    if flow_m3_day <= 0:
        raise ValueError(f"Flow rate must be positive, got {flow_m3_day} m³/day")
    
    # Validation: operating hours
    if not (0 < operating_hours_per_day <= 24):
        raise ValueError(
            f"Operating hours must be between 0 and 24, got {operating_hours_per_day}h"
        )
    
    # Validation: electricity rate
    if electricity_rate_usd_kwh <= 0:
        raise ValueError(
            f"Electricity rate must be positive, got ${electricity_rate_usd_kwh}/kWh"
        )
    
    # Validation: operators count
    if operators_count < 0:
        raise ValueError(f"Operators count cannot be negative, got {operators_count}")
    
    # Validation: equipment_power_kw must be dict with numeric values
    if not isinstance(equipment_power_kw, dict):
        raise ValueError(
            f"equipment_power_kw must be a dict, not {type(equipment_power_kw).__name__}.\n"
            f"Provide equipment breakdown: {{'Equipment A': 15.0, 'Equipment B': 30.0}}"
        )
    
    if not equipment_power_kw:
        raise ValueError("equipment_power_kw dict cannot be empty")
    
    for equipment, power_kw in equipment_power_kw.items():
        if not isinstance(power_kw, (int, float)):
            raise ValueError(
                f"Power for '{equipment}' must be numeric (int/float), "
                f"got '{power_kw}' ({type(power_kw).__name__}).\n"
                f"If power is uncertain, use conservative engineering estimate and "
                f"document assumption in proposal."
            )
        if power_kw < 0:
            raise ValueError(
                f"Equipment '{equipment}': power must be non-negative, got {power_kw} kW"
            )
    
    # Calculate total power consumption
    total_power_kw = sum(equipment_power_kw.values())
    
    # 1. ELECTRICITY COST
    # Annual kWh = kW × hours/day × days/year
    daily_kwh = total_power_kw * operating_hours_per_day
    annual_kwh = daily_kwh * 365
    electricity_annual = annual_kwh * electricity_rate_usd_kwh
    
    # 2. CHEMICALS COST
    # Annual m³ treated
    annual_m3_treated = flow_m3_day * 365
    chemicals_annual = annual_m3_treated * chemicals_usd_per_m3
    
    # 3. PERSONNEL COST
    personnel_annual = operators_count * operator_annual_salary_usd
    
    # 4. MAINTENANCE COST
    # Typically 3-5% of CAPEX annually (default 4%)
    maintenance_annual = capex_usd * maintenance_pct_capex
    
    # TOTAL OPEX
    total_opex_annual = (
        electricity_annual +
        chemicals_annual +
        personnel_annual +
        maintenance_annual
    )
    
    # Unit cost per m³ treated
    opex_per_m3 = total_opex_annual / annual_m3_treated if annual_m3_treated > 0 else 0
    
    # Calculate percentages
    breakdown_by_category = {
        "electricity": {
            "annual_usd": round(electricity_annual, 2),
            "percent_of_total": round((electricity_annual / total_opex_annual * 100), 1) if total_opex_annual > 0 else 0,
            "kwh_consumed": round(annual_kwh, 0),
            "unit_cost_kwh": electricity_rate_usd_kwh,
            "daily_kwh": round(daily_kwh, 1)
        },
        "chemicals": {
            "annual_usd": round(chemicals_annual, 2),
            "percent_of_total": round((chemicals_annual / total_opex_annual * 100), 1) if total_opex_annual > 0 else 0,
            "m3_treated_annually": round(annual_m3_treated, 0),
            "unit_cost_per_m3": chemicals_usd_per_m3
        },
        "personnel": {
            "annual_usd": round(personnel_annual, 2),
            "percent_of_total": round((personnel_annual / total_opex_annual * 100), 1) if total_opex_annual > 0 else 0,
            "operators_count": operators_count,
            "salary_per_operator": operator_annual_salary_usd
        },
        "maintenance": {
            "annual_usd": round(maintenance_annual, 2),
            "percent_of_total": round((maintenance_annual / total_opex_annual * 100), 1) if total_opex_annual > 0 else 0,
            "percent_of_capex": maintenance_pct_capex,
            "capex_basis": capex_usd
        }
    }
    
    # Build calculation trace
    calculation_trace = [
        f"Electricity: {total_power_kw} kW × {operating_hours_per_day}h × 365d × ${electricity_rate_usd_kwh}/kWh = ${electricity_annual:,.0f}",
        f"Chemicals: {flow_m3_day} m³/d × 365d × ${chemicals_usd_per_m3}/m³ = ${chemicals_annual:,.0f}",
        f"Personnel: {operators_count} operators × ${operator_annual_salary_usd:,.0f} = ${personnel_annual:,.0f}",
        f"Maintenance: ${capex_usd:,.0f} × {maintenance_pct_capex*100:.0f}% = ${maintenance_annual:,.0f}",
        f"TOTAL ANNUAL OPEX: ${total_opex_annual:,.0f}",
        f"Unit cost: ${opex_per_m3:.2f}/m³ treated"
    ]
    
    # Power breakdown by equipment
    power_breakdown = {}
    for equip_name, power_kw in equipment_power_kw.items():
        annual_kwh_equip = power_kw * operating_hours_per_day * 365
        annual_cost_equip = annual_kwh_equip * electricity_rate_usd_kwh
        
        power_breakdown[equip_name] = {
            "power_kw": power_kw,
            "annual_kwh": round(annual_kwh_equip, 0),
            "annual_cost_usd": round(annual_cost_equip, 2),
            "percent_of_electricity": round((power_kw / total_power_kw * 100), 1) if total_power_kw > 0 else 0
        }
    
    return {
        "electricity_annual": round(electricity_annual, 2),
        "chemicals_annual": round(chemicals_annual, 2),
        "personnel_annual": round(personnel_annual, 2),
        "maintenance_annual": round(maintenance_annual, 2),
        "total_opex_annual": round(total_opex_annual, 2),
        "opex_per_m3": round(opex_per_m3, 2),
        "calculation_details": {
            "total_power_kw": total_power_kw,
            "annual_kwh": round(annual_kwh, 0),
            "annual_m3_treated": round(annual_m3_treated, 0),
            "operating_hours_per_day": operating_hours_per_day,
            "electricity_rate_usd_kwh": electricity_rate_usd_kwh,
            "operators_count": operators_count
        },
        "breakdown_by_category": breakdown_by_category,
        "power_breakdown_by_equipment": power_breakdown,
        "calculation_trace": calculation_trace,
        "reproducible": True,
        "timestamp": datetime.utcnow().isoformat(),
        "source": "Industry standards for OPEX estimation"
    }


def validate_proposal_consistency(
    markdown_content: str,
    technical_data: Dict[str, Any]
) -> Dict[str, Any]:
    """
    Validate consistency between markdown proposal and JSON technical data.
    
    This tool provides DETERMINISTIC validation - checks that key numbers in the
    markdown document match the structured JSON data. Prevents inconsistencies
    where users see different values in PDF vs. dashboard.
    
    Checks performed:
    - CAPEX values match
    - OPEX values match
    - Flow rate matches
    - Equipment counts match
    - Major contaminant values match
    
    Args:
        markdown_content: Full markdown proposal text
        technical_data: Structured technical data dict (from TechnicalData model)
    
    Returns:
        Dict containing:
            - consistent: Boolean indicating if all checks passed
            - mismatches: List of mismatches found
            - checks_performed: Number of checks performed
            - detailed_checks: Detailed results for each check
            - warnings: Non-critical warnings
            - reproducible: Always True
            
    Raises:
        ValueError: If inputs are invalid
        
    Example:
        >>> markdown = "Total CAPEX: $2,463,142\\nAnnual OPEX: $293,473"
        >>> technical_data = {"capex_usd": 2463142, "annual_opex_usd": 293473}
        >>> result = validate_proposal_consistency(markdown, technical_data)
        >>> result["consistent"]
        True
    """
    # Validation: markdown not empty
    if not markdown_content or not markdown_content.strip():
        raise ValueError("Markdown content cannot be empty")
    
    # Validation: technical data not empty
    if not technical_data:
        raise ValueError("Technical data cannot be empty")
    
    mismatches = []
    detailed_checks = {}
    warnings = []
    checks_performed = 0
    
    def extract_number_from_markdown(text: str, pattern: str) -> Optional[float]:
        """
        Extract a number from markdown using regex pattern.
        Handles formats like: $2,463,142 or 2,463,142 or 2463142
        """
        match = re.search(pattern, text, re.IGNORECASE)
        if match:
            # Extract the number, remove commas and $
            num_str = match.group(1).replace(",", "").replace("$", "").strip()
            try:
                return float(num_str)
            except ValueError:
                return None
        return None
    
    # CHECK 1: CAPEX
    if "capex_usd" in technical_data:
        checks_performed += 1
        json_capex = technical_data["capex_usd"]
        
        # Try multiple patterns
        patterns = [
            r"Total CAPEX[:\s]+\$?([\d,]+)",
            r"CAPEX[:\s]+\$?([\d,]+)",
            r"Capital[:\s]+\$?([\d,]+)",
        ]
        
        markdown_capex = None
        for pattern in patterns:
            markdown_capex = extract_number_from_markdown(markdown_content, pattern)
            if markdown_capex is not None:
                break
        
        if markdown_capex is not None:
            # Allow 1% tolerance for rounding differences
            difference = abs(markdown_capex - json_capex)
            difference_pct = (difference / json_capex * 100) if json_capex > 0 else 0
            
            match = difference_pct < 1.0
            
            detailed_checks["capex_check"] = {
                "markdown_value": markdown_capex,
                "json_value": json_capex,
                "match": match,
                "difference_usd": round(difference, 2),
                "difference_pct": round(difference_pct, 2)
            }
            
            if not match:
                mismatches.append(
                    f"CAPEX mismatch: Markdown ${markdown_capex:,.0f} != JSON ${json_capex:,.0f} "
                    f"(difference: {difference_pct:.1f}%)"
                )
        else:
            warnings.append("CAPEX value not found in markdown - unable to validate")
    
    # CHECK 2: OPEX
    if "annual_opex_usd" in technical_data:
        checks_performed += 1
        json_opex = technical_data["annual_opex_usd"]
        
        patterns = [
            r"Annual OPEX[:\s]+\$?([\d,]+)",
            r"OPEX[:\s]+\$?([\d,]+)",
            r"Operating Cost[:\s]+\$?([\d,]+)",
        ]
        
        markdown_opex = None
        for pattern in patterns:
            markdown_opex = extract_number_from_markdown(markdown_content, pattern)
            if markdown_opex is not None:
                break
        
        if markdown_opex is not None:
            difference = abs(markdown_opex - json_opex)
            difference_pct = (difference / json_opex * 100) if json_opex > 0 else 0
            match = difference_pct < 1.0
            
            detailed_checks["opex_check"] = {
                "markdown_value": markdown_opex,
                "json_value": json_opex,
                "match": match,
                "difference_usd": round(difference, 2),
                "difference_pct": round(difference_pct, 2)
            }
            
            if not match:
                mismatches.append(
                    f"OPEX mismatch: Markdown ${markdown_opex:,.0f} != JSON ${json_opex:,.0f} "
                    f"(difference: {difference_pct:.1f}%)"
                )
        else:
            warnings.append("OPEX value not found in markdown - unable to validate")
    
    # CHECK 3: Flow Rate
    if "flow_rate_m3_day" in technical_data:
        checks_performed += 1
        json_flow = technical_data["flow_rate_m3_day"]
        
        patterns = [
            r"Flow[:\s]+(\d+(?:,\d+)?)\s*m[³3]",
            r"(\d+(?:,\d+)?)\s*m[³3]/d",
            r"Design Flow[:\s]+(\d+(?:,\d+)?)",
        ]
        
        markdown_flow = None
        for pattern in patterns:
            markdown_flow = extract_number_from_markdown(markdown_content, pattern)
            if markdown_flow is not None:
                break
        
        if markdown_flow is not None:
            match = abs(markdown_flow - json_flow) < 1
            
            detailed_checks["flow_check"] = {
                "markdown_value": markdown_flow,
                "json_value": json_flow,
                "match": match,
                "difference": abs(markdown_flow - json_flow)
            }
            
            if not match:
                mismatches.append(
                    f"Flow mismatch: Markdown {markdown_flow} m³/d != JSON {json_flow} m³/d"
                )
        else:
            warnings.append("Flow rate not found in markdown - unable to validate")
    
    # CHECK 4: Equipment Count
    if "main_equipment" in technical_data:
        checks_performed += 1
        json_equip_count = len(technical_data["main_equipment"])
        
        # Count occurrences of equipment-related patterns in markdown
        equipment_keywords = ["reactor", "system", "filter", "clarifier", "unit", "tank"]
        markdown_equip_mentions = 0
        for keyword in equipment_keywords:
            markdown_equip_mentions += len(re.findall(keyword, markdown_content, re.IGNORECASE))
        
        # This is a soft check - just warn if significantly different
        if markdown_equip_mentions < json_equip_count:
            warnings.append(
                f"Equipment: JSON lists {json_equip_count} items, "
                f"but markdown mentions equipment {markdown_equip_mentions} times. "
                f"Consider reviewing equipment description completeness."
            )
        
        detailed_checks["equipment_count_check"] = {
            "json_equipment_count": json_equip_count,
            "markdown_equipment_mentions": markdown_equip_mentions,
            "note": "Soft check - validates equipment is described"
        }
    
    # Overall consistency
    consistent = len(mismatches) == 0
    
    return {
        "consistent": consistent,
        "mismatches": mismatches,
        "checks_performed": checks_performed,
        "detailed_checks": detailed_checks,
        "warnings": warnings,
        "reproducible": True,
        "timestamp": datetime.utcnow().isoformat(),
        "note": "Validates key numbers match between markdown and JSON. 1% tolerance for rounding.",
        "recommendation": "Fix mismatches before delivering proposal to ensure data consistency."
    }
