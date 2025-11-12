Los Seis Principios de la Ingeniería de IA

1. Inteligencia con Estado (Stateful Intelligence)
   Principio: La preservación del contexto (context preservation) es un principio central de las buenas arquitecturas de IA.
   Implementación:
   • Reconocimiento y Preservación del Estado: Asegúrese de que sus sistemas inteligentes reconozcan y preserven el estado de manera significativa para el agente.
   • Contraste con Sistemas Tradicionales: Esto difiere de la ingeniería tradicional, donde se priorizan los servicios sin estado (stateless services) para facilitar la escalabilidad. Los sistemas de IA, en cambio, requieren contexto y comportamientos aprendidos, los cuales desaparecen al reiniciar.
   • Ingeniería de Contexto: Gran parte de una buena arquitectura agéntica es una buena ingeniería de contexto y una buena preservación del contexto. Evite reenviar los mismos tokens una y otra vez, ya que esto es ineficiente (wasteful).
2. Incertidumbre Acotada (Bounded Uncertainty)
   Principio: Dado que nuestro mundo ahora se ejecuta sobre núcleos probabilísticos (probabilistic cores), es fundamental acotar la incertidumbre que generan estos sistemas.
   Implementación:
   • Puentes Determinísticos: Debe diseñar puentes determinísticos (deterministic bridges) sobre núcleos probabilísticos. Esto implica colocar wrappers lo más determinísticos posible sobre los núcleos probabilísticos.
   • Precisión de Entrada: Defina sus entradas de manera extremadamente precisa y en la misma secuencia cada vez.
   • Control de Modelos: Reduzca la temperatura (temperature) del Gran Modelo de Lenguaje (LLM) a cero (0). Esto garantiza que, para una consulta (order 1, 2, 3), la respuesta sea siempre la misma.
   • QA Post-Producción: Invierta mucho más en Control de Calidad (QA) después del lanzamiento (post production). Los ingenieros deben medir eventos que ocurren en las tuberías de producción (production pipelines) que podrían ser casos extremos (edge cases) o que rompen las expectativas.
   • Monitoreo Continuo: Su rol es continuar acotando la incertidumbre a medida que los modelos derivan (drift) con el tiempo, cambian las entradas, se intercambian modelos o el contexto emerge y cambia.
3. Detección Inteligente de Fallos (Intelligent Failure Detection)
   Principio: Los fallos en la IA son a menudo sutiles y difíciles de detectar (subtle failure world), a diferencia de los fallos catastróficos y claros de los sistemas tradicionales.
   Implementación:
   • Monitoreo de Calidad de Razonamiento: Se necesita una detección inteligente de fallos. Esto implica monitorear la calidad del razonamiento (reasoning quality), no solo la salud del sistema.
   • Asumir Fallos No Catastróficos: La IA puede fallar al alucinar o al derivar (drifting); puede seguir siendo funcional, pero completamente incorrecta. Debe diseñar el sistema asumiendo que es difícil detectar una degradación en la calidad del razonamiento.
4. Enrutamiento Basado en Capacidad (Capability Based Routing)
   Principio: Abandone la distribución de carga uniforme; las solicitudes a un sistema agéntico pueden requerir cantidades dramáticamente diferentes de cómputo.
   Implementación:
   • Cómputo Diferencial: Piense en cómo enrutar basándose en la complejidad de la tarea y la confianza que la IA tiene en un espacio problemático particular.
   • Rutas Inteligentes: Un requerimiento de cómputo de alta inferencia puede involucrar miles de tokens, mientras que una solicitud de baja inferencia puede servirse en una fracción de ese espacio.
   • Análisis de Nodos: Se trata de comprender las capacidades diferenciales de sus nodos y tomar decisiones muy inteligentes sobre dónde asignar los recursos (dónde "quemar los tokens" con un modelo más inteligente).
5. Estados de Salud Complejos / Calidad de la Decisión y Patrones de Razonamiento
   Principio: Un sistema agéntico pasa de un estado de salud binario (arriba/abajo) a un mundo con muchas "sombras de gris" (lots and lots of shades of gray).
   Implementación:
   • Auditoría Detallada: Se requiere un estándar mucho más alto para la auditabilidad.
   • Medición Multi-Agente: En un sistema multi-agéntico, el sistema puede estar activo y parcialmente funcional, o estar activo y con una inteligencia degradada porque fallan algunos "apretones de manos" (handshakes) entre agentes.
   • Seguimiento: Debe realizar un seguimiento de los resultados (outputs) y la calidad de esos resultados. Es necesario comprender la traza de auditoría (audit trace) para identificar dónde los agentes están rompiendo handshakes, dónde las trazas de razonamiento no funcionan bien o dónde ocurre una deriva de contexto (context drift).
6. Validación Continua de Entrada (Continuous Input Validation)
   Principio: La validación no se realiza una sola vez al inicio; debe ocurrir a lo largo de todo el estado conversacional.
   Implementación:
   • Validación durante la Conversación: Dado que el comportamiento de la IA depende del contexto acumulado, debe validar a medida que avanza o no sabrá dónde se está desviando.
   • Checkpoints: Considere cada turno en la conversación como un paso que requiere alguna validación del estado de la conversación (un punto de control o checkpoint). Sin esto, es muy difícil depurar (debug) los sistemas.

---

Consideración Final
Diseñar sistemas agénticos de IA saludables es mucho más difícil que diseñar software tradicional. Muchos sistemas que se construyen hoy en día son sistemas híbridos que combinan software determinístico tradicional con sistemas de IA. Debe ser lo suficientemente inteligente para aplicar principios tradicionales (como servicios sin estado) donde sean relevantes para el software determinístico, y aplicar los nuevos principios de IA (como la inteligencia con estado) donde sean relevantes para el diseño de sistemas agénticos.
