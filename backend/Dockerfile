# Etapa 1: Construcción de dependencias
FROM python:3.11-slim as builder

WORKDIR /app

# Instalar dependencias del sistema necesarias para compilación
RUN apt-get update && apt-get install -y \
  build-essential \
  && rm -rf /var/lib/apt/lists/*

# Copiar archivos de dependencias
COPY requirements.txt .
COPY pyproject.toml .

# Instalar dependencias de Python (usando requirements.minimal.txt)
RUN pip install --no-cache-dir -r requirements.txt
RUN pip install gunicorn==22.0.0


# Etapa 2: Imagen final de producción
FROM python:3.11-slim

# Instalar dependencias de sistema para WeasyPrint, Matplotlib, y utilidades
RUN apt-get update && apt-get install -y --no-install-recommends \
  # Herramientas de sistema
  curl \
  netcat-traditional \
  # Fuentes y emoji support
  fontconfig \
  fonts-noto-color-emoji \
  # Dependencias de WeasyPrint (PDF generation)
  libpango-1.0-0 \
  libpangoft2-1.0-0 \
  libfontconfig1 \
  libcairo-gobject2 \
  libgdk-pixbuf-2.0-0 \
  libffi-dev \
  shared-mime-info \
  libcairo2 \
  libpangocairo-1.0-0 \
  libfreetype6-dev \
  libpng-dev \
  pkg-config \
  # Graphviz para diagramas (opcional)
  graphviz \
  && fc-cache -f -v \
  && apt-get clean \
  && rm -rf /var/lib/apt/lists/*

# Limpiar cache de Matplotlib para forzar reconstrucción con nuevas fuentes
RUN rm -rf /root/.cache/matplotlib

WORKDIR /app

# Copiar dependencias pre-instaladas desde builder
COPY --from=builder /usr/local/lib/python3.11/site-packages /usr/local/lib/python3.11/site-packages
COPY --from=builder /usr/local/bin /usr/local/bin

# Copiar código de la aplicación
COPY . .

# Copiar y preparar script de espera
COPY ./scripts/wait-for-services.sh /app/scripts/wait-for-services.sh
RUN chmod +x /app/scripts/wait-for-services.sh

# Asegurar que ejecutables estén en PATH
ENV PATH=/usr/local/bin:$PATH

# Crear usuario no-root por seguridad
RUN useradd -m appuser && \
  chown -R appuser:appuser /app && \
  mkdir -p /app/logs /app/storage && \
  chown -R appuser:appuser /app/logs /app/storage

USER appuser

# Pre-construir cache de fuentes de Matplotlib
RUN python -c "import matplotlib.font_manager" || true

# Exponer puerto
EXPOSE 8000

# Entrypoint con wait-for-services
ENTRYPOINT ["/app/scripts/wait-for-services.sh"]

# ⚠️ Timeout 900s (15 min) for AI generation tasks (typical: 10 min)
# ⚠️ 6 workers for better concurrency without Celery (each can handle 10min task)
CMD ["gunicorn", "app.main:app", \
  "--workers", "6", \
  "--worker-class", "uvicorn.workers.UvicornWorker", \
  "--bind", "0.0.0.0:8000", \
  "--log-level", "info", \
  "--timeout", "900", \
  "--graceful-timeout", "900", \
  "--max-requests", "100", \
  "--max-requests-jitter", "20"]
