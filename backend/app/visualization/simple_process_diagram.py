"""
Simple and professional P&ID diagram generator
Minimalist approach: equipment -> geometric shapes -> arrow connections
Premium results while maintaining simplicity
"""

import matplotlib.pyplot as plt
import matplotlib.patches as patches
from matplotlib.patches import FancyBboxPatch, Rectangle, Circle, Polygon, Arrow
import numpy as np
from typing import Dict, List, Tuple, Any
import logging
import io

logger = logging.getLogger("hydrous")


class PremiumVisualConfig:
    """
    Premium visual configuration for professional P&ID diagrams.
    Designed to justify premium pricing and universal adaptability.
    """
    
    # Paleta de colores corporativa premium
    COLORS = {
        # Colores base corporativos
        'primary_blue': '#1e40af',      # Azul corporativo elegante
        'secondary_blue': '#3b82f6',    # Light blue for gradients
        'process_green': '#059669',     # Professional technical green
        'process_green_light': '#10b981', # Verde claro para gradientes
        'premium_gray': '#475569',      # Gris sofisticado
        'premium_gray_light': '#64748b', # Gris claro para gradientes
        
        # Colores contextuales inteligentes
        'critical_red': '#dc2626',      # Red for critical equipment
        'critical_red_light': '#ef4444', # Rojo claro para gradientes
        'warning_orange': '#ea580c',    # Naranja para advertencias
        'warning_orange_light': '#f97316', # Naranja claro
        
        # Colores por contexto de proceso
        'water_blue': '#0ea5e9',        # Agua cruda/proceso
        'water_blue_light': '#38bdf8',  # Agua gradiente
        'treated_green': '#22c55e',     # Agua tratada
        'treated_green_light': '#4ade80', # Tratada gradiente
        'chemical_yellow': '#eab308',   # Chemicals
        'chemical_yellow_light': '#facc15', # Chemicals gradient
        'sludge_brown': '#a16207',      # Lodos/residuos
        'sludge_brown_light': '#ca8a04', # Lodos gradiente
        
        # Colores neutros premium
        'clean_white': '#ffffff',
        'premium_silver': '#e5e7eb',
        'text_dark': '#1f2937',
        'text_medium': '#4b5563',
        'background_light': '#f8fafc'
    }
    
    # Professional typography configuration
    TYPOGRAPHY = {
        'font_family': 'Arial',
        'title_size': 14,
        'equipment_size': 10,
        'spec_size': 8,
        'label_size': 7,
        'line_height': 1.2,
        'letter_spacing': 0.5
    }
    
    # Efectos premium
    EFFECTS = {
        'shadow_offset': (2, 2),
        'shadow_blur': 4,
        'shadow_alpha': 0.15,
        'gradient_alpha': 0.9,
        'border_width': 2,
        'corner_radius': 4
    }
    
    # Mathematical spacing (golden ratio)
    SPACING = {
        'golden_ratio': 1.618,
        'base_equipment_size': 80,
        'base_spacing': 200,
        'vertical_offset': 30,
        'padding': 20
    }


class SimpleProcessDiagram:
    """
    Generador premium de diagramas P&ID profesionales.
    Premium minimalista: Sofisticado visualmente, simple técnicamente.
    Adaptabilidad universal: Funciona para cualquier sector industrial.
    """
    
    def __init__(self):
        self.config = PremiumVisualConfig()
        self.colors = self.config.COLORS
        
        # Premium layout configuration with golden ratio
        self.equipment_spacing = self.config.SPACING['base_spacing']
        self.line_height = 100       
        self.equipment_size = self.config.SPACING['base_equipment_size']
        
        logger.info("🎨 SimpleProcessDiagram Premium initialized - Corporate visual sophistication")


    def _apply_premium_shadow(self, patch, equipment_type: str = 'standard'):
        """
        Applies professional premium shadow to patches.
        Only on main equipment to maintain elegance.
        """
        # Apply subtle shadow using zorder and alpha
        if equipment_type in ['critical', 'primary']:
            patch.set_zorder(5)  # Bring to front
        else:
            patch.set_zorder(3)
        
        # Alpha for depth
        patch.set_alpha(self.config.EFFECTS['gradient_alpha'])
        
        return patch

    def _get_contextual_colors(self, equipment: Dict) -> Tuple[str, str]:
        """
        Gets automatic premium colors based on equipment context.
        Universal adaptability for any sector.
        """
        eq_type = equipment.get('type', '').lower()
        criticality = equipment.get('criticality', 'medium').lower()
        
        # Intelligent detection by universal keywords
        if 'bio' in eq_type or 'reactor' in eq_type:
            if criticality == 'high':
                return self.colors['process_green'], self.colors['process_green_light']
            return self.colors['secondary_blue'], self.colors['water_blue_light']
        
        elif 'chemical' in eq_type or 'dosing' in eq_type:
            return self.colors['chemical_yellow'], self.colors['chemical_yellow_light']
        
        elif 'filter' in eq_type or 'purif' in eq_type:
            return self.colors['water_blue'], self.colors['water_blue_light']
        
        elif 'sludge' in eq_type or 'waste' in eq_type:
            return self.colors['sludge_brown'], self.colors['sludge_brown_light']
        
        # Color by criticality (universal fallback)
        if criticality == 'high':
            return self.colors['critical_red'], self.colors['critical_red_light']
        elif criticality == 'medium':
            return self.colors['process_green'], self.colors['process_green_light']
        else:
            return self.colors['premium_gray'], self.colors['premium_gray_light']

    def _get_premium_typography(self, text_type: str) -> Dict:
        """
        Gets premium typography configuration according to text type.
        """
        typo = self.config.TYPOGRAPHY
        
        if text_type == 'title':
            return {
                'fontsize': typo['title_size'],
                'fontweight': 'bold',
                'color': self.colors['text_dark']
            }
        elif text_type == 'equipment':
            return {
                'fontsize': typo['equipment_size'],
                'fontweight': 'bold',
                'color': self.colors['text_dark']
            }
        elif text_type == 'specs':
            return {
                'fontsize': typo['spec_size'],
                'fontweight': 'normal',
                'color': self.colors['text_medium']
            }
        else:  # labels
            return {
                'fontsize': typo['label_size'],
                'fontweight': 'bold',
                'color': self.colors['water_blue']
            }

    def generate_diagram(self, equipment_data: List[Dict], system_info: Dict) -> bytes:
        """
        Generates simple and professional P&ID diagram
        
        Args:
            equipment_data: Equipment list from agent
            system_info: System information (flow rate, efficiencies, etc.)
            
        Returns:
            bytes: PNG image of the diagram
        """
        if not equipment_data:
            return self._create_empty_diagram()
        
        # Configure matplotlib for professional PREMIUM quality
        plt.rcParams.update({
            'font.family': self.config.TYPOGRAPHY['font_family'],
            'font.size': self.config.TYPOGRAPHY['equipment_size'],
            'figure.dpi': 300,
            'savefig.dpi': 300,
            'savefig.bbox': 'tight',
            'axes.linewidth': self.config.EFFECTS['border_width'],
            'font.weight': 'normal',
            'axes.facecolor': self.colors['background_light'],
            'figure.facecolor': self.colors['clean_white']
        })
        
        # Calculate canvas dimensions
        num_equipment = len(equipment_data)
        canvas_width = max(12, num_equipment * 3)
        canvas_height = 8
        
        fig, ax = plt.subplots(figsize=(canvas_width, canvas_height))
        ax.set_xlim(0, canvas_width * 100)
        ax.set_ylim(0, canvas_height * 100)
        ax.set_aspect('equal')
        ax.axis('off')
        ax.set_facecolor(self.colors['background_light'])
        
        # Diagram title
        self._add_diagram_title(ax, system_info, canvas_width)
        
        # Process and position equipment
        positioned_equipment = self._position_equipment(equipment_data, canvas_width)
        
        # Draw equipment
        for i, (equipment, position) in enumerate(positioned_equipment):
            self._draw_equipment(ax, equipment, position, i)
        
        # Draw connections
        self._draw_connections(ax, positioned_equipment, system_info)
        
        # Add system information
        self._add_system_info(ax, system_info, canvas_height)
        
        # Save as bytes
        buffer = io.BytesIO()
        plt.savefig(buffer, format='png', bbox_inches='tight', 
                   facecolor='white', edgecolor='none')
        buffer.seek(0)
        image_bytes = buffer.getvalue()
        buffer.close()
        plt.close(fig)
        
        logger.info(f"✅ P&ID diagram generated: {num_equipment} equipment")
        return image_bytes

    def _position_equipment(self, equipment_data: List[Dict], canvas_width: float) -> List[Tuple[Dict, Tuple[float, float]]]:
        """Positions equipment automatically in horizontal layout"""
        positioned = []
        
        # Sort equipment by stage (primary -> secondary -> tertiary -> auxiliary)
        stage_order = {'primary': 1, 'secondary': 2, 'tertiary': 3, 'auxiliary': 4}
        sorted_equipment = sorted(equipment_data, 
                                key=lambda eq: stage_order.get(eq.get('stage', 'secondary'), 2))
        
        # Calculate positions
        total_width = canvas_width * 100 - 200  # 100 px margin on each side
        if len(sorted_equipment) > 1:
            spacing = total_width / (len(sorted_equipment) - 1)
        else:
            spacing = 0
            
        y_center = self.line_height + 200  # Main process line
        
        for i, equipment in enumerate(sorted_equipment):
            x_pos = 100 + (i * spacing)  # Start with left margin
            y_pos = y_center
            
            # Adjust Y according to criticality for visual hierarchy
            if equipment.get('criticality') == 'high':
                y_pos += 20  # Critical equipment slightly higher
            elif equipment.get('criticality') == 'low':
                y_pos -= 30  # Auxiliary equipment lower
                
            positioned.append((equipment, (x_pos, y_pos)))
        
        return positioned

    def _draw_equipment(self, ax, equipment: Dict, position: Tuple[float, float], index: int):
        """Draws individual equipment using professional premium geometric shapes"""
        x, y = position
        eq_type = equipment.get('type', 'Equipo').upper()
        stage = equipment.get('stage', 'secondary')
        criticality = equipment.get('criticality', 'medium')
        complexity = equipment.get('complexity', 'moderate')
        
        # Get automatic contextual premium colors
        fill_color, accent_color = self._get_contextual_colors(equipment)
        
        # Determine equipment premium tier
        equipment_tier = 'critical' if criticality == 'high' else 'standard'
        
        # Select shape according to complexity and stage with premium style
        if complexity == 'complex' or 'reactor' in eq_type.lower():
            self._draw_reactor_vessel_premium(ax, x, y, fill_color, accent_color, eq_type, equipment_tier)
        elif 'clarificador' in eq_type.lower() or 'sediment' in eq_type.lower():
            self._draw_clarifier_premium(ax, x, y, fill_color, accent_color, eq_type, equipment_tier)
        elif 'bomba' in eq_type.lower() or 'pump' in eq_type.lower():
            self._draw_pump_premium(ax, x, y, fill_color, accent_color, eq_type, equipment_tier)
        elif 'filtro' in eq_type.lower() or 'filter' in eq_type.lower():
            self._draw_filter_premium(ax, x, y, fill_color, accent_color, eq_type, equipment_tier)
        elif 'tanque' in eq_type.lower() or 'tank' in eq_type.lower():
            self._draw_tank_premium(ax, x, y, fill_color, accent_color, eq_type, equipment_tier)
        else:
            self._draw_generic_equipment_premium(ax, x, y, fill_color, accent_color, eq_type, equipment_tier)
        
        # Add technical specifications
        self._add_equipment_specs(ax, equipment, x, y)

    def _draw_reactor_vessel_premium(self, ax, x: float, y: float, fill_color: str, 
                                   accent_color: str, label: str, tier: str):
        """Dibuja reactor biológico premium con efectos profesionales"""
        # Main body con efectos premium
        reactor = Rectangle((x - 40, y - 30), 80, 60, 
                          facecolor=fill_color, 
                          edgecolor=self.colors['text_dark'], 
                          linewidth=self.config.EFFECTS['border_width'])
        reactor = self._apply_premium_shadow(reactor, tier)
        ax.add_patch(reactor)
        
        # Tapa superior con color de acento
        cap = patches.Ellipse((x, y + 30), 80, 20, 
                            facecolor=accent_color, 
                            edgecolor=self.colors['text_dark'], 
                            linewidth=self.config.EFFECTS['border_width'])
        cap = self._apply_premium_shadow(cap, tier)
        ax.add_patch(cap)
        
        # More sophisticated agitator
        ax.plot([x - 25, x + 25], [y, y], color=self.colors['text_dark'], linewidth=3)
        ax.plot([x, x], [y - 15, y + 15], color=self.colors['text_dark'], linewidth=3)
        
        # Air diffusers (technical details)
        for i in range(3):
            bubble_x = x - 20 + i * 20
            bubble = Circle((bubble_x, y - 20), 3, 
                          facecolor=self.colors['water_blue_light'], 
                          edgecolor=self.colors['water_blue'], linewidth=1)
            ax.add_patch(bubble)
        
        # Label with premium typography
        typo = self._get_premium_typography('equipment')
        ax.text(x, y - 65, label, ha='center', va='top', **typo)

    def _draw_clarifier_premium(self, ax, x: float, y: float, fill_color: str, 
                              accent_color: str, label: str, tier: str):
        """Dibuja clarificador premium con efectos profesionales"""
        # Tanque circular principal
        clarifier = Circle((x, y), 35, facecolor=fill_color, 
                         edgecolor=self.colors['text_dark'], 
                         linewidth=self.config.EFFECTS['border_width'])
        clarifier = self._apply_premium_shadow(clarifier, tier)
        ax.add_patch(clarifier)
        
        # Vertedero central con color de acento
        center_weir = Circle((x, y), 8, facecolor=accent_color, 
                           edgecolor=self.colors['text_dark'], linewidth=1)
        ax.add_patch(center_weir)
        
        # Peripheral weir (elegant dashed line)
        outer_weir = Circle((x, y), 28, fill=False, 
                          edgecolor=self.colors['text_medium'], 
                          linewidth=1, linestyle='--', alpha=0.7)
        ax.add_patch(outer_weir)
        
        # More sophisticated scrapers (arms)
        ax.plot([x - 25, x + 25], [y, y], color=self.colors['text_dark'], linewidth=2)
        ax.plot([x, x], [y - 25, y + 25], color=self.colors['text_dark'], linewidth=2)
        
        # Indicadores de flujo interno
        for angle in [45, 135, 225, 315]:
            rad = np.radians(angle)
            arrow_x = x + np.cos(rad) * 15
            arrow_y = y + np.sin(rad) * 15
            ax.annotate('', xy=(x, y), xytext=(arrow_x, arrow_y),
                       arrowprops=dict(arrowstyle='->', color=self.colors['water_blue'], 
                                     lw=1, alpha=0.6))
        
        # Label with premium typography
        typo = self._get_premium_typography('equipment')
        ax.text(x, y - 65, label, ha='center', va='top', **typo)

    def _draw_pump_premium(self, ax, x: float, y: float, fill_color: str, 
                         accent_color: str, label: str, tier: str):
        """Dibuja bomba premium con efectos profesionales"""
        # Voluta principal
        pump = Circle((x, y), 25, facecolor=fill_color, 
                     edgecolor=self.colors['text_dark'], 
                     linewidth=self.config.EFFECTS['border_width'])
        pump = self._apply_premium_shadow(pump, tier)
        ax.add_patch(pump)
        
        # Impulsor con color de acento
        impeller = Circle((x, y), 12, facecolor=accent_color, 
                        edgecolor=self.colors['text_dark'], linewidth=1)
        ax.add_patch(impeller)
        
        # More sophisticated impeller blades
        for angle in [0, 72, 144, 216, 288]:  # 5 blades for more realism
            rad = np.radians(angle)
            x_blade = x + np.cos(rad) * 8
            y_blade = y + np.sin(rad) * 8
            ax.plot([x, x_blade], [y, y_blade], color=self.colors['text_dark'], linewidth=2)
        
        # Rotation indicator
        rotation_circle = Circle((x, y), 18, fill=False, 
                               edgecolor=self.colors['water_blue'], 
                               linewidth=1, linestyle=':', alpha=0.6)
        ax.add_patch(rotation_circle)
        
        # Premium label
        typo = self._get_premium_typography('equipment')
        ax.text(x, y - 50, label, ha='center', va='top', **typo)

    def _draw_filter_premium(self, ax, x: float, y: float, fill_color: str, 
                           accent_color: str, label: str, tier: str):
        """Dibuja filtro premium con efectos profesionales"""
        # Caja principal
        filter_box = Rectangle((x - 30, y - 25), 60, 50, 
                             facecolor=fill_color, 
                             edgecolor=self.colors['text_dark'], 
                             linewidth=self.config.EFFECTS['border_width'])
        filter_box = self._apply_premium_shadow(filter_box, tier)
        ax.add_patch(filter_box)
        
        # Medio filtrante (capas visibles)
        for i in range(4):
            y_line = y - 15 + i * 6
            ax.plot([x - 25, x + 25], [y_line, y_line], 
                   color=accent_color, linewidth=3, alpha=0.7)
        
        # Distribuidor superior premium
        distributor = Rectangle((x - 25, y + 15), 50, 8, 
                              facecolor=accent_color, 
                              edgecolor=self.colors['text_dark'], linewidth=1)
        ax.add_patch(distributor)
        
        # Small flow indicators
        for i in range(3):
            flow_x = x - 15 + i * 15
            ax.annotate('', xy=(flow_x, y - 20), xytext=(flow_x, y + 10),
                       arrowprops=dict(arrowstyle='->', color=self.colors['water_blue'], 
                                     lw=1, alpha=0.6))
        
        # Premium label
        typo = self._get_premium_typography('equipment')
        ax.text(x, y - 55, label, ha='center', va='top', **typo)


    def _draw_tank_premium(self, ax, x: float, y: float, fill_color: str, 
                         accent_color: str, label: str, tier: str):
        """Dibuja tanque premium"""
        # Main body
        tank = Rectangle((x - 25, y - 30), 50, 60, 
                        facecolor=fill_color, 
                        edgecolor=self.colors['text_dark'], 
                        linewidth=self.config.EFFECTS['border_width'])
        tank = self._apply_premium_shadow(tank, tier)
        ax.add_patch(tank)
        
        # Tapa con color de acento
        cap = patches.Ellipse((x, y + 30), 50, 15, 
                            facecolor=accent_color, 
                            edgecolor=self.colors['text_dark'], linewidth=2)
        ax.add_patch(cap)
        
        # Indicador de nivel
        for i in range(3):
            y_level = y - 15 + i * 15
            ax.plot([x - 15, x + 15], [y_level, y_level], 
                   color=self.colors['text_medium'], linewidth=1, linestyle='--', alpha=0.6)
        
        # Premium label
        typo = self._get_premium_typography('equipment')
        ax.text(x, y - 60, label, ha='center', va='top', **typo)

    def _draw_generic_equipment_premium(self, ax, x: float, y: float, fill_color: str, 
                                      accent_color: str, label: str, tier: str):
        """Dibuja equipo genérico premium"""
        equipment = FancyBboxPatch((x - 35, y - 20), 70, 40,
                                 boxstyle="round,pad=5",
                                 facecolor=fill_color, 
                                 edgecolor=self.colors['text_dark'], 
                                 linewidth=self.config.EFFECTS['border_width'])
        equipment = self._apply_premium_shadow(equipment, tier)
        ax.add_patch(equipment)
        
        # Premium generic symbol (gear)
        gear_center = Circle((x, y), 8, facecolor=accent_color, 
                           edgecolor=self.colors['text_dark'], linewidth=1)
        ax.add_patch(gear_center)
        
        # Dientes del engranaje
        for angle in range(0, 360, 45):
            rad = np.radians(angle)
            tooth_x = x + np.cos(rad) * 12
            tooth_y = y + np.sin(rad) * 12
            ax.plot([x + np.cos(rad) * 8, tooth_x], [y + np.sin(rad) * 8, tooth_y], 
                   color=self.colors['text_dark'], linewidth=2)
        
        # Premium label
        typo = self._get_premium_typography('equipment')
        ax.text(x, y - 50, label, ha='center', va='top', **typo)

    def _add_equipment_specs(self, ax, equipment: Dict, x: float, y: float):
        """Añade especificaciones técnicas al equipo"""
        specs = []
        
        # Capacidad
        capacity = equipment.get('capacity_m3_day') or 0
        if capacity > 0:
            specs.append(f"{capacity:,.0f} m³/d")
        
        # Potencia
        power = equipment.get('power_consumption_kw') or 0
        if power > 0:
            specs.append(f"{power:.1f} kW")
        
        # Show specifications with premium typography
        if specs:
            spec_text = " | ".join(specs)
            typo = self._get_premium_typography('specs')
            ax.text(x, y + 45, spec_text, ha='center', va='bottom', **typo)

    def _draw_connections(self, ax, positioned_equipment: List[Tuple[Dict, Tuple[float, float]]], 
                         system_info: Dict):
        """Dibuja líneas de conexión entre equipos"""
        if len(positioned_equipment) < 2:
            return
        
        flow_rate = system_info.get('flow_rate_m3_day', 0)
        
        for i in range(len(positioned_equipment) - 1):
            current_pos = positioned_equipment[i][1]
            next_pos = positioned_equipment[i + 1][1]
            
            # Main process line
            self._draw_process_line(ax, current_pos, next_pos, flow_rate)
        
        # Inlet line
        if positioned_equipment:
            first_pos = positioned_equipment[0][1]
            inlet_x = first_pos[0] - 100
            self._draw_inlet_line(ax, (inlet_x, first_pos[1]), first_pos, flow_rate)
        
        # Outlet line
        if positioned_equipment:
            last_pos = positioned_equipment[-1][1]
            outlet_x = last_pos[0] + 100
            self._draw_outlet_line(ax, last_pos, (outlet_x, last_pos[1]), flow_rate)

    def _draw_process_line(self, ax, start_pos: Tuple[float, float], 
                          end_pos: Tuple[float, float], flow_rate: float):
        """Dibuja línea de proceso con flecha"""
        x1, y1 = start_pos
        x2, y2 = end_pos
        
        # Premium main line with appropriate thickness
        line_width = 4 if flow_rate > 1000 else 3
        ax.plot([x1 + 40, x2 - 40], [y1, y2], 
               color=self.colors['water_blue'], linewidth=line_width, alpha=0.9)
        
        # More sophisticated premium arrow
        mid_x = (x1 + x2) / 2
        mid_y = (y1 + y2) / 2
        arrow = patches.FancyArrowPatch((mid_x - 15, mid_y), (mid_x + 15, mid_y),
                                      arrowstyle='->', mutation_scale=25,
                                      color=self.colors['water_blue'], 
                                      linewidth=2, alpha=0.9)
        ax.add_patch(arrow)
        
        # Etiqueta de caudal premium
        if flow_rate > 0:
            typo = self._get_premium_typography('label')
            ax.text(mid_x, mid_y + 18, f"{flow_rate:,.0f} m³/d", 
                   ha='center', va='bottom', **typo)

    def _draw_inlet_line(self, ax, start_pos: Tuple[float, float], 
                        end_pos: Tuple[float, float], flow_rate: float):
        """Dibuja línea de entrada"""
        x1, y1 = start_pos
        x2, y2 = end_pos
        
        # Premium line
        ax.plot([x1, x2 - 40], [y1, y2], 
               color=self.colors['process_green'], linewidth=4, alpha=0.9)
        
        # Premium arrow
        arrow = patches.FancyArrowPatch((x1 + 30, y1), (x2 - 60, y2),
                                      arrowstyle='->', mutation_scale=25,
                                      color=self.colors['process_green'], 
                                      linewidth=2, alpha=0.9)
        ax.add_patch(arrow)
        
        # Premium label
        typo = self._get_premium_typography('label')
        typo['color'] = self.colors['process_green']
        ax.text(x1, y1 + 25, "ENTRADA", ha='center', va='bottom', **typo)

    def _draw_outlet_line(self, ax, start_pos: Tuple[float, float], 
                         end_pos: Tuple[float, float], flow_rate: float):
        """Dibuja línea de salida"""
        x1, y1 = start_pos
        x2, y2 = end_pos
        
        # Premium line
        ax.plot([x1 + 40, x2], [y1, y2], 
               color=self.colors['treated_green'], linewidth=4, alpha=0.9)
        
        # Premium arrow
        arrow = patches.FancyArrowPatch((x1 + 60, y1), (x2 - 30, y2),
                                      arrowstyle='->', mutation_scale=25,
                                      color=self.colors['treated_green'], 
                                      linewidth=2, alpha=0.9)
        ax.add_patch(arrow)
        
        # Premium label
        typo = self._get_premium_typography('label')
        typo['color'] = self.colors['treated_green']
        ax.text(x2, y2 + 25, "SALIDA", ha='center', va='bottom', **typo)

    def _add_diagram_title(self, ax, system_info: Dict, canvas_width: float):
        """Añade título profesional premium al diagrama"""
        title = "DIAGRAMA P&ID PROFESIONAL - TREN DE TRATAMIENTO"
        
        # Main title with premium typography
        title_typo = self._get_premium_typography('title')
        title_typo['color'] = self.colors['primary_blue']
        ax.text(canvas_width * 50, 750, title, ha='center', va='top', **title_typo)
        
        # Subtitle with system information
        flow_rate = system_info.get('flow_rate_m3_day', 0)
        subtitle = f"Caudal de diseño: {flow_rate:,.0f} m³/día" if flow_rate > 0 else "Sistema de tratamiento adaptativo"
        
        subtitle_typo = self._get_premium_typography('specs')
        subtitle_typo['color'] = self.colors['text_medium']
        ax.text(canvas_width * 50, 720, subtitle, ha='center', va='top', **subtitle_typo)

    def _add_system_info(self, ax, system_info: Dict, canvas_height: float):
        """Añade información del sistema en la parte inferior"""
        info_y = 50
        
        # Efficiencies with premium typography
        efficiency_data = system_info.get('treatment_efficiency', {})
        if efficiency_data and 'parameters' in efficiency_data:
            eff_text = " | ".join([
                f"{p['parameter_name']}: {p['removal_efficiency_percent']:.0f}%" 
                for p in efficiency_data['parameters']
                if p.get('removal_efficiency_percent', 0) > 0
            ])
        else:
            # Fallback for old format (backward compatibility)
            eff_text = " | ".join([f"{param}: {value:.0f}%" 
                                 for param, value in efficiency_data.items() 
                                 if isinstance(value, (int, float)) and value > 0])
        
        if eff_text:
            info_typo = self._get_premium_typography('specs')
            ax.text(50, info_y, f"Eficiencias de tratamiento: {eff_text}", 
                   ha='left', va='bottom', **info_typo)

    def _create_empty_diagram(self) -> bytes:
        """Crea diagrama vacío cuando no hay equipos"""
        fig, ax = plt.subplots(figsize=(8, 6))
        ax.text(0.5, 0.5, "No hay equipos disponibles\npara generar diagrama", 
               ha='center', va='center', transform=ax.transAxes,
               fontsize=12, color=self.colors['neutral_gray'])
        ax.axis('off')

        buffer = io.BytesIO()
        plt.savefig(buffer, format='png', bbox_inches='tight')
        buffer.seek(0)
        image_bytes = buffer.getvalue()
        buffer.close()
        plt.close(fig)
        
        return image_bytes


# Instancia global
simple_process_diagram = SimpleProcessDiagram()