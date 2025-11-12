A continuación, se presentan las cinco recomendaciones para mejorar las indicaciones (prompts) de GPT-5, ordenadas de la más fácil a la más difícil, tal como se describen en las fuentes:

1. Frases de Empuje del Enrutador (Router Nudge Phrases)
   Esta técnica requiere un esfuerzo bajo y consiste en añadir simplemente unas pocas palabras al final de las indicaciones.
   • Objetivo: Forzar al enrutador invisible a seleccionar un modelo de razonamiento superior.
   • Recomendación: Se encontraron tres frases que desencadenan de manera confiable un razonamiento más profundo: 1. "think hard about this" (Piensa detenidamente sobre esto) 2. "think deeply about this" (Piensa profundamente sobre esto) 3. "think carefully" (Piensa cuidadosamente)
   • Resultado: Se activa un indicador de pensamiento (thinking indicator), y la respuesta casi siempre incluirá "second-order effects" (efectos de segundo orden) que no se consideraron inicialmente.
   • Racional: GPT-5 sigue las instrucciones de manera literal. La palabra "important" (importante) es vaga, mientras que "think hard" (piensa detenidamente) es muy explícita.
2. Control de la Verbosidad (Verbosity Control)
   El enrutador invisible de ChatGPT, además de determinar la profundidad del razonamiento, tiene una configuración de verbosidad separada que controla la longitud de la salida.
   • Objetivo: Utilizar frases específicas para controlar exactamente qué tan largas o cortas serán las salidas de GPT-5.
   • Recomendaciones de Frases de Poder (Power Phrases):
   ◦ Baja Verbosidad (Información Crítica): Funciona mejor cuando se necesita solo información crítica. Ejemplo: "give me the bottom line in 100 words or less use markdown for clarity and structure" (Dame la conclusión esencial en 100 palabras o menos, utiliza markdown para claridad y estructura).
   ◦ Verbosidad Media (Conclusiones Clave + Contexto): Funciona mejor cuando se necesitan conclusiones clave más contexto. Ejemplo: "aim for concise 3 to five paragraph explanation" (Busca una explicación concisa de 3 a 5 párrafos).
   ◦ Alta Verbosidad (Documentos exhaustivos): Ideal para documentos complejos o materiales de referencia. Ejemplo: "provide a comprehensive and detailed breakdown 600 to 800 words" (Proporciona un desglose completo y detallado de 600 a 800 palabras). GPT-5 maneja los recuentos de palabras específicos mucho mejor que los modelos anteriores.
3. El Meta Prompt (Meta Prompt)
   Si bien OpenAI ofrece una herramienta oficial de optimización de indicaciones (prompt optimizer tool), esta requiere una cuenta de desarrollador y un método de pago. La fuente proporciona una solución gratuita utilizando un meta prompt.
   • Objetivo: Utilizar la capacidad de GPT-5 para criticar y mejorar sus propias instrucciones.
   • Meta Prompt Recomendado (para usar con ChatGPT-5): "you are an expert prompt engineer specializing in creating prompts for AI language models particularly and we can change this to chat GBT5 thinking model you're tasked to take my prompt and make it better blah blah blah here's my initial prompt and you paste your initial prompt" (Eres un ingeniero experto en indicaciones, especializado en crear indicaciones para modelos de lenguaje de IA, particularmente [podemos cambiar esto a modelo de pensamiento de chat GBT5]. Tienes la tarea de tomar mi indicación y mejorarla, bla bla bla. Aquí está mi indicación inicial: [pega tu indicación inicial]).
4. Crear un Sándwich XML (XML Sandwich)
   OpenAI recomienda organizar las instrucciones utilizando etiquetas XML (corchetes angulares que envuelven diferentes secciones del texto).
   • Objetivo: Aprovechar la precisión quirúrgica de GPT-5 al seguir instrucciones para que comprenda mejor la tarea.
   • Mecanismo: En lugar de verter toda la información en un párrafo, se etiquetan explícitamente los componentes.
   • Estructura Recomendada: Utilizar etiquetas etiquetadas como cajas. Por ejemplo:
   ◦ <task> (La tarea a realizar)
   ◦ <resume> (El currículum vitae)
   ◦ <job description> (La descripción del puesto)
   ◦ <tone> (El tono de voz deseado, e.g., "user friendly and conversational")
5. El Bucle de Perfección (The Perfection Loop)
   Esta es la técnica de mayor esfuerzo y es ideal para tareas complejas "de 0 a 1" (como crear documentos terminados desde cero o código listo para producción).
   • Objetivo: Explotar la excelencia de GPT-5 en criticarse a sí mismo.
   • Mecanismo: En lugar de aceptar la primera respuesta y pedir mejoras manualmente, se le dice al modelo por adelantado que cree su propia definición de excelencia, que califique su propio trabajo y que siga iterando internamente hasta lograr el mejor resultado.
   • Ejemplos de Instrucciones de Bucle de Perfección:
   ◦ "before you begin develop an internal rubric for what constitutes a world-class market analysis report internally iterate and refine the draft until it scores top marks against your rubric" (Antes de comenzar, desarrolla una rúbrica interna sobre lo que constituye un informe de análisis de mercado de clase mundial. Itera y refina internamente el borrador hasta que obtenga las mejores calificaciones según tu rúbrica).
   ◦ "before you begin create an internal rubric with five criteria for a perfect QBR then use that rubric to internally iterate the outline until your response scores 10 out of 10" (Antes de comenzar, crea una rúbrica interna con cinco criterios para una QBR perfecta, luego usa esa rúbrica para iterar internamente el esquema hasta que tu respuesta obtenga una puntuación de 10 sobre 10).
   La fuente subraya que estas técnicas no son mutuamente excluyentes; se pueden apilar, utilizando frases de empuje con control de verbosidad, sándwiches XML y el bucle de perfección.
