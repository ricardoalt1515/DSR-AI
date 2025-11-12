# Product Overview: H₂O Allegiant - AI Water Engineering Assistant

## 1. Vision y Propósito

**H₂O Allegiant** es un asistente de ingeniería conceptual, impulsado por Inteligencia Artificial, especializado en el diseño de soluciones para el tratamiento de agua. Nuestra visión es democratizar el acceso a la ingeniería de alta calidad, permitiendo a clientes de diversos sectores (industrial, comercial, municipal) obtener propuestas técnicas robustas y personalizadas de manera rápida y automatizada.

El producto está diseñado para resolver el problema fundamental del largo, costoso y a menudo complejo proceso de consultoría inicial en proyectos de tratamiento de agua. Actuamos como un **ingeniero experto virtual** que guía al usuario, entiende sus necesidades y entrega una solución de ingeniería conceptual completa.

## 2. Core Functionality

El flujo de trabajo principal del sistema se centra en una interacción conversacional guiada que culmina en la generación de una propuesta técnica detallada.

### 2.1. Cuestionario Dinámico e Interactivo
- **Asistente Conversacional:** El sistema interactúa con el usuario a través de un chatbot.
- **Recopilación Progresiva de Datos:** En lugar de un formulario estático, el chatbot realiza una serie de preguntas diseñadas por expertos. Estas preguntas recopilan de manera progresiva toda la información crítica necesaria para el diseño, como:
    - Caudales de operación.
    - Tipo de agua a tratar.
    - Contaminantes específicos.
    - Objetivos de calidad del agua tratada.
    - Restricciones de espacio, presupuesto y normativas.
- **Estado Persistente:** La información se guarda progresivamente, permitiendo al usuario pausar y reanudar el proceso sin perder el contexto.

### 2.2. Motor de IA: El Ingeniero Experto Virtual
- **Agente de Propuestas Moderno (`modern_proposal_agent.py`):** El cerebro del sistema es un agente de IA avanzado que emula el proceso de razonamiento de un ingeniero consultor senior.
- **Razonamiento por Etapas:** El agente sigue una metodología estructurada:
    1.  **Diagnóstico Técnico:** Analiza el contexto completo de la conversación para extraer parámetros clave.
    2.  **Razonamiento Tecnológico:** Selecciona las tecnologías de tratamiento más adecuadas basándose en la tratabilidad de los contaminantes y la operabilidad para el cliente.
    3.  **Análisis Económico:** Utiliza una herramienta interna (`get_equipment_cost_estimate`) que consulta una base de datos de precios (`equipment_pricing.json`) para estimar el costo de los equipos principales (CAPEX).
    4.  **Síntesis Profesional:** Integra toda la información en una propuesta coherente y justificada.

### 2.3. Generación de Propuestas Personalizadas
- **Documento Técnico Completo:** El resultado final es un documento PDF profesional y detallado.
- **Contenido de la Propuesta:** La propuesta incluye:
    - Análisis del problema específico del cliente.
    - Justificación técnica de la solución propuesta.
    - Especificaciones de los equipos principales.
    - Desglose de la inversión (CAPEX) y costos de operación (OPEX).
    - Análisis financiero preliminar (ROI, ahorros).
    - Visualizaciones y gráficos (diagramas de flujo, cronogramas).

## 3. Arquitectura Técnica

La plataforma está construida sobre una arquitectura moderna, escalable y desacoplada, desplegada en AWS.

- **Backend:** FastAPI (Python) que orquesta la lógica de negocio, la interacción con la IA y la base de datos.
- **Frontend:** Next.js (React/TypeScript) que proporciona una interfaz de usuario conversacional e intuitiva.
- **Base de Datos:** PostgreSQL (AWS RDS) para datos relacionales (usuarios, conversaciones) y Redis para caché y sesiones.
- **IA y Procesamiento:**
    - **OpenAI GPT-4:** Utilizado por el agente de IA para el razonamiento y la generación de texto.
    - **Pydantic AI:** Facilita la interacción con el modelo de lenguaje y la estructuración de la salida.
- **Infraestructura como Código (IaC):** Terraform se utiliza para gestionar y automatizar el despliegue de toda la infraestructura en AWS (ECS Fargate, S3, ALB, etc.).

*(Para un desglose técnico exhaustivo, referirse al documento `ARCHITECTURE.md`)*

## 4. Visión a Futuro y Roadmap

El objetivo es evolucionar de un asistente de ingeniería conceptual a una plataforma de automatización completa para proyectos de agua.

### 4.1. Integración con Marketplaces (MCP)
- **Precios en Tiempo Real:** Conectar el sistema a APIs de marketplaces de proveedores de equipos para obtener precios en tiempo real, reemplazando o complementando el `equipment_pricing.json` estático. Esto asegurará que las estimaciones de costos sean siempre actuales y precisas.

### 4.2. Automatización del Ciclo de Venta
- **Carrito de Compras:** Una vez generada la propuesta, ofrecer al cliente un "carrito de compras" con un enlace a un marketplace o proveedor asociado, pre-cargado con los equipos y tecnologías recomendados.
- **Seguimiento Automatizado:** Implementar un sistema de seguimiento post-propuesta (correos electrónicos, notificaciones) para guiar al cliente en los siguientes pasos, programar reuniones o resolver dudas adicionales.

### 4.3. Ecosistema de Agentes de IA
- **Agentes Especializados:** Desarrollar un conjunto de agentes de IA que colaboren entre sí:
    - **Agente de Diagnóstico:** Especializado en la entrevista inicial.
    - **Agente de Diseño:** El actual `modern_proposal_agent`.
    - **Agente de Compras:** Encargado de la interacción con marketplaces.
    - **Agente de Seguimiento:** Gestiona la comunicación post-propuesta.
- **Orquestación:** Crear un orquestador que gestione el flujo de trabajo entre los diferentes agentes para automatizar el proceso de principio a fin.

Este enfoque nos permitirá no solo generar la ingeniería, sino también facilitar la adquisición y el seguimiento, convirtiendo a **H₂O Allegiant** en una solución integral y de alto valor en el sector del tratamiento de agua.
