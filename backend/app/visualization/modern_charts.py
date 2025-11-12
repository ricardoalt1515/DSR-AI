"""
Premium visualization generator
- Matplotlib-based P&ID process diagrams (simple_process_diagram)
- Plotly for executive-quality financial charts
Professional approach for treatment train diagrams
"""

import base64
from typing import Dict, Any, List
import logging
import plotly.graph_objects as go
from plotly.subplots import make_subplots
from io import BytesIO
import matplotlib.pyplot as plt
import matplotlib.patches as patches
from matplotlib.patches import FancyBboxPatch, Rectangle, Circle, Polygon
import numpy as np

logger = logging.getLogger("hydrous")

# Import new simple diagrams system
try:
    from app.visualization.simple_process_diagram import simple_process_diagram, PremiumVisualConfig
    SIMPLE_DIAGRAMS_AVAILABLE = True
    logger.info("✅ Simple P&ID diagrams system available")
except ImportError as e:
    SIMPLE_DIAGRAMS_AVAILABLE = False
    logger.warning(f"⚠️ Simple diagrams system not available: {e}")


class PremiumPlotlyConfig:
    """
    Premium configuration for Plotly financial charts.
    Visual coherence with P&ID system - Professional executive appearance.
    """
    
    # Reuse premium palette from P&ID system
    if SIMPLE_DIAGRAMS_AVAILABLE:
        _base_config = PremiumVisualConfig()
        COLORS = _base_config.COLORS.copy()
    else:
        # Fallback colors if P&ID config not available
        COLORS = {
            'primary_blue': '#1e40af',
            'secondary_blue': '#3b82f6', 
            'process_green': '#059669',
            'process_green_light': '#10b981',
            'critical_red': '#dc2626',
            'critical_red_light': '#ef4444',
            'warning_orange': '#ea580c',
            'warning_orange_light': '#f97316',
            'premium_gray': '#475569',
            'premium_gray_light': '#64748b',
            'clean_white': '#ffffff',
            'text_dark': '#1f2937',
            'text_medium': '#4b5563',
            'background_light': '#f8fafc'
        }
    
    # Esquemas de colores premium para diferentes tipos de gráficas
    COLOR_SCHEMES = {
        'capex_opex': [COLORS['primary_blue'], COLORS['critical_red']],
        'capex_breakdown': [COLORS['primary_blue'], COLORS['secondary_blue'], COLORS['process_green'], COLORS['warning_orange']],
        'opex_breakdown': [COLORS['critical_red'], COLORS['critical_red_light'], COLORS['warning_orange'], COLORS['premium_gray']],
        'cash_flow': {
            'positive': COLORS['process_green'],
            'negative': COLORS['critical_red'],
            'breakeven': COLORS['warning_orange'],
            'background': COLORS['background_light']
        }
    }
    
    # Tipografía premium consistente con P&ID
    TYPOGRAPHY = {
        'title_size': 16,
        'subtitle_size': 14,
        'label_size': 12,
        'value_size': 10,
        'annotation_size': 9,
        'font_family': 'Arial, sans-serif',
        'title_weight': 'bold',
        'label_weight': 'normal'
    }
    
    # Layout premium
    LAYOUT = {
        'margin': dict(l=80, r=80, t=100, b=80),
        'spacing': 0.15,  # Espaciado entre subplots basado en golden ratio
        'background_color': COLORS['clean_white'],
        'grid_color': COLORS['premium_gray_light'],
        'grid_alpha': 0.3
    }
    
    # Efectos premium para gráficas
    EFFECTS = {
        'hover_shadow': 'rgba(0,0,0,0.1)',
        'border_radius': 4,
        'gradient_opacity': 0.8,
        'line_width': 3,
        'marker_size': 8
    }


class PremiumChartGenerator:
    """
    Generador premium:
    - P&ID con Matplotlib: Diagramas de proceso profesionales para tratamiento de agua
    - Plotly: Charts financieros de calidad ejecutiva
    """
    
    def __init__(self):
        self._verify_dependencies()
        self.plotly_config = PremiumPlotlyConfig()
        logger.info("✅ PremiumChartGenerator inicializado - P&ID Premium + Plotly Ejecutivo")
    
    def _verify_dependencies(self):
        """Verifica que todas las dependencias estén disponibles"""
        try:
            # Verificar Plotly
            import plotly
            logger.info(f"✅ Plotly verificado: {plotly.__version__}")
                
        except Exception as e:
            logger.error(f"❌ Error verificando dependencias: {e}")
            raise Exception("Dependencias premium requeridas no disponibles")
    
    def generate_executive_charts(self, metadata: Dict[str, Any]) -> Dict[str, str]:
        """
        Generate premium visualizations using hybrid approach with real agent data
        """
        logger.info("🎨 === STARTING PREMIUM HYBRID GENERATION ===")
        logger.info(f"📊 Metadata received: {list(metadata.keys())}")
        
        charts = {}
        
        try:
            # Get technical data from agent
            agent_data = metadata.get('data_for_charts', {})
            
            logger.info(f"📊 Agent data extracted: {type(agent_data)}")
            if isinstance(agent_data, dict):
                logger.info(f"📊 Fields in agent_data: {list(agent_data.keys())}")
                
                # DETAILED DEBUGGING - verify specific data
                logger.info("🔍 === DETAILED AGENT DATA ANALYSIS ===")
                logger.info(f"  - CAPEX: {agent_data.get('capex_usd', 'NOT AVAILABLE')}")
                logger.info(f"  - OPEX: {agent_data.get('annual_opex_usd', 'NOT AVAILABLE')}")
                logger.info(f"  - Equipment: {len(agent_data.get('main_equipment', []))} units")
                logger.info(f"  - Duration: {agent_data.get('implementation_months', 'NOT AVAILABLE')} months")
                logger.info(f"  - CAPEX breakdown: {'YES' if agent_data.get('capex_breakdown') else 'NO'}")
                logger.info(f"  - OPEX breakdown: {'YES' if agent_data.get('opex_breakdown') else 'NO'}")
                logger.info(f"  - Efficiencies: {'YES' if agent_data.get('treatment_efficiency') else 'NO'}")
                logger.info(f"  - ROI: {agent_data.get('roi_percent', 'NOT AVAILABLE')}%")
                logger.info(f"  - Payback: {agent_data.get('payback_years', 'NOT AVAILABLE')} years")
                logger.info("🔍 === END DETAILED ANALYSIS ===")
            
            if not agent_data:
                logger.warning("⚠️ No technical data from agent")
                return self._generate_no_data_charts()
            
            logger.info("🔄 Generating premium hybrid charts...")
            
            # P&ID profesional con matplotlib (Mermaid eliminado)
            logger.info("🔧 Generating process_flow with P&ID (matplotlib)...")
            charts['process_flow'] = self.generate_simple_process_diagram(agent_data)
            
            # PLOTLY: Executive financial chart with cash flow
            logger.info("💰 Generating financial_chart with Plotly...")
            charts['financial_executive'] = self._create_financial_chart_plotly(agent_data)
            
            logger.info(f"✅ Generated {len(charts)} premium hybrid charts")
            
        except Exception as e:
            logger.error(f"❌ Error generating premium charts: {e}", exc_info=True)
            return {"error": self._create_error_message(str(e))}
        
        logger.info("🎨 === END PREMIUM HYBRID GENERATION ===")
        return charts


    def _enhance_equipment_with_process_info(self, equipment: Dict, semantic_properties: Dict) -> Dict:
        """
        Mejora equipo con información adicional para layout inteligente
        """
        enhanced = semantic_properties.copy()
        
        # Añadir información de flujo de proceso
        enhanced['flow_type'] = self._determine_flow_type(equipment)
        enhanced['process_role'] = self._determine_process_role(equipment)
        enhanced['connection_type'] = self._determine_connection_type(equipment)
        enhanced['technical_specs'] = self._extract_technical_specs(equipment)
        
        return enhanced
    
    def _advanced_equipment_classification(self, equipment: Dict) -> Dict:
        """
        Clasificación avanzada cuando no hay análisis semántico del agente
        Intenta inferir propiedades técnicas del contexto
        """
        eq_type = equipment.get('type', '').lower()
        capacity = equipment.get('capacity_m3_day') or 0
        power = equipment.get('power_consumption_kw') or 0
        
        # Inferir criticality basado en tipo y capacidad
        if any(word in eq_type for word in ['reactor', 'principal', 'main']):
            criticality = 'high'
        elif any(word in eq_type for word in ['bomba', 'auxiliar', 'bypass']):
            criticality = 'low' 
        else:
            criticality = 'medium'
        
        # Inferir stage basado en análisis mejorado
        if any(word in eq_type for word in ['pretratamiento', 'rejilla', 'cribado']):
            stage = 'primary'
        elif any(word in eq_type for word in ['biologico', 'reactor', 'bio']):
            stage = 'secondary'
        elif any(word in eq_type for word in ['filtro', 'membrana', 'desinfeccion']):
            stage = 'tertiary'
        else:
            stage = 'auxiliary'
        
        # Usar lógica semántica estándar
        return {
            'criticality': criticality,
            'stage': stage,
            'risk_factor': 'medium',
            'complexity': 'moderate'
        }
    
    def _sort_equipment_by_process_flow(self, equipment_list: List[Dict]) -> List[Dict]:
        """
        Ordena equipos según secuencia real del proceso de tratamiento
        """
        # Definir orden lógico de etapas
        stage_order = {
            'primary': 1,
            'secondary': 2, 
            'tertiary': 3,
            'auxiliary': 4
        }
        
        # Ordenar por stage y luego por criticality dentro de cada stage
        sorted_equipment = sorted(equipment_list, key=lambda eq: (
            stage_order.get(eq.get('stage', 'auxiliary'), 4),
            {'high': 1, 'medium': 2, 'low': 3}.get(eq.get('criticality', 'medium'), 2)
        ))
        
        logger.info(f"🔄 Equipos ordenados en secuencia de proceso: {[eq.get('type') for eq in sorted_equipment]}")
        return sorted_equipment
    
    def _validate_process_sequence(self, equipment_list: List[Dict]) -> None:
        """
        Valida que la secuencia del proceso sea técnicamente coherente
        """
        stages_found = [eq.get('stage', 'unknown') for eq in equipment_list]
        
        # Verificar que haya al menos una etapa principal
        if not any(stage in ['primary', 'secondary', 'tertiary'] for stage in stages_found):
            logger.warning("⚠️ No se encontraron etapas principales de tratamiento")
        
        # Log de secuencia para debugging
        logger.info(f"✅ Secuencia validada: {' → '.join(stages_found)}")
    
    def _create_intelligent_process_groups(self, equipment_list: List[Dict]) -> Dict[str, Dict]:
        """
        Crea grupos inteligentes basados en función técnica real
        """
        groups = {}
        
        for eq in equipment_list:
            stage = eq.get('stage', 'auxiliary')
            category = eq.get('category', self._stage_to_category(stage))
            
            if category not in groups:
                groups[category] = {
                    'equipment': [],
                    'stage_type': stage,
                    'total_capacity': 0,
                    'total_power': 0,
                    'criticality_level': 'medium'
                }
            
            groups[category]['equipment'].append(eq)
            groups[category]['total_capacity'] += eq.get('capacity_m3_day') or 0
            groups[category]['total_power'] += eq.get('power_consumption_kw') or 0
            
            # Actualizar nivel de criticality del grupo
            eq_criticality = eq.get('criticality', 'medium')
            if eq_criticality == 'high':
                groups[category]['criticality_level'] = 'high'
        
        logger.info(f"🗣️ Grupos de proceso creados: {list(groups.keys())}")
        return groups
    
    def _calculate_system_metrics(self, equipment_list: List[Dict], efficiencies: Dict[str, float]) -> Dict:
        """
        Calcula métricas del sistema para contexto del diagrama
        """
        total_capacity = max([eq.get('capacity_m3_day') or 0 for eq in equipment_list], default=0)
        total_power = sum([eq.get('power_consumption_kw') or 0 for eq in equipment_list])
        avg_efficiency = sum(efficiencies.values()) / len(efficiencies) if efficiencies else 95
        
        # Calcular métricas avanzadas
        energy_per_m3 = (total_power * 24) / total_capacity if total_capacity > 0 else 0
        equipment_count = len(equipment_list)
        critical_equipment = len([eq for eq in equipment_list if eq.get('criticality') == 'high'])
        
        metrics = {
            'total_capacity': total_capacity,
            'total_power': total_power,
            'avg_efficiency': avg_efficiency,
            'energy_per_m3': energy_per_m3,
            'equipment_count': equipment_count,
            'critical_equipment': critical_equipment,
            'process_complexity': 'complex' if equipment_count > 8 else 'moderate' if equipment_count > 4 else 'simple'
        }
        
        logger.info(f"📊 Métricas del sistema: Capacidad={total_capacity} m³/d, Potencia={total_power} kW, Equipos={equipment_count}")
        return metrics
    
    def _build_adaptive_diagram_structure(self, process_groups: Dict, system_metrics: Dict) -> Dict:
        """
        Construye estructura adaptativa del diagrama basada en datos reales
        """
        # Ordenar grupos por secuencia lógica
        group_order = {
            'Pretratamiento': 1,
            'Tratamiento Biológico': 2,
            'Tratamiento Avanzado': 3,
            'Equipos Auxiliares': 4
        }
        
        # Crear estructura ordenada
        ordered_structure = {}
        for group_name in sorted(process_groups.keys(), key=lambda x: group_order.get(x, 5)):
            group_info = process_groups[group_name]
            
            # Añadir información contextual para layout
            group_info['layout_priority'] = group_order.get(group_name, 5)
            group_info['visual_emphasis'] = self._calculate_visual_emphasis(group_info, system_metrics)
            
            ordered_structure[group_name] = group_info
        
        return ordered_structure
    
    def _stage_to_category(self, stage: str) -> str:
        """
        Convierte stage técnico a categoría visual
        """
        mapping = {
            'primary': 'Pretratamiento',
            'secondary': 'Tratamiento Biológico', 
            'tertiary': 'Tratamiento Avanzado',
            'auxiliary': 'Equipos Auxiliares'
        }
        return mapping.get(stage, 'Proceso General')
    
    def _get_stage_priority(self, stage: str) -> int:
        """
        Determina la prioridad de secuencia basada en el stage técnico del agente
        Usado para ordenar equipos en secuencia lógica de proceso
        """
        priority_mapping = {
            'primary': 1,      # Pretratamiento va primero
            'secondary': 2,    # Tratamiento secundario/biológico
            'tertiary': 3,     # Tratamiento terciario/avanzado
            'auxiliary': 4     # Equipos auxiliares al final
        }
        return priority_mapping.get(stage.lower(), 2)  # Default: secondary priority
    
    def _determine_flow_type(self, equipment: Dict) -> str:
        """Determina el tipo de flujo del equipo"""
        eq_type = equipment.get('type', '').lower()
        if 'recirculacion' in eq_type or 'recycle' in eq_type:
            return 'recirculation'
        elif 'bypass' in eq_type:
            return 'bypass'
        else:
            return 'main_line'
    
    def _determine_process_role(self, equipment: Dict) -> str:
        """Determina el rol en el proceso"""
        criticality = equipment.get('criticality', 'medium')
        if criticality == 'high':
            return 'critical_process'
        elif criticality == 'low':
            return 'support_system'
        else:
            return 'main_process'
    
    def _determine_connection_type(self, equipment: Dict) -> str:
        """Determina el tipo de conexión"""
        stage = equipment.get('stage', 'auxiliary')
        if stage == 'auxiliary':
            return 'auxiliary_connection'
        else:
            return 'process_connection'
    
    def _extract_technical_specs(self, equipment: Dict) -> Dict:
        """Extrae especificaciones técnicas clave"""
        return {
            'capacity': equipment.get('capacity_m3_day') or 0,
            'power': equipment.get('power_consumption_kw') or 0,
            'cost': equipment.get('capex_usd', 0),
            'dimensions': equipment.get('dimensions', 'N/A'),
            'efficiency': equipment.get('efficiency', None)
        }
    
    def _calculate_visual_emphasis(self, group_info: Dict, system_metrics: Dict) -> str:
        """Calcula énfasis visual basado en importancia técnica"""
        if group_info['criticality_level'] == 'high':
            return 'high_emphasis'
        elif group_info['total_power'] > system_metrics['total_power'] * 0.3:
            return 'medium_emphasis'
        else:
            return 'standard_emphasis'
    
    def _create_semantic_stage_id(self, group_name: str, group_info: Dict) -> str:
        """Crea ID semántico para etapas"""
        # Crear ID basado en función técnica
        base_name = group_name.replace(' ', '_').replace('ó', 'o').replace('í', 'i').upper()
        emphasis = group_info.get('visual_emphasis', 'standard')
        
        if emphasis == 'high_emphasis':
            return f"CRITICAL_{base_name}"
        else:
            return base_name
    
    def _create_premium_equipment_node(self, equipment: Dict, index: int, group_info: Dict) -> Dict:
        """Crea nodo premium con información técnica rica"""
        # Usar análisis semántico para diseño
        symbol = equipment.get('symbol', '⚙️')
        shape = equipment.get('shape', 'rect')
        
        # Construir etiqueta premium con información técnica  
        label_parts = [f"{equipment['type'].upper()}"]
        
        # Añadir información técnica relevante
        specs = equipment.get('technical_specs', {})
        if specs.get('capacity', 0) > 0:
            label_parts.append(f"{specs['capacity']:,.0f} m3/dia")
        
        if specs.get('power', 0) > 0:
            label_parts.append(f"{specs['power']:.1f} kW")
        
        # Añadir información de criticality si es high
        if equipment.get('criticality') == 'high':
            label_parts.append("CRITICO")
        
        # Sanitizar la etiqueta completa
        label_text = ' | '.join(label_parts)
        sanitized_label = self._sanitize_mermaid_string(label_text)
        
        return {
            'symbol': symbol,
            'shape': shape,
            'label': sanitized_label
        }
    
    def _create_premium_equipment_style(self, equipment: Dict, eq_id: str, node_design: Dict) -> Dict:
        """Crea estilo premium basado en análisis semántico"""
        # Usar color del análisis semántico si está disponible
        if 'color' in equipment:
            color = equipment['color']
            class_name = f"style_{eq_id}"
            
            style_lines = [
                f"    classDef {class_name} fill:{color},stroke:#ffffff,stroke-width:3px,color:#ffffff,font-weight:bold,font-size:11px"
            ]
            
            # Añadir efectos especiales para equipos críticos
            if equipment.get('criticality') == 'high':
                style_lines[0] = style_lines[0].replace('stroke-width:3px', 'stroke-width:4px')
            
            return {
                'lines': style_lines,
                'class_name': class_name
            }
        else:
            # Fallback a estilos predefinidos
            stage = equipment.get('stage', 'auxiliary')
            style_mapping = {
                'primary': 'dangerStyle',
                'secondary': 'infoStyle', 
                'tertiary': 'processStyle',
                'auxiliary': 'equipmentStyle'
            }
            return {
                'lines': [],
                'class_name': style_mapping.get(stage, 'equipmentStyle')
            }
    
    def _create_intelligent_connection(self, equipment: Dict, previous_node: str, total_flow: float, group_info: Dict) -> Dict:
        """Crea conexión inteligente con etiquetas contextuales"""
        if not previous_node:
            return None
        
        # Determinar flujo y tipo de conexión
        capacity = equipment.get('capacity_m3_day') or total_flow
        connection_type = equipment.get('connection_type', 'process_connection')
        
        # Crear etiqueta contextual premium
        if connection_type == 'auxiliary_connection':
            label = f"💙 AUX | {capacity:,.0f} m³/d"
        elif equipment.get('flow_type') == 'recirculation':
            label = f"🔄 RECIR | {capacity:,.0f} m³/d"
        elif equipment.get('criticality') == 'high':
            label = f"⚡ MAIN | {capacity:,.0f} m³/d"
        else:
            label = f"💧 {capacity:,.0f} m³/d"
        
        # Sanitizar etiqueta de conexión
        label = self._sanitize_mermaid_string(label)
        
        return {
            'label': label,
            'type': connection_type
        }
    
    # ════════════════════════════════════════════════════════════════════════════════════════════
    # MÉTODOS PREMIUM DE GENERACIÓN DE CONTENIDO P&ID AVANZADO
    # ════════════════════════════════════════════════════════════════════════════════════════════
    
    def _generate_premium_pid_styles(self, colors: Dict, system_metrics: Dict) -> List[str]:
        """
        Genera estilos premium P&ID con nivel profesional
        """
        styles = [
            "    %% --- ESTILOS P&ID PREMIUM PROFESIONALES ---",
            "",
            "    %% Estilos base corporativos",
            f"    classDef headerStyle fill:{colors['primary_blue']},stroke:{colors['premium_silver']},stroke-width:3px,color:{colors['clean_white']},font-size:16px,font-weight:bold,rx:8,ry:8",
            f"    classDef flowStyle fill:{colors['water_blue']},stroke:{colors['clean_white']},stroke-width:2px,color:{colors['clean_white']},font-size:12px,font-weight:bold,rx:12,ry:12",
            f"    classDef equipmentStyle fill:{colors['clean_white']},stroke:{colors['primary_blue']},stroke-width:2px,color:{colors['primary_blue']},font-size:11px,rx:6,ry:6",
            "",
            "    %% Estilos por criticality (semántico del agente)",
            f"    classDef criticalEquipment fill:{colors['danger_red']},stroke:{colors['clean_white']},stroke-width:3px,color:{colors['clean_white']},font-size:12px,font-weight:bold,rx:8,ry:8",
            f"    classDef standardEquipment fill:{colors['process_green']},stroke:{colors['clean_white']},stroke-width:2px,color:{colors['clean_white']},font-size:11px,font-weight:bold,rx:6,ry:6",
            f"    classDef auxiliaryEquipment fill:{colors['neutral_gray']},stroke:{colors['clean_white']},stroke-width:2px,color:{colors['clean_white']},font-size:10px,rx:4,ry:4",
            "",
            "    %% Estilos por stage técnico",
            f"    classDef primaryTreatment fill:{colors['warning_orange']},stroke:{colors['clean_white']},stroke-width:3px,color:{colors['clean_white']},font-size:11px,font-weight:bold,rx:6,ry:6",
            f"    classDef secondaryTreatment fill:{colors['tech_purple']},stroke:{colors['clean_white']},stroke-width:3px,color:{colors['clean_white']},font-size:11px,font-weight:bold,rx:6,ry:6",
            f"    classDef tertiaryTreatment fill:{colors['success_green']},stroke:{colors['clean_white']},stroke-width:3px,color:{colors['clean_white']},font-size:11px,font-weight:bold,rx:6,ry:6",
            f"    classDef sludgeStyle fill:{colors['sludge_brown']},stroke:{colors['clean_white']},stroke-width:2px,color:{colors['clean_white']},font-size:10px,rx:4,ry:4",
            "",
            "    %% Estilos premium para paneles informativos",
            f"    classDef premiumPanel fill:{colors['primary_blue']},stroke:{colors['premium_silver']},stroke-width:2px,color:{colors['clean_white']},font-size:12px,font-weight:bold,rx:10,ry:10",
            f"    classDef efficiencyPanel fill:{colors['success_green']},stroke:{colors['clean_white']},stroke-width:2px,color:{colors['clean_white']},font-size:11px,rx:8,ry:8",
            f"    classDef techSpecPanel fill:{colors['premium_silver']},stroke:{colors['neutral_gray']},stroke-width:2px,color:{colors['neutral_gray']},font-size:10px,rx:6,ry:6",
            ""
        ]
        
        # Agregar estilos dinámicos basados en métricas del sistema
        if system_metrics.get('process_complexity') == 'complex':
            styles.append(f"    classDef complexSystem fill:{colors['tech_purple']},stroke:{colors['warning_orange']},stroke-width:3px,color:{colors['clean_white']},font-size:12px,font-weight:bold")
        
        return styles
    
    def _create_premium_header(self, system_metrics: Dict, avg_efficiency: float) -> List[str]:
        """
        Crea cabecera premium con métricas inteligentes del sistema
        """
        capacity = system_metrics.get('total_capacity', 0)
        power = system_metrics.get('total_power', 0)
        equipment_count = system_metrics.get('equipment_count', 0)
        complexity = system_metrics.get('process_complexity', 'moderate')
        energy_per_m3 = system_metrics.get('energy_per_m3', 0)
        
        # Indicadores de performance premium
        complexity_indicator = {
            'simple': '🟢 SIMPLE',
            'moderate': '🟡 MODERADO', 
            'complex': '🔴 COMPLEJO'
        }.get(complexity, '🟡 MODERADO')
        
        efficiency_indicator = '🟢 EXCELENTE' if avg_efficiency >= 95 else '🟡 BUENA' if avg_efficiency >= 85 else '🟠 ACEPTABLE'
        
        header_content = f"PLANTA DE TRATAMIENTO | CAP: {capacity:,.0f} m3/dia | POT: {power:.1f} kW | EF: {avg_efficiency:.1f}% | {equipment_count} EQUIPOS"
        header_content = self._sanitize_mermaid_string(header_content)
        
        header_lines = [
            "    %% --- CABECERA PREMIUM DEL PROYECTO ---",
            f'    HEADER["{header_content}"]',
            "    HEADER:::premiumPanel",
            ""
        ]
        
        return header_lines
    
    def _create_premium_inlet_outlet_nodes(self, system_metrics: Dict, avg_efficiency: float) -> Dict[str, List[str]]:
        """
        Crea nodos premium de entrada y salida con información técnica rica
        """
        capacity = system_metrics.get('total_capacity', 0)
        
        # Nodo de entrada premium  
        inlet_content = f"AGUA CRUDA | CAP: {capacity:,.0f} m3/dia | ALIMENTACION"
        inlet_content = self._sanitize_mermaid_string(inlet_content)
        
        inlet = [
            "    %% --- ENTRADA PREMIUM DEL PROCESO ---",
            f'    ENTRADA["{inlet_content}"]',
            "    ENTRADA:::flowStyle",
            ""
        ]
        
        # Nodo de salida premium  
        quality_indicator = '🟢 EXCELENTE' if avg_efficiency >= 95 else '🟡 BUENA' if avg_efficiency >= 85 else '🟠 ACEPTABLE'
        discharge_compliance = '✅ CUMPLE NORMATIVA' if avg_efficiency >= 90 else '⚠️ VERIFICAR CUMPLIMIENTO'
        
        outlet_content = f"AGUA TRATADA | CALIDAD: EXCELENTE ({avg_efficiency:.1f}%) | {capacity:,.0f} m3/dia"
        outlet_content = self._sanitize_mermaid_string(outlet_content)
        
        outlet = [
            "    %% --- SALIDA PREMIUM DEL PROCESO ---",
            f'    SALIDA["{outlet_content}"]',
            "    SALIDA:::premiumPanel",
            ""
        ]
        
        return {
            'inlet': inlet,
            'outlet': outlet
        }
    
    def _create_premium_efficiency_panel(self, efficiencies: Dict[str, float], system_metrics: Dict) -> List[str]:
        """
        Crea panel premium de eficiencias con clasificación visual
        """
        panel = [
            "    %% --- PANEL PREMIUM DE EFICIENCIAS GARANTIZADAS ---",
            "    subgraph EFFICIENCY_PANEL[\"📊 EFICIENCIAS DE REMOCIÓN GARANTIZADAS\"]",
            "        direction TB",
            ""
        ]
        
        # Mapear parámetros a nombres técnicos
        param_names = {
            'COD': 'DQO (COD)',
            'BOD': 'DBO (BOD)', 
            'TSS': 'SST (TSS)',
            'TN': 'Nitrógeno Total',
            'TP': 'Fósforo Total',
            'Grasas_Aceites': 'Grasas y Aceites',
            'Coliformes': 'Coliformes Fecales'
        }
        
        for i, (param, eff) in enumerate(efficiencies.items()):
            eff_id = f"EFF_{param}_{i+1}"
            param_display = param_names.get(param, param)
            
            # Clasificar eficiencia
            if eff >= 95:
                status = '🟢 EXCELENTE'
                style = 'efficiencyPanel'
            elif eff >= 85:
                status = '🟡 BUENA'
                style = 'secondaryTreatment'
            elif eff >= 75:
                status = '🟠 ACEPTABLE'
                style = 'primaryTreatment'
            else:
                status = '🔴 REQUIERE MEJORA'
                style = 'auxiliaryEquipment'
            
            panel.extend([
                f'        {eff_id}["{param_display}<br/>{eff:.1f}% REMOCIÓN<br/>{status}"]',
                f'        {eff_id}:::{style}',
                ""
            ])
        
        panel.extend([
            "    end",
            ""
        ])
        
        return panel
    
    def _create_premium_tech_specs_panel(self, system_metrics: Dict, equipment_list: List[Dict]) -> List[str]:
        """
        Crea panel premium de especificaciones técnicas
        """
        # Calcular estadísticas del sistema
        total_capex = sum([eq.get('capex_usd', 0) for eq in equipment_list])
        critical_equipment = len([eq for eq in equipment_list if eq.get('criticality') == 'high'])
        
        tech_content = f"ESPECIFICACIONES PREMIUM | Normativas internacionales | Eficiencias garantizadas | Control automatizado | {critical_equipment} equipos criticos | CAPEX: ${total_capex:,.0f} USD"
        tech_content = self._sanitize_mermaid_string(tech_content)
        
        panel = [
            "    %% --- PANEL PREMIUM DE ESPECIFICACIONES TÉCNICAS ---",
            f'    TECH_SPECS["{tech_content}"]',
            "    TECH_SPECS:::techSpecPanel",
            ""
        ]
        
        return panel
    
    def _create_final_process_connection(self, previous_node: str, system_metrics: Dict) -> List[str]:
        """
        Crea conexión final premium del proceso
        """
        capacity = system_metrics.get('total_capacity', 0)
        
        connection_label = f"🌊 EFLUENTE FINAL - ✅ {capacity:,.0f} m³/día TRATADOS - 🎯 LISTO PARA DESCARGA"
        
        return [
            f'    {previous_node} -->|"{connection_label}"| SALIDA',
            ""
        ]
    
    # ═══════════════════════════════════════════════════════════════
    # MÉTODOS AUXILIARES EXISTENTES (MANTENIDOS PARA COMPATIBILIDAD)
    # ═══════════════════════════════════════════════════════════════
    
    def _get_equipment_css_class(self, eq_type: str) -> str:
        """Determina la clase CSS basada en el tipo de equipo"""
        eq_type = eq_type.upper()
        
        if any(word in eq_type for word in ['REJILLA', 'CRIBADO', 'DESARENADOR', 'DESENGRASADOR']):
            return 'pretratamiento'
        elif any(word in eq_type for word in ['REACTOR', 'BIOLOGICO', 'MBBR', 'LODOS', 'ACTIVADOS']):
            return 'biologico'
        elif any(word in eq_type for word in ['COAGULACION', 'FLOCULACION', 'SEDIMENTACION', 'DAF']):
            return 'fisicoquimico'
        elif any(word in eq_type for word in ['FILTRO', 'FILTRACION', 'MEMBRANA', 'ULTRAFILTRO', 'NANOFILTRO']):
            return 'filtracion'
        elif any(word in eq_type for word in ['DESINFECCION', 'UV', 'CLORO', 'OZONO']):
            return 'desinfeccion'
        else:
            return 'general'
    
    def _render_mermaid_to_base64(self, mermaid_content: str) -> str:
        """Renderiza el diagrama Mermaid a imagen base64 optimizado para PDF"""
        try:
            # Crear archivo temporal para el diagrama
            with tempfile.NamedTemporaryFile(mode='w', suffix='.mmd', delete=False) as f:
                f.write(mermaid_content)
                mermaid_file = f.name
            
            # Crear archivo temporal para la imagen
            with tempfile.NamedTemporaryFile(suffix='.png', delete=False) as f:
                output_file = f.name
            
            # Configurar comando Mermaid con opciones optimizadas para PDF A4 - MÁXIMA LEGIBILIDAD
            cmd = [
                'mmdc',
                '-i', mermaid_file,
                '-o', output_file,
                '-w', '2400',  # Ancho aumentado para mejor aprovechamiento del PDF
                '-H', '1800',  # Altura aumentada para diagramas verticales
                '--scale', '4',  # Escala muy alta para máxima legibilidad
                '--backgroundColor', 'white',
                '--theme', 'neutral'  # Tema válido (corregido de 'base' a 'neutral')
            ]
            
            # Ejecutar comando
            result = subprocess.run(cmd, capture_output=True, text=True, timeout=30)
            
            if result.returncode != 0:
                error_msg = f"Mermaid CLI error (code {result.returncode}):\nSTDERR: {result.stderr}\nSTDOUT: {result.stdout}"
                logger.error(f"❌ Mermaid CLI falló: {error_msg}")
                
                # Log el contenido problemático para debugging
                logger.debug("🔍 Contenido Mermaid que causó error:")
                logger.debug(mermaid_content[:500] + "..." if len(mermaid_content) > 500 else mermaid_content)
                
                raise Exception(error_msg)
            
            # Leer y convertir a base64
            with open(output_file, 'rb') as f:
                image_data = f.read()
                base64_image = base64.b64encode(image_data).decode('utf-8')
            
            # Limpiar archivos temporales
            os.unlink(mermaid_file)
            os.unlink(output_file)
            
            return base64_image
            
        except Exception as e:
            # Limpiar archivos en caso de error
            try:
                if 'mermaid_file' in locals():
                    os.unlink(mermaid_file)
                if 'output_file' in locals():
                    os.unlink(output_file)
            except:
                pass
            raise e
    
    def _create_matplotlib_fallback(self, agent_data: Dict[str, Any]) -> str:
        """
        SISTEMA PREMIUM DE FALLBACK - P&ID Profesional con Matplotlib
        100% Basado en Análisis Semántico del Agente IA
        Calidad equivalente a $3,000 USD - No más diagramas básicos
        """
        try:
            
            # Configurar matplotlib para calidad 4K profesional
            plt.rcParams['savefig.dpi'] = 300
            plt.rcParams['figure.dpi'] = 300
            plt.rcParams['savefig.bbox'] = 'tight'
            
            logger.info("🎨 === GENERANDO DIAGRAMA P&ID PREMIUM CON MATPLOTLIB ===")
            
            main_equipment = agent_data.get('main_equipment', [])
            flow_rate = agent_data.get('flow_rate_m3_day', 0)
            # Pass full treatment_efficiency data (new format with parameters)
            efficiencies = agent_data.get('treatment_efficiency', {})
            
            if not main_equipment:
                logger.warning("⚠️ No hay equipos para generar diagrama premium")
                return self._create_fallback_diagram("No hay equipos disponibles")
            
            # ═══════════════════════════════════════════════════════════════
            # CONFIGURACIÓN PREMIUM 4K - RESOLUCIÓN PROFESIONAL MÁXIMA
            # ═══════════════════════════════════════════════════════════════
            
            # Canvas 4K con DPI profesional para impresión de alta calidad
            fig, ax = plt.subplots(figsize=(32, 24), dpi=300)  # 4K resolution con DPI industrial
            fig.patch.set_facecolor('white')
            
            # Configurar área de trabajo premium expandida
            ax.set_xlim(-2, 30)    # Canvas mucho más amplio
            ax.set_ylim(-2, 22)    # Altura profesional
            ax.axis('off')
            ax.set_facecolor('#fdfdfd')  # Fondo premium casi blanco
            
            # CONFIGURACIÓN PROFESIONAL DE RENDERIZADO
            plt.rcParams['font.size'] = 16          # Fuente base más grande para 4K
            plt.rcParams['font.weight'] = 'normal'   # Peso normal para legibilidad
            plt.rcParams['axes.linewidth'] = 2.5     # Líneas más gruesas para 4K
            plt.rcParams['patch.linewidth'] = 2.5    # Bordes más definidos
            plt.tight_layout(pad=1.5)                # Espaciado generoso para 4K
            
            # ═══════════════════════════════════════════════════════════════
            # PALETA DE COLORES PREMIUM INDUSTRIAL 4K - ESPECIFICACIÓN P&ID
            # ═══════════════════════════════════════════════════════════════
            
            premium_colors = {
                # Colores primarios P&ID profesionales
                'primary_blue': '#1e3a8a',      # Azul corporate premium
                'process_green': '#16a34a',     # Verde proceso optimizado para 4K
                'warning_orange': '#ea580c',    # Naranja alerta premium
                'danger_red': '#dc2626',        # Rojo crítico definido
                'neutral_gray': '#4b5563',      # Gris neutral elegante
                'clean_white': '#ffffff',       # Blanco puro
                'tech_purple': '#7c3aed',       # Morado técnico premium
                'water_blue': '#0ea5e9',        # Azul agua cristalino
                'sludge_brown': '#a16207',      # Marrón lodo natural
                
                # Colores adicionales para 4K premium
                'equipment_silver': '#e5e7eb',  # Plata equipos
                'pipe_gray': '#6b7280',         # Gris tuberías
                'highlight_yellow': '#fbbf24', # Amarillo destacar
                'efficiency_green': '#10b981', # Verde eficiencia
                'background_light': '#f9fafb', # Fondo claro
                'border_dark': '#374151',      # Borde oscuro
                'text_premium': '#111827'      # Texto premium
            }
            
            # ========================================
            # ANÁLISIS SEMÁNTICO INTELIGENTE  
            # ========================================
            
            # Clasificar y ordenar equipos usando análisis semántico del agente
            classified_equipment = []
            
            for eq in main_equipment:
                # Usar análisis semántico directo del agente
                criticality = eq.get('criticality', 'medium').lower()
                stage = eq.get('stage', 'secondary').lower()
                risk_factor = eq.get('risk_factor', 'medium').lower()
                complexity = eq.get('complexity', 'moderate').lower()
                
                # Mapear análisis a propiedades visuales premium
                visual_props = self._get_premium_visual_properties(eq, premium_colors)
                
                classified_equipment.append({
                    **eq,
                    **visual_props,
                    'stage_order': {'primary': 1, 'secondary': 2, 'tertiary': 3, 'auxiliary': 4}.get(stage, 2),
                    'criticality_order': {'high': 1, 'medium': 2, 'low': 3}.get(criticality, 2)
                })
            
            # Ordenar por secuencia real del proceso (como Mermaid)
            classified_equipment.sort(key=lambda x: (x['stage_order'], x['criticality_order']))
            
            logger.info(f"🧠 Equipos clasificados con análisis semántico: {len(classified_equipment)}")
            
            # ========================================
            # HEADER PREMIUM CORPORATIVO
            # ========================================
            
            avg_efficiency = sum(efficiencies.values()) / len(efficiencies) if efficiencies else 95
            total_power = sum([eq.get('power_consumption_kw', 0) for eq in classified_equipment])
            
            # ═══════════════════════════════════════════════════════════════
            # HEADER CORPORATIVO PREMIUM 4K - DISEÑO PROFESIONAL INDUSTRIAL
            # ═══════════════════════════════════════════════════════════════
            
            # Marco corporativo premium con gradiente sutil
            header_bg = Rectangle((-1.5, 18.5), 31, 3,
                                facecolor=premium_colors['background_light'],
                                edgecolor=premium_colors['primary_blue'],
                                linewidth=4, alpha=0.95)
            ax.add_patch(header_bg)
            
            # Título corporativo 4K con tipografía premium
            ax.text(14, 20.3, 'H₂O ALLEGIANT', 
                   fontsize=42, fontweight='bold', ha='center', va='center',
                   color=premium_colors['primary_blue'],
                   bbox=dict(boxstyle="round,pad=0.3", facecolor='white', alpha=0.8))
            
            ax.text(14, 19.5, 'PLANTA DE TRATAMIENTO DE AGUA RESIDUAL - DISEÑO P&ID PROFESIONAL', 
                   fontsize=22, ha='center', va='center',
                   color=premium_colors['text_premium'],
                   style='italic')
            
            # Panel de métricas clave 4K con diseño profesional
            metrics_text = f"CAPACIDAD: {flow_rate:,.0f} m³/día  •  POTENCIA: {total_power:.1f} kW  •  EFICIENCIA: {avg_efficiency:.1f}%  •  EQUIPOS: {len(classified_equipment)}"
            ax.text(14, 18.9, metrics_text,
                   fontsize=18, ha='center', va='center', 
                   color=premium_colors['tech_purple'], fontweight='bold')
            
            # Líneas decorativas premium para encuadre 4K
            ax.plot([-1, 29], [18.2, 18.2], color=premium_colors['primary_blue'], 
                   linewidth=4, alpha=0.9)
            ax.plot([-1, 29], [17.8, 17.8], color=premium_colors['process_green'], 
                   linewidth=2, alpha=0.7)
            
            # ========================================
            # LAYOUT PREMIUM ADAPTATIVO
            # ========================================
            
            
            num_equipos = len(classified_equipment)
            
            if num_equipos <= 4:
                # Layout horizontal para pocos equipos
                equipment_positions = self._calculate_horizontal_layout(num_equipos)
            else:
                # Layout en múltiples filas para muchos equipos
                equipment_positions = self._calculate_multi_row_layout(num_equipos)
            
            # ========================================
            # NODO DE ENTRADA PREMIUM - Mejor integración visual
            # ========================================
            
            # ═══════════════════════════════════════════════════════════════
            # NODO DE ENTRADA PREMIUM 4K - ESPECIFICACIÓN INDUSTRIAL P&ID
            # ═══════════════════════════════════════════════════════════════
            
            # Nodo de entrada con diseño P&ID profesional 4K
            inlet_main = FancyBboxPatch((1, 9.0), 5.0, 3.5,  # Mucho más grande para 4K
                                      boxstyle="round,pad=0.4",
                                      facecolor=premium_colors['water_blue'],
                                      edgecolor=premium_colors['primary_blue'],
                                      linewidth=5,  # Línea muy gruesa para 4K
                                      alpha=0.95)
            ax.add_patch(inlet_main)
            
            # Sombra sutil para profundidad 4K
            inlet_shadow = FancyBboxPatch((1.2, 8.8), 5.0, 3.5,
                                        boxstyle="round,pad=0.4",
                                        facecolor=premium_colors['neutral_gray'],
                                        alpha=0.2, zorder=0)
            ax.add_patch(inlet_shadow)
            
            # Símbolo P&ID profesional dentro del nodo
            inlet_symbol = Circle((3.5, 10.75), 0.6, 
                                facecolor='white', edgecolor=premium_colors['primary_blue'],
                                linewidth=3, alpha=0.9)
            ax.add_patch(inlet_symbol)
            
            # Texto 4K con jerarquía profesional
            ax.text(3.5, 11.5, 'AGUA CRUDA', 
                   fontsize=20, fontweight='bold', ha='center', va='center', 
                   color='white')
            ax.text(3.5, 10.75, 'IN', 
                   fontsize=16, fontweight='bold', ha='center', va='center',
                   color=premium_colors['primary_blue'])
            ax.text(3.5, 10.0, f'{flow_rate:,.0f} m³/día', 
                   fontsize=18, fontweight='bold', ha='center', va='center', 
                   color='white')
            ax.text(3.5, 9.5, 'ALIMENTACIÓN', 
                   fontsize=14, ha='center', va='center', 
                   color='white', style='italic')
            
            # ========================================
            # GENERACIÓN DE EQUIPOS CON ANÁLISIS SEMÁNTICO
            # ========================================
            
            previous_x = 3.2  # Posición después del nodo de entrada
            
            for i, equipment in enumerate(classified_equipment):
                pos = equipment_positions[i] if i < len(equipment_positions) else equipment_positions[-1]
                x_pos = previous_x + pos['x_offset']
                y_pos = pos['y'] 
                
                # Obtener propiedades del análisis semántico
                eq_color = equipment.get('color', premium_colors['neutral_gray'])
                eq_shape = equipment.get('shape', 'rect')
                eq_symbol = equipment.get('industrial_symbol', '■')
                
                # DISEÑO DE EQUIPO BASADO EN ANÁLISIS SEMÁNTICO
                self._draw_premium_equipment_node(
                    ax, equipment, x_pos, y_pos, eq_color, eq_shape, premium_colors
                )
                
                # CONEXIONES 4K COORDINADAS CON NODOS DE ENTRADA/SALIDA
                if i == 0:
                    # Primera conexión desde nodo de entrada 4K
                    inlet_right_x = 6.0  # Borde derecho del nodo de entrada 4K
                    inlet_center_y = 10.75  # Centro del nodo de entrada
                    self._draw_premium_connection(ax, inlet_right_x, inlet_center_y, x_pos-1.8, y_pos, 
                                                equipment, premium_colors)
                else:
                    # Conexiones entre equipos 4K
                    prev_pos = equipment_positions[i-1] if i-1 < len(equipment_positions) else equipment_positions[-1]
                    prev_x = previous_x
                    self._draw_premium_connection(ax, prev_x+1.8, prev_pos['y'], x_pos-1.8, y_pos,
                                                equipment, premium_colors)
                
                previous_x = x_pos
            
            # ========================================
            # NODO DE SALIDA PREMIUM - Mejor integración visual
            # ========================================
            
            # Cálculo inteligente de posición para balance visual
            final_x = previous_x + 2.5  # Mayor separación para mejor flujo visual
            quality_status = "EXCELENTE" if avg_efficiency >= 95 else "BUENA" if avg_efficiency >= 85 else "ACEPTABLE"
            quality_color = premium_colors['process_green'] if avg_efficiency >= 90 else premium_colors['warning_orange']
            
            # ═══════════════════════════════════════════════════════════════
            # NODO DE SALIDA PREMIUM 4K - ESPECIFICACIÓN INDUSTRIAL P&ID
            # ═══════════════════════════════════════════════════════════════
            
            # Nodo de salida con diseño P&ID profesional 4K simétrico
            outlet_main = FancyBboxPatch((final_x, 9.0), 5.0, 3.5,  # Mismas dimensiones 4K
                                       boxstyle="round,pad=0.4",
                                       facecolor=quality_color,
                                       edgecolor=premium_colors['primary_blue'],
                                       linewidth=5,  # Mismo grosor 4K
                                       alpha=0.95)
            ax.add_patch(outlet_main)
            
            # Sombra simétrica para profundidad 4K
            outlet_shadow = FancyBboxPatch((final_x + 0.2, 8.8), 5.0, 3.5,
                                         boxstyle="round,pad=0.4",
                                         facecolor=premium_colors['neutral_gray'],
                                         alpha=0.2, zorder=0)
            ax.add_patch(outlet_shadow)
            
            # Símbolo P&ID profesional de salida
            outlet_center_x = final_x + 2.5
            outlet_symbol = Circle((outlet_center_x, 10.75), 0.6, 
                                 facecolor='white', edgecolor=premium_colors['primary_blue'],
                                 linewidth=3, alpha=0.9)
            ax.add_patch(outlet_symbol)
            
            # Texto 4K con calidad premium
            ax.text(outlet_center_x, 11.5, 'EFLUENTE TRATADO', 
                   fontsize=20, fontweight='bold', ha='center', va='center', 
                   color='white')
            ax.text(outlet_center_x, 10.75, 'OUT', 
                   fontsize=16, fontweight='bold', ha='center', va='center',
                   color=premium_colors['primary_blue'])
            ax.text(outlet_center_x, 10.0, f'{quality_status}: {avg_efficiency:.1f}%', 
                   fontsize=18, fontweight='bold', ha='center', va='center', 
                   color='white')
            ax.text(outlet_center_x, 9.5, f'{flow_rate:,.0f} m³/día', 
                   fontsize=14, ha='center', va='center', 
                   color='white', style='italic')
            
            # Conexión final 4K coordinada con nodo de salida
            last_pos = equipment_positions[-1] if equipment_positions else {'y': 12.0}
            outlet_left_x = final_x  # Borde izquierdo del nodo de salida
            outlet_center_y = 10.75  # Centro del nodo de salida 4K
            self._draw_premium_connection(ax, previous_x+1.8, last_pos['y'], outlet_left_x, outlet_center_y,
                                        {'type': 'EFLUENTE_FINAL', 'criticality': 'high'}, premium_colors)
            
            # ========================================
            # PANEL DE EFICIENCIAS PREMIUM
            # ========================================
            
            if efficiencies:
                self._draw_premium_efficiency_panel(ax, efficiencies, premium_colors)
            
            # ========================================
            # PANEL DE ESPECIFICACIONES TÉCNICAS
            # ========================================
            
            self._draw_premium_tech_panel(ax, classified_equipment, premium_colors)
            
            # ========================================
            # FOOTER PROFESIONAL
            # ========================================
            
            ax.text(10, 0.8, 'Diagrama P&ID Generado por IA - H₂O Allegiant Professional Engineering', 
                   fontsize=11, ha='center', va='center', 
                   color=premium_colors['neutral_gray'], style='italic')
            ax.text(10, 0.4, f'Análisis Semántico: {len([e for e in classified_equipment if e.get("criticality") == "high"])} Equipos Críticos | Complejidad del Sistema: {"Alta" if num_equipos > 6 else "Media" if num_equipos > 3 else "Básica"}', 
                   fontsize=10, ha='center', va='center', color=premium_colors['neutral_gray'])
            
            # ========================================
            # GUARDAR IMAGEN PREMIUM
            # ========================================
            
            buf = BytesIO()
            plt.savefig(buf, format='png', dpi=400, bbox_inches='tight',  # DPI premium
                       facecolor='white', edgecolor='none', 
                       pad_inches=0.2)  # Padding profesional
            buf.seek(0)
            
            image_data = buf.read()
            base64_image = base64.b64encode(image_data).decode('utf-8')
            
            plt.close()
            buf.close()
            
            logger.info("✅ Diagrama P&ID PREMIUM matplotlib generado exitosamente")
            logger.info(f"📊 Análisis aplicado: {len(classified_equipment)} equipos con propiedades semánticas")
            return base64_image
            
        except Exception as e:
            logger.error(f"❌ Error en matplotlib fallback: {e}")
            return self._create_fallback_diagram(f"Error en fallback premium: {str(e)}")
    
    # ════════════════════════════════════════════════════════════════════════════════════════════
    # MÉTODOS AUXILIARES PARA MATPLOTLIB PREMIUM FALLBACK
    # ════════════════════════════════════════════════════════════════════════════════════════════
    
    def _get_premium_visual_properties(self, equipment: Dict, colors: Dict) -> Dict:
        """Obtiene propiedades visuales premium basadas en análisis semántico"""
        criticality = equipment.get('criticality', 'medium').lower()
        stage = equipment.get('stage', 'secondary').lower()
        risk_factor = equipment.get('risk_factor', 'medium').lower()
        complexity = equipment.get('complexity', 'moderate').lower()
        
        # Mapear análisis semántico a propiedades visuales
        color_mapping = {
            'high': colors['danger_red'],
            'medium': colors['process_green'],
            'low': colors['neutral_gray']
        }
        
        shape_mapping = {
            'complex': 'hexagon',
            'moderate': 'stadium', 
            'simple': 'round-rect'
        }
        
        # Símbolos industriales por stage
        symbol_mapping = {
            'primary': '⚡',
            'secondary': '🔄', 
            'tertiary': '💧',
            'auxiliary': '⚙️'
        }
        
        return {
            'color': color_mapping.get(criticality, colors['process_green']),
            'shape': shape_mapping.get(complexity, 'rectangle'),
            'industrial_symbol': symbol_mapping.get(stage, '■')
        }
    
    def _calculate_horizontal_layout(self, num_equipos: int) -> List[Dict]:
        """Calcula layout horizontal optimizado para canvas 4K premium"""
        positions = []
        
        # SISTEMA DE ESPACIADO 4K - ADAPTADO PARA CANVAS 30x22
        # Espaciado proporcional al canvas 4K mucho más grande
        available_width = 20  # Ancho disponible en canvas 4K (desde x=7 hasta x=27)
        base_y = 12.0  # Altura central optimizada para 4K
        
        if num_equipos == 1:
            spacing = 0
            start_x = 15  # Centrar en canvas 4K
        elif num_equipos == 2:
            spacing = 10.0  # Mayor separación para 4K
            start_x = 10.0
        elif num_equipos == 3:
            spacing = 8.0
            start_x = 9.0
        elif num_equipos <= 5:
            spacing = 6.0
            start_x = 8.0
        else:
            # Distribución uniforme para muchos equipos en 4K
            spacing = available_width / max(1, num_equipos - 1)
            start_x = 7.0
        
        # Calcular posiciones 4K con información extendida
        for i in range(num_equipos):
            positions.append({
                'x_offset': start_x + i * spacing,
                'y': base_y,  # Altura central 4K
                'spacing': spacing,
                'index': i,
                'is_first': i == 0,
                'is_last': i == (num_equipos - 1),
                'canvas_width': 30,  # Canvas 4K width
                'canvas_height': 22  # Canvas 4K height
            })
        return positions
    
    def _calculate_multi_row_layout(self, num_equipos: int) -> List[Dict]:
        """Calcula layout multi-fila optimizado para canvas 4K premium"""
        positions = []
        
        # SISTEMA DE LAYOUT MULTI-FILA 4K PREMIUM
        # Configuración adaptada para canvas 30x22
        if num_equipos <= 8:
            equipos_per_row = 4
            row_spacing = 4.5  # Espaciado vertical 4K
            col_spacing = 6.0  # Espaciado horizontal 4K
        elif num_equipos <= 12:
            equipos_per_row = 5
            row_spacing = 4.0
            col_spacing = 5.0
        else:
            equipos_per_row = 6
            row_spacing = 3.5
            col_spacing = 4.0
        
        total_rows = (num_equipos + equipos_per_row - 1) // equipos_per_row
        start_y = 15.0  # Posición inicial más alta para 4K
        canvas_width = 30  # Ancho canvas 4K
        
        for i in range(num_equipos):
            row = i // equipos_per_row
            col = i % equipos_per_row
            
            # CENTRADO DINÁMICO 4K POR FILA
            equipos_in_row = min(equipos_per_row, num_equipos - row * equipos_per_row)
            row_width = (equipos_in_row - 1) * col_spacing
            start_x = (canvas_width - row_width) / 2  # Centrar en canvas 4K
            
            positions.append({
                'x_offset': start_x + col * col_spacing,
                'y': start_y - row * row_spacing,
                'row': row,
                'col': col,
                'equipos_in_row': equipos_in_row,
                'is_first_in_row': col == 0,
                'is_last_in_row': col == (equipos_in_row - 1),
                'total_rows': total_rows,
                'canvas_4k': True  # Marcador 4K
            })
        return positions
    
    def _draw_premium_equipment_node(self, ax, equipment: Dict, x: float, y: float, 
                                   color: str, shape: str, colors: Dict):
        """Dibuja nodo de equipo premium con integración visual mejorada - OPTIMIZADO"""

        import numpy as np
        
        # ════════════════════════════════════════════════════════════════
        # SISTEMA DE DIMENSIONADO PREMIUM 4K - EQUIPOS P&ID PROFESIONALES
        # ════════════════════════════════════════════════════════════════
        
        criticality = equipment.get('criticality', 'medium')
        complexity = equipment.get('complexity', 'moderate')
        stage = equipment.get('stage', 'secondary')
        
        # Dimensiones base 4K (mucho más grandes)
        base_width = 3.5   # Ancho base 4K
        base_height = 2.5  # Altura base 4K
        
        # Factores de tamaño por criticality (4K)
        if criticality == 'high':
            size_factor = 1.4  # Equipos críticos más grandes en 4K
        elif criticality == 'medium':
            size_factor = 1.2
        else:
            size_factor = 1.0
        
        # Ajuste por complejidad (4K)
        if complexity == 'complex':
            size_factor *= 1.15
        elif complexity == 'simple':
            size_factor *= 0.95
        
        # Ajuste por stage para mejor diferenciación visual 4K
        stage_factors = {
            'primary': 1.1,    # Pretratamiento ligeramente más grande
            'secondary': 1.2,  # Tratamiento principal más prominente
            'tertiary': 1.0,   # Tratamiento terciario estándar
            'auxiliary': 0.85  # Auxiliares más pequeños
        }
        size_factor *= stage_factors.get(stage, 1.0)
        
        # Dimensiones finales 4K
        width = base_width * size_factor
        height = base_height * size_factor
        
        # ════════════════════════════════════════════════════════════════
        # FORMAS P&ID PROFESIONALES 4K - SÍMBOLOS INDUSTRIALES ESTÁNDAR  
        # ════════════════════════════════════════════════════════════════
        
        # Bordes profesionales 4K
        border_width = 4 if criticality == 'high' else 3
        
        # Sombra sutil para profundidad 4K
        shadow_offset = 0.15
        shadow = FancyBboxPatch((x-width/2+shadow_offset, y-height/2-shadow_offset), 
                              width, height,
                              boxstyle="round,pad=0.2",
                              facecolor='gray', alpha=0.2, zorder=0)
        ax.add_patch(shadow)
        
        if shape == 'hexagon':
            # Hexágono P&ID para equipos complejos 4K
            hex_points = np.array([
                [x-width/2, y], [x-width/4, y+height/2], [x+width/4, y+height/2],
                [x+width/2, y], [x+width/4, y-height/2], [x-width/4, y-height/2]
            ])
            hex_patch = Polygon(hex_points, facecolor=color, edgecolor='black', 
                              linewidth=border_width, alpha=0.9)
            ax.add_patch(hex_patch)
        elif shape == 'circle':
            # Círculo P&ID para equipos simples 4K
            circle = Circle((x, y), width/2, facecolor=color, edgecolor='black', 
                          linewidth=border_width, alpha=0.9)
            ax.add_patch(circle)
        else:
            # Rectángulo P&ID estándar 4K con bordes profesionales
            rect = FancyBboxPatch((x-width/2, y-height/2), width, height,
                                boxstyle="round,pad=0.2",
                                facecolor=color, edgecolor='black', 
                                linewidth=border_width, alpha=0.9)
            ax.add_patch(rect)
        
        # ════════════════════════════════════════════════════════════════
        # INFORMACIÓN TÉCNICA RICA 4K - ESPECIFICACIONES PROFESIONALES
        # ════════════════════════════════════════════════════════════════
        
        eq_type = equipment.get('type', 'EQUIPO').upper()
        capacity = equipment.get('capacity_m3_day') or 0
        power = equipment.get('power_consumption_kw') or 0
        capex = equipment.get('capex_usd', 0)
        
        # Construir información técnica rica 4K
        text_lines = []
        
        # Línea 1: Tipo de equipo (tamaño grande)
        text_lines.append(eq_type)
        
        # Línea 2: Capacidad (si disponible)
        if capacity > 0:
            text_lines.append(f"📊 {capacity:,.0f} m³/día")
        
        # Línea 3: Potencia (si disponible)  
        if power > 0:
            text_lines.append(f"⚡ {power:.1f} kW")
        
        # Línea 4: Costo (si disponible)
        if capex > 0:
            text_lines.append(f"💰 ${capex:,.0f}")
        
        # Línea 5: Indicador de criticidad
        if criticality == 'high':
            text_lines.append("🔴 CRÍTICO")
        elif criticality == 'medium':
            text_lines.append("🟡 IMPORTANTE")
        
        # Renderizar texto 4K con tipografía profesional
        text_content = '\n'.join(text_lines)
        
        # Tamaños de fuente 4K proporcionales
        if len(text_lines) <= 2:
            fontsize = 18  # Fuente grande para pocos datos
        elif len(text_lines) <= 4:
            fontsize = 16  # Fuente media para datos moderados
        else:
            fontsize = 14  # Fuente estándar para muchos datos
        
        # Texto con sombra sutil para legibilidad 4K
        ax.text(x+0.05, y-0.05, text_content, fontsize=fontsize, fontweight='bold',
               ha='center', va='center', color='black', alpha=0.3)  # Sombra
        ax.text(x, y, text_content, fontsize=fontsize, fontweight='bold',
               ha='center', va='center', color='white', 
               linespacing=1.3)  # Texto principal con espaciado
    
    def _draw_premium_connection(self, ax, x1: float, y1: float, x2: float, y2: float,
                               equipment: Dict, colors: Dict):
        """Dibuja conexión premium entre nodos con integración visual mejorada"""
        import numpy as np
        
        # Determinar propiedades de conexión
        criticality = equipment.get('criticality', 'medium')
        stage = equipment.get('stage', 'secondary')
        
        # ════════════════════════════════════════════════════════════════
        # SISTEMA DE CONEXIONES PREMIUM 4K - TUBERÍAS P&ID PROFESIONALES
        # ════════════════════════════════════════════════════════════════
        
        # Propiedades de línea 4K según criticality y stage
        if criticality == 'high':
            line_color = '#dc2626'  # Rojo crítico
            linewidth = 5          # Línea muy gruesa para 4K
            linestyle = '-'
            alpha = 0.95
            pipe_pattern = 'solid'
        elif criticality == 'medium':
            line_color = '#059669'  # Verde proceso
            linewidth = 4
            linestyle = '-'
            alpha = 0.9
            pipe_pattern = 'solid'
        else:
            line_color = '#6b7280'  # Gris auxiliar
            linewidth = 3
            linestyle = '--'        # Punteado para auxiliares
            alpha = 0.8
            pipe_pattern = 'dashed'
        
        # Calcular geometría de conexión 4K inteligente
        dx = x2 - x1
        dy = y2 - y1
        length = np.sqrt(dx**2 + dy**2) if (dx**2 + dy**2) > 0 else 1
        
        if length > 0:
            # Normalizar vector de dirección
            dx_norm = dx / length
            dy_norm = dy / length
            
            # Offset 4K para evitar solapamiento con nodos grandes
            node_offset = 1.8  # Mayor offset para equipos 4K más grandes
            x1_adj = x1 + node_offset * dx_norm
            y1_adj = y1 + node_offset * dy_norm
            x2_adj = x2 - node_offset * dx_norm
            y2_adj = y2 - node_offset * dy_norm
            
            # TUBERÍA P&ID PREMIUM CON SOMBRA 4K
            # Sombra de tubería para profundidad
            ax.plot([x1_adj+0.1, x2_adj+0.1], [y1_adj-0.1, y2_adj-0.1], 
                   color='black', linewidth=linewidth+1, linestyle=linestyle,
                   alpha=0.2)
            
            # Tubería principal 4K
            ax.plot([x1_adj, x2_adj], [y1_adj, y2_adj], 
                   color=line_color, linewidth=linewidth, linestyle=linestyle,
                   alpha=alpha)
            
            # FLECHA P&ID PROFESIONAL 4K
            arrow_size = 0.4  # Flecha más grande para 4K
            arrow_props = dict(
                arrowstyle='->', 
                color=line_color, 
                lw=linewidth,
                alpha=alpha,
                mutation_scale=25  # Tamaño de flecha 4K
            )
            ax.annotate('', xy=(x2_adj, y2_adj), xytext=(x1_adj, y1_adj),
                       arrowprops=arrow_props)
            
            # ETIQUETA DE FLUJO 4K (opcional para líneas principales)
            if criticality in ['high', 'medium'] and length > 3:
                mid_x = (x1_adj + x2_adj) / 2
                mid_y = (y1_adj + y2_adj) / 2
                
                # Etiqueta pequeña de flujo
                flow_label = "➤ FLUJO"
                ax.text(mid_x, mid_y + 0.3, flow_label,
                       fontsize=10, ha='center', va='bottom',
                       color=line_color, fontweight='bold',
                       bbox=dict(boxstyle="round,pad=0.2", 
                               facecolor='white', alpha=0.8))
    
    def _draw_premium_efficiency_panel(self, ax, efficiencies: Dict, colors: Dict):
        """Dibuja panel de eficiencias premium con integración visual mejorada"""
        
        
        # ════════════════════════════════════════════════════════════════
        # PANEL DE EFICIENCIAS PREMIUM 4K - ESPECIFICACIONES P&ID
        # ════════════════════════════════════════════════════════════════
        
        # Posicionamiento 4K optimizado para canvas 30x22
        panel_x, panel_y = 2, 3.5      # Posición inferior izquierda 4K
        panel_width, panel_height = 6, 5  # Dimensiones 4K generosas
        
        # Fondo premium con gradiente sutil 4K
        panel_bg = Rectangle((panel_x, panel_y), panel_width, panel_height,
                           facecolor='#f8fafc', edgecolor=colors['primary_blue'],
                           linewidth=4, alpha=0.95)  # Borde más grueso 4K
        ax.add_patch(panel_bg)
        
        # Sombra del panel para profundidad 4K
        panel_shadow = Rectangle((panel_x+0.1, panel_y-0.1), panel_width, panel_height,
                               facecolor='gray', alpha=0.2, zorder=0)
        ax.add_patch(panel_shadow)
        
        # Header del panel con diseño profesional 4K
        header_bg = Rectangle((panel_x, panel_y + panel_height - 1), panel_width, 1,
                            facecolor=colors['primary_blue'], alpha=0.9)
        ax.add_patch(header_bg)
        
        # Título del panel 4K con tipografía premium
        ax.text(panel_x + panel_width/2, panel_y + panel_height - 0.5,
               'EFICIENCIAS DE REMOCIÓN',
               fontsize=18, fontweight='bold', ha='center', va='center',
               color='white')
        
        # Lista de eficiencias 4K con diseño profesional
        y_offset = 0.7  # Mayor espaciado 4K
        params_shown = 0
        
        for i, (param, value) in enumerate(efficiencies.items()):
            if params_shown >= 5:  # Máximo 5 parámetros en 4K
                break
                
            y_pos = panel_y + panel_height - 1.5 - params_shown * y_offset
            
            # Color y status según eficiencia
            if value >= 95:
                param_color = colors['efficiency_green']
                status_emoji = "🟢"
                status = "EXCELENTE"
            elif value >= 85:
                param_color = colors['process_green']
                status_emoji = "🟡" 
                status = "BUENA"
            elif value >= 75:
                param_color = colors['warning_orange']
                status_emoji = "🟠"
                status = "REGULAR"
            else:
                param_color = colors['danger_red']
                status_emoji = "🔴"
                status = "MEJORABLE"
            
            # Parámetro con emoji indicador 4K
            ax.text(panel_x + 0.3, y_pos, f"{status_emoji} {param.upper()}:",
                   fontsize=14, ha='left', va='center', color='black',
                   fontweight='bold')
            
            # Valor con formato premium 4K
            ax.text(panel_x + panel_width - 0.3, y_pos, f"{value:.1f}%",
                   fontsize=16, fontweight='bold', ha='right', va='center',
                   color=param_color)
            
            # Status indicator pequeño 4K
            ax.text(panel_x + panel_width - 0.3, y_pos - 0.2, status,
                   fontsize=10, ha='right', va='center',
                   color=param_color, style='italic')
            
            params_shown += 1
    
    def _draw_premium_tech_panel(self, ax, equipment_list: List[Dict], colors: Dict):
        """Dibuja panel de especificaciones técnicas premium con integración visual mejorada"""
        
        
        # ════════════════════════════════════════════════════════════════
        # PANEL TÉCNICO PREMIUM 4K - ESPECIFICACIONES P&ID INDUSTRIALES
        # ════════════════════════════════════════════════════════════════
        
        # Posicionamiento 4K simétrico (lado derecho)
        panel_x, panel_y = 22, 3.5      # Lado derecho canvas 4K
        panel_width, panel_height = 6, 5   # Mismas dimensiones que panel eficiencias
        
        # Fondo premium con diseño consistente 4K
        panel_bg = Rectangle((panel_x, panel_y), panel_width, panel_height,
                           facecolor='#f0f9ff', edgecolor=colors['tech_purple'],
                           linewidth=4, alpha=0.95)  # Consistente con panel eficiencias
        ax.add_patch(panel_bg)
        
        # Sombra consistente 4K
        panel_shadow = Rectangle((panel_x+0.1, panel_y-0.1), panel_width, panel_height,
                               facecolor='gray', alpha=0.2, zorder=0)
        ax.add_patch(panel_shadow)
        
        # Header consistente con panel de eficiencias 4K
        header_bg = Rectangle((panel_x, panel_y + panel_height - 1), panel_width, 1,
                            facecolor=colors['tech_purple'], alpha=0.9)
        ax.add_patch(header_bg)
        
        # Título 4K premium
        ax.text(panel_x + panel_width/2, panel_y + panel_height - 0.5,
               'ESPECIFICACIONES TÉCNICAS',
               fontsize=18, fontweight='bold', ha='center', va='center',
               color='white')
        
        # Calcular métricas avanzadas 4K
        total_capex = sum([eq.get('capex_usd', 0) for eq in equipment_list])
        total_power = sum([eq.get('power_consumption_kw') or 0 for eq in equipment_list])
        total_capacity = sum([eq.get('capacity_m3_day') or 0 for eq in equipment_list])
        critical_count = len([eq for eq in equipment_list if eq.get('criticality') == 'high'])
        complex_count = len([eq for eq in equipment_list if eq.get('complexity') == 'complex'])
        
        # Métricas premium 4K con iconos
        metrics_4k = [
            ("🏭", f"Total Equipos: {len(equipment_list)}", 'black'),
            ("🔴", f"Equipos Críticos: {critical_count}", colors['danger_red']),
            ("⚡", f"Potencia Total: {total_power:.1f} kW", colors['warning_orange']),
            ("📊", f"Capacidad: {total_capacity:,.0f} m³/día", colors['water_blue']),
            ("💰", f"CAPEX: ${total_capex:,.0f}", colors['process_green']),
            ("⚙️", f"Equipos Complejos: {complex_count}", colors['tech_purple'])
        ]
        
        # Renderizar métricas 4K con espaciado profesional
        y_offset = 0.6  # Espaciado consistente con panel eficiencias
        for i, (emoji, metric_text, color) in enumerate(metrics_4k):
            if i >= 5:  # Máximo 5 métricas para balance visual
                break
                
            y_pos = panel_y + panel_height - 1.5 - i * y_offset
            
            # Métrica con emoji y color 4K
            ax.text(panel_x + 0.3, y_pos, f"{emoji} {metric_text}",
                   fontsize=14, ha='left', va='center', color=color,
                   fontweight='bold')

    def _create_financial_chart_plotly(self, agent_data: Dict[str, Any]) -> str:
        """
        Genera gráfico financiero ejecutivo premium con Plotly usando datos reales del agente
        Incluye cash flow con punto de recuperación
        """
        logger.info(f"📊 Datos del agente recibidos: {list(agent_data.keys())}")
        
        capex = agent_data.get('capex_usd', 0)
        annual_opex = agent_data.get('annual_opex_usd', 0)
        
        capex_breakdown = agent_data.get('capex_breakdown', {})
        opex_breakdown = agent_data.get('opex_breakdown', {})
        
        payback_years = agent_data.get('payback_years', None)
        roi_percent = agent_data.get('roi_percent', None)
        annual_savings = agent_data.get('annual_savings_usd', None)
        
        logger.info(f"💰 Datos financieros extraídos:")
        logger.info(f"  - CAPEX: ${capex:,.0f}")
        logger.info(f"  - OPEX anual: ${annual_opex:,.0f}")
        logger.info(f"  - Desglose CAPEX: {list(capex_breakdown.keys()) if capex_breakdown else 'No disponible'}")
        logger.info(f"  - Desglose OPEX: {list(opex_breakdown.keys()) if opex_breakdown else 'No disponible'}")
        logger.info(f"  - ROI: {roi_percent}%")
        logger.info(f"  - Payback: {payback_years} años")
        logger.info(f"  - Ahorros anuales: ${annual_savings:,.0f}" if annual_savings else "  - Ahorros anuales: No disponible")
        
        if not capex or not annual_opex:
            logger.error("❌ Datos financieros básicos insuficientes")
            return self._create_error_message("Datos financieros insuficientes del agente")
        
        try:
            # Crear subplots PREMIUM con layout ejecutivo
            fig = make_subplots(
                rows=2, cols=2,
                subplot_titles=[
                    '<b>Inversión vs Operación</b><br><span style="font-size:10px; color:#4b5563;">Distribución financiera a 5 años</span>', 
                    '<b>Desglose CAPEX</b><br><span style="font-size:10px; color:#4b5563;">Inversión inicial detallada</span>', 
                    '<b>Desglose OPEX</b><br><span style="font-size:10px; color:#4b5563;">Costos operacionales anuales</span>',
                    '<b>Cash Flow Premium</b><br><span style="font-size:10px; color:#4b5563;">Análisis de recuperación</span>'
                ],
                specs=[[{"type": "pie"}, {"type": "bar"}],
                       [{"type": "bar"}, {"type": "scatter"}]],
                vertical_spacing=self.plotly_config.LAYOUT['spacing'],
                horizontal_spacing=self.plotly_config.LAYOUT['spacing']
            )
            
            # Gráfico 1: Pie chart PREMIUM de inversión vs operación
            fig.add_trace(go.Pie(
                labels=['💰 CAPEX<br>Inversión Inicial', '🔄 OPEX<br>5 años operación'],
                values=[capex, annual_opex * 5],
                hole=0.45,
                marker=dict(
                    colors=self.plotly_config.COLOR_SCHEMES['capex_opex'],
                    line=dict(color=self.plotly_config.COLORS['clean_white'], width=3)
                ),
                textfont=dict(
                    size=self.plotly_config.TYPOGRAPHY['label_size'],
                    family=self.plotly_config.TYPOGRAPHY['font_family'],
                    color=self.plotly_config.COLORS['clean_white']
                ),
                textinfo='label+percent',
                hovertemplate='<b>%{label}</b><br><span style="font-size:14px;">$%{value:,.0f}</span><br>%{percent}<extra></extra>',
                hoverlabel=dict(
                    bgcolor=self.plotly_config.COLORS['text_dark'],
                    bordercolor=self.plotly_config.COLORS['clean_white'],
                    font_size=12
                )
            ), row=1, col=1)
        
            # Gráfico 2: Desglose CAPEX
            if capex_breakdown:
                capex_labels = []
                capex_values = []
                for key, value in capex_breakdown.items():
                    if isinstance(value, (int, float)) and value > 0:
                        capex_labels.append(key.replace('_', ' ').title())
                        capex_values.append(value)
                
                if capex_labels:
                    fig.add_trace(go.Bar(
                        x=capex_labels,
                        y=capex_values,
                        marker=dict(
                            color=self.plotly_config.COLOR_SCHEMES['capex_breakdown'][:len(capex_labels)],
                            opacity=self.plotly_config.EFFECTS['gradient_opacity'],
                            line=dict(
                                color=self.plotly_config.COLORS['text_dark'],
                                width=1
                            )
                        ),
                        text=[f'${v:,.0f}' for v in capex_values],
                        textposition='auto',
                        textfont=dict(
                            size=self.plotly_config.TYPOGRAPHY['value_size'],
                            family=self.plotly_config.TYPOGRAPHY['font_family'],
                            color=self.plotly_config.COLORS['clean_white']
                        ),
                        hovertemplate='<b>%{x}</b><br><span style="font-size:14px;">$%{y:,.0f}</span><extra></extra>',
                        hoverlabel=dict(
                            bgcolor=self.plotly_config.COLORS['text_dark'],
                            bordercolor=self.plotly_config.COLORS['clean_white'],
                            font_size=12
                        )
                    ), row=1, col=2)
                else:
                    logger.warning("⚠️ Desglose CAPEX vacío después del filtrado")
            else:
                logger.warning("⚠️ No hay desglose CAPEX disponible")
            
            # Gráfico 3: Desglose OPEX
            if opex_breakdown:
                opex_labels = []
                opex_values = []
                for key, value in opex_breakdown.items():
                    if isinstance(value, (int, float)) and value > 0:
                        opex_labels.append(key.replace('_', ' ').title())
                        opex_values.append(value)
                
                if opex_labels:
                    fig.add_trace(go.Bar(
                        x=opex_labels,
                        y=opex_values,
                        marker=dict(
                            color=self.plotly_config.COLOR_SCHEMES['opex_breakdown'][:len(opex_labels)],
                            opacity=self.plotly_config.EFFECTS['gradient_opacity'],
                            line=dict(
                                color=self.plotly_config.COLORS['text_dark'],
                                width=1
                            )
                        ),
                        text=[f'${v:,.0f}' for v in opex_values],
                        textposition='auto',
                        textfont=dict(
                            size=self.plotly_config.TYPOGRAPHY['value_size'],
                            family=self.plotly_config.TYPOGRAPHY['font_family'],
                            color=self.plotly_config.COLORS['clean_white']
                        ),
                        hovertemplate='<b>%{x}</b><br><span style="font-size:14px;">$%{y:,.0f}/año</span><extra></extra>',
                        hoverlabel=dict(
                            bgcolor=self.plotly_config.COLORS['text_dark'],
                            bordercolor=self.plotly_config.COLORS['clean_white'],
                            font_size=12
                        )
                    ), row=2, col=1)
                else:
                    logger.warning("⚠️ Desglose OPEX vacío después del filtrado")
            else:
                logger.warning("⚠️ No hay desglose OPEX disponible")
            
            # Gráfico 4: Cash Flow PREMIUM con análisis de recuperación
            if annual_savings and annual_savings > 0:
                years = list(range(0, 11))  # 0 a 10 años
                net_annual_savings = annual_savings - annual_opex
                
                # Calcular cash flow acumulativo
                cumulative_cash_flow = []
                for year in years:
                    if year == 0:
                        cumulative_cash_flow.append(-capex)
                    else:
                        cumulative_cash_flow.append(cumulative_cash_flow[-1] + net_annual_savings)
                
                # Línea principal de cash flow con efecto premium
                colors_cash_flow = [
                    self.plotly_config.COLOR_SCHEMES['cash_flow']['negative'] if cf < 0 
                    else self.plotly_config.COLOR_SCHEMES['cash_flow']['positive'] 
                    for cf in cumulative_cash_flow
                ]
                
                fig.add_trace(go.Scatter(
                    x=years,
                    y=cumulative_cash_flow,
                    mode='lines+markers',
                    name='💰 Cash Flow Acumulativo',
                    line=dict(
                        color=self.plotly_config.COLOR_SCHEMES['cash_flow']['positive'], 
                        width=self.plotly_config.EFFECTS['line_width']
                    ),
                    marker=dict(
                        size=self.plotly_config.EFFECTS['marker_size'], 
                        color=colors_cash_flow,
                        line=dict(color=self.plotly_config.COLORS['clean_white'], width=2)
                    ),
                    fill='tonexty',
                    fillcolor=f"rgba({int(self.plotly_config.COLORS['process_green'][1:3], 16)}, {int(self.plotly_config.COLORS['process_green'][3:5], 16)}, {int(self.plotly_config.COLORS['process_green'][5:7], 16)}, 0.1)",
                    hovertemplate='<b>Año %{x}</b><br><span style="font-size:14px;">Cash Flow: $%{y:,.0f}</span><extra></extra>',
                    hoverlabel=dict(
                        bgcolor=self.plotly_config.COLORS['text_dark'],
                        bordercolor=self.plotly_config.COLORS['clean_white'],
                        font_size=12
                    )
                ), row=2, col=2)
                
                # Línea de breakeven PREMIUM
                fig.add_trace(go.Scatter(
                    x=[0, 10],
                    y=[0, 0],
                    mode='lines',
                    name='📊 Breakeven',
                    line=dict(
                        color=self.plotly_config.COLOR_SCHEMES['cash_flow']['breakeven'], 
                        width=2, 
                        dash='dash'
                    ),
                    showlegend=False,
                    hovertemplate='<b>Punto de Equilibrio</b><extra></extra>'
                ), row=2, col=2)
                
                # Marcador del punto de payback PREMIUM
                if payback_years and payback_years > 0 and payback_years <= 10:
                    payback_cash_flow = -capex + (payback_years * net_annual_savings)
                    fig.add_trace(go.Scatter(
                        x=[payback_years],
                        y=[payback_cash_flow],
                        mode='markers+text',
                        name=f'⭐ Recuperación: {payback_years:.1f} años',
                        marker=dict(
                            size=20, 
                            color=self.plotly_config.COLOR_SCHEMES['cash_flow']['breakeven'],
                            symbol='star',
                            line=dict(color=self.plotly_config.COLORS['clean_white'], width=3)
                        ),
                        text=[f'Payback<br>{payback_years:.1f}y'],
                        textposition='top center',
                        textfont=dict(
                            size=self.plotly_config.TYPOGRAPHY['annotation_size'],
                            color=self.plotly_config.COLORS['text_dark'],
                            family=self.plotly_config.TYPOGRAPHY['font_family']
                        ),
                        hovertemplate=f'<b>🎯 Punto de Recuperación</b><br>Año: {payback_years:.1f}<br><span style="font-size:14px;">Cash Flow: $%{{y:,.0f}}</span><extra></extra>'
                    ), row=2, col=2)
            else:
                # Si no hay datos de ahorros, mostrar mensaje
                fig.add_annotation(
                    x=0.5, y=0.5,
                    text="Datos de ahorros<br>no disponibles",
                    showarrow=False,
                    font=dict(size=16, color='#6b7280'),
                    row=2, col=2
                )
        
            # Layout PREMIUM ejecutivo
            fig.update_layout(
                title={
                    'text': '<b>📊 ANÁLISIS FINANCIERO EJECUTIVO PREMIUM</b><br><span style="font-size:14px; color:#4b5563;">Sistema de Tratamiento - Evaluación de Inversión Profesional</span>',
                    'x': 0.5,
                    'xanchor': 'center',
                    'font': {
                        'size': self.plotly_config.TYPOGRAPHY['title_size'] + 2,
                        'color': self.plotly_config.COLORS['text_dark'],
                        'family': self.plotly_config.TYPOGRAPHY['font_family']
                    }
                },
                font=dict(
                    family=self.plotly_config.TYPOGRAPHY['font_family'],
                    size=self.plotly_config.TYPOGRAPHY['label_size'],
                    color=self.plotly_config.COLORS['text_medium']
                ),
                paper_bgcolor=self.plotly_config.COLORS['clean_white'],
                plot_bgcolor=self.plotly_config.COLORS['background_light'],
                showlegend=True,
                legend=dict(
                    orientation="h",
                    yanchor="bottom",
                    y=-0.1,
                    xanchor="center",
                    x=0.5,
                    font=dict(size=self.plotly_config.TYPOGRAPHY['value_size'])
                ),
                height=900,
                width=1400,
                margin=self.plotly_config.LAYOUT['margin']
            )
            
            # Personalizar ejes con estilo premium
            fig.update_xaxes(
                gridcolor=self.plotly_config.COLORS['premium_gray_light'], 
                gridwidth=1,
                showgrid=True,
                tickfont=dict(size=self.plotly_config.TYPOGRAPHY['value_size']),
                titlefont=dict(size=self.plotly_config.TYPOGRAPHY['label_size'])
            )
            fig.update_yaxes(
                gridcolor=self.plotly_config.COLORS['premium_gray_light'], 
                gridwidth=1,
                showgrid=True,
                tickfont=dict(size=self.plotly_config.TYPOGRAPHY['value_size']),
                titlefont=dict(size=self.plotly_config.TYPOGRAPHY['label_size'])
            )
        
            # Formatear ejes específicos del cash flow con estilo premium
            fig.update_yaxes(
                tickformat='$,.0f', 
                row=2, col=2,
                title_text="<b>Cash Flow Acumulativo</b><br><span style='font-size:10px;'>Millones USD</span>"
            )
            fig.update_xaxes(
                title_text="<b>Período de Análisis</b><br><span style='font-size:10px;'>Años desde inversión inicial</span>", 
                row=2, col=2
            )
            
            # Formatear ejes de barras
            fig.update_yaxes(tickformat='$,.0f', row=1, col=2)
            fig.update_yaxes(tickformat='$,.0f', row=2, col=1)
            
            # Generar imagen optimizada para PDF (peso menor, legibilidad suficiente)
            img_bytes = fig.to_image(format="png", width=1100, height=700, scale=1)
            img_base64 = base64.b64encode(img_bytes).decode('utf-8')
            
            logger.info("✅ Gráfico financiero con cash flow Plotly generado exitosamente")
            return img_base64
        
        except Exception as e:
            logger.error(f"❌ Error generando gráfico financiero Plotly: {e}")
            return self._create_fallback_diagram(f"Error financiero: {str(e)}")
    
    def _generate_no_data_charts(self) -> Dict[str, str]:
        """Genera mensaje cuando no hay datos del agente"""
        return {
            'process_flow': self._create_fallback_diagram("No hay datos de equipos del agente"),
            'financial_executive': self._create_fallback_diagram("No hay datos financieros del agente")
        }
    
    def _create_error_message(self, message: str) -> str:
        """Crea mensaje de error simple sin gráfico"""
        return f"ERROR: {message}"
    
    def _create_fallback_diagram(self, message: str) -> str:
        """Crea diagrama de error simple"""
        try:
                
            fig, ax = plt.subplots(figsize=(10, 6))
            ax.set_xlim(0, 10)
            ax.set_ylim(0, 6)
            ax.axis('off')
            
            # Rectángulo de error
            error_box = Rectangle((2, 2), 6, 2, facecolor='#fef2f2', 
                                edgecolor='#dc2626', linewidth=2)
            ax.add_patch(error_box)
            
            # Texto de error
            ax.text(5, 3, f"⚠️ {message}", fontsize=14, ha='center', va='center',
                   color='#dc2626', fontweight='bold')
            
            # Guardar en memoria
            buf = BytesIO()
            plt.savefig(buf, format='png', dpi=200, bbox_inches='tight', 
                       facecolor='white', edgecolor='none')
            buf.seek(0)
            
            image_data = buf.read()
            base64_image = base64.b64encode(image_data).decode('utf-8')
            
            plt.close()
            buf.close()
            
            return base64_image
            
        except Exception as e:
            logger.error(f"❌ Error creando diagrama fallback: {e}")
            return self._create_error_message(f"Error crítico: {str(e)}")

    def generate_simple_process_diagram(self, agent_data: Dict[str, Any]) -> str:
        """
        Genera diagrama P&ID simple usando matplotlib cuando Mermaid falla
        Sistema de respaldo premium con figuras geométricas profesionales
        """
        if not SIMPLE_DIAGRAMS_AVAILABLE:
            logger.warning("⚠️ Sistema de diagramas simples no disponible")
            return self._create_fallback_diagram("Sistema de diagramas simples no disponible")
        
        try:
            logger.info("🎨 Generando diagrama P&ID simple con matplotlib...")
            
            # Extraer datos del agente
            main_equipment = agent_data.get('main_equipment', [])
            if not main_equipment:
                return self._create_fallback_diagram("No hay equipos disponibles para diagrama simple")
            
            # Preparar información del sistema
            system_info = {
                'flow_rate_m3_day': agent_data.get('flow_rate_m3_day', 0),
                'treatment_efficiency': agent_data.get('treatment_efficiency', {}),
                'client_info': agent_data.get('client_info', {}),
                'total_capex': agent_data.get('capex_usd', 0)
            }
            
            # Generar diagrama usando el sistema simple
            diagram_bytes = simple_process_diagram.generate_diagram(main_equipment, system_info)
            
            # Convertir a base64
            base64_image = base64.b64encode(diagram_bytes).decode('utf-8')
            
            logger.info("✅ Diagrama P&ID simple generado exitosamente")
            return base64_image
            
        except Exception as e:
            logger.error(f"❌ Error generando diagrama P&ID simple: {e}")
            return self._create_fallback_diagram(f"Error en diagrama simple: {str(e)}")

# Instancia global
premium_chart_generator = PremiumChartGenerator() 