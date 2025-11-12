Best Practices para la Creación de Herramientas (Tools) en Agentes de IA
La creación de herramientas es un bloque fundamental que permite a los Modelos de Lenguaje Grandes (LLM) interactuar con su entorno y realizar acciones concretas, como llamar APIs, actualizar bases de datos o leer archivos.
La efectividad no depende de la cantidad de herramientas, sino de su diseño estratégico, robustez y usabilidad.

1. Principios Generales
   Menos es más: Cada herramienta debe tener un propósito claro y bien definido. Evita crear herramientas redundantes.
   Acoplamiento bajo: Las herramientas deben ser independientes entre sí para que el mantenimiento y la evolución sean más sencillos.
   Transparencia: El LLM debe entender claramente qué hace cada herramienta y cómo usarla, mediante descripciones claras.
2. Diseño e Implementación de Herramientas
   Integración directa: Aprovecha el soporte nativo de los proveedores de modelos (ej. OpenAI function calling, Anthropic tool use) en lugar de depender de librerías externas innecesarias.
   Descripciones claras y precisas:
   La descripción debe detallar el propósito de la herramienta y los argumentos esperados.
   La descripción explica la herramienta en sí, mientras que el prompt del sistema indica cómo usar múltiples herramientas juntas.
   Ejemplos para parámetros: Si se requiere un formato específico, proporciona ejemplos de uso correcto.
   Manejo robusto de errores:
   Usa bloques try-catch.
   Devuelve errores comprensibles al LLM, no trazas crudas.
   Ejemplo: "Error: el parámetro 'fecha' debe estar en formato YYYY-MM-DD."
   Devuelve solo la información necesaria: Filtra la salida de APIs externas y entrega solo lo relevante al LLM.
   Formato de salida estructurado: Usa JSON o Markdown bien definido, para facilitar el razonamiento del agente.
   Consistencia en la interfaz: Todas las herramientas deben seguir un mismo patrón de inputs/outputs (ej. camelCase, snake_case, estructuras JSON anidadas).
3. Gestión del Agente y del Contexto
   Guardrails (barreras de seguridad):
   Validar entradas antes de ejecutar herramientas.
   Validar salidas para detectar resultados incoherentes o dañinos.
   Agentes especializados: Divide responsabilidades. Ejemplo: un agente para base de datos, otro para APIs externas.
   Registro en el historial: Guarda las llamadas y respuestas de herramientas en el historial de conversación.
   Orquestación modular: No sobrecargar un único orquestador con demasiadas herramientas. Si hay más de 15–20, dividir en submódulos.
   Prompts sin contradicciones: Evita instrucciones negativas (“no uses...”), mejor da instrucciones positivas y sin conflicto.
4. Confiabilidad y Escalabilidad
   Planificación y prototipado: Define los flujos antes de codificar.
   Versionado de prompts y tools: Al igual que el código, versiona las herramientas y prompts.
   Monitoreo de longitud de contexto: Controla el uso de tokens en conversaciones largas.
   Testing automatizado:
   Pruebas unitarias de cada herramienta (inputs válidos/ inválidos).
   Simulación de llamadas desde el LLM.
   Telemetría y logging:
   Registrar métricas de uso de cada herramienta.
   Identificar cuáles se usan, cuáles fallan y con qué frecuencia.
5. Seguridad
   Validación estricta de inputs: Nunca confiar en que el LLM formateará perfecto los parámetros.
   Escapes y sanitización: Evitar inyecciones (SQL, Shell, etc.) si las herramientas interactúan con sistemas críticos.
   Control de permisos: No todas las herramientas deben estar disponibles en todos los contextos (ej. “borrar datos” debería estar restringido).

Consolidate workflows: Implement `schedule_event` instead of separate `list_users`, `get_availability`, and `create_event` tools.

- Evaluate with real tasks: Test with goals like "find the project lead and schedule a meeting," not just "get user."

- Automate metrics: Programmatically run evaluations to track success rates, token counts, and tool call frequency.

- Let AI refactor: Feed failed evaluation transcripts to an LLM to get suggestions for improving your tool's code.

- Namespace tools clearly: Use prefixes to differentiate tools, such as `jira_search_issues` vs. `github_search_issues`.

- Return meaningful context: Prefer human-readable names like "Jane Doe" instead of cryptic `usr_7a3b4c9` IDs.

- Enforce token efficiency: Implement pagination and filtering for tools that can return long lists of results.

- Make errors helpful: Instead of `Invalid input`, return `Error: Missing 'user_id'. Example: search(user_id=12345)`.

- Guide with messages: If output is cut, guide with "Showing 10 of 100 results. Use the 'page' parameter for more."

- Use unambiguous parameter names: Use `user_email` or `user_id` instead of a generic `user` parameter.

- Define formats explicitly: In parameter descriptions, specify requirements like "Date must be in YYYY-MM-DD format."

- Provide examples in descriptions: Add an `Example: search_query='status:open'` to the parameter's help text.

6. Checklist Rápido
   ✅ La herramienta tiene un propósito único y bien definido
   ✅ Su descripción es clara y sin ambigüedades
   ✅ Tiene validación de parámetros y manejo de errores robusto
   ✅ Devuelve solo la información necesaria en un formato estructurado
   ✅ Está probada con casos reales y edge cases
   ✅ Está versionada y monitoreada en producción

source: https://www.anthropic.com/engineering/writing-tools-for-agents
