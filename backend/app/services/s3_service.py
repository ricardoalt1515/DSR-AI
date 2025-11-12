import aioboto3
import os
import aiofiles
import logging
from io import BytesIO
from pathlib import Path
from typing import IO, Optional, Union

# Configuración para S3 en producción
# Support both S3_BUCKET and AWS_S3_BUCKET for compatibility
S3_BUCKET = os.getenv("S3_BUCKET") or os.getenv("AWS_S3_BUCKET")
S3_REGION = os.getenv("S3_REGION") or os.getenv("AWS_REGION", "us-east-1")
S3_ACCESS_KEY = os.getenv("S3_ACCESS_KEY") or os.getenv("AWS_ACCESS_KEY_ID")
S3_SECRET_KEY = os.getenv("S3_SECRET_KEY") or os.getenv("AWS_SECRET_ACCESS_KEY")

# Configuración para almacenamiento local en desarrollo
LOCAL_UPLOADS_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "uploads")
Path(LOCAL_UPLOADS_DIR).mkdir(exist_ok=True, parents=True)

# Verificar si estamos en modo producción (con S3) o local
USE_S3 = S3_BUCKET is not None

logger = logging.getLogger("hydrous")

async def upload_file_to_s3(file_obj: Union[IO[bytes], BytesIO], filename: str, content_type: Optional[str] = None) -> str:
    """Sube un archivo a S3 o lo guarda localmente en desarrollo"""
    try:
        if USE_S3:  # Modo producción: usar S3
            logger.info(f"Subiendo archivo a S3: {filename}")
            session = aioboto3.Session()
            extra_args = {"ContentType": content_type} if content_type else {}

            # En producción (AWS), el cliente boto3 usará automáticamente el rol de IAM de la tarea de ECS.
            # No es necesario (y es inseguro) pasar credenciales explícitas.
            client_args = {"region_name": S3_REGION}
            if S3_ACCESS_KEY and S3_SECRET_KEY:
                # Permitir credenciales explícitas para entornos de prueba que no sean AWS pero que usen S3.
                logger.warning("Usando credenciales explícitas de S3. Esto no se recomienda en producción en AWS.")
                client_args["aws_access_key_id"] = S3_ACCESS_KEY
                client_args["aws_secret_access_key"] = S3_SECRET_KEY
            
            async with session.client("s3", **client_args) as s3:
                await s3.upload_fileobj(file_obj, S3_BUCKET, filename, ExtraArgs=extra_args)
        else:  # Modo desarrollo: guardar localmente
            logger.info(f"Guardando archivo localmente (modo desarrollo): {filename}")
            local_path = os.path.join(LOCAL_UPLOADS_DIR, filename)
            # Asegurarse de que el directorio existe
            os.makedirs(os.path.dirname(local_path), exist_ok=True)
            
            # Guardar el archivo localmente
            file_obj.seek(0)
            content = file_obj.read()
            async with aiofiles.open(local_path, "wb") as f:
                await f.write(content)
                
        return filename
    except Exception as e:
        logger.error(f"Error al subir archivo: {str(e)}")
        raise

async def get_presigned_url(filename: str, expires: int = 3600) -> str:
    """Genera una URL firmada para S3 o una URL local en desarrollo"""
    try:
        if USE_S3:  # Modo producción: URL de S3
            session = aioboto3.Session()

            # Misma lógica que en upload: usar rol de IAM por defecto
            client_args = {"region_name": S3_REGION}
            if S3_ACCESS_KEY and S3_SECRET_KEY:
                client_args["aws_access_key_id"] = S3_ACCESS_KEY
                client_args["aws_secret_access_key"] = S3_SECRET_KEY

            async with session.client("s3", **client_args) as s3:
                url = await s3.generate_presigned_url(
                    "get_object",
                    Params={"Bucket": S3_BUCKET, "Key": filename},
                    ExpiresIn=expires,
                )
            return url
        else:  # Modo desarrollo: URL local
            # Crear una URL local para acceso al archivo
            local_path = os.path.join(LOCAL_UPLOADS_DIR, filename)
            if os.path.exists(local_path):
                # En desarrollo, podemos usar una URL relativa
                return f"/uploads/{filename}"
            else:
                logger.warning(f"Archivo local no encontrado: {local_path}")
                return ""
    except Exception as e:
        logger.error(f"Error al generar URL: {str(e)}")
        return ""

async def download_file_content(filename: str) -> bytes:
    """Descarga el contenido de un archivo desde S3 o local como bytes"""
    try:
        if USE_S3:  # Modo producción: descargar de S3
            logger.info(f"Descargando archivo de S3: {filename}")
            session = aioboto3.Session()

            # Misma lógica que en upload: usar rol de IAM por defecto
            client_args = {"region_name": S3_REGION}
            if S3_ACCESS_KEY and S3_SECRET_KEY:
                client_args["aws_access_key_id"] = S3_ACCESS_KEY
                client_args["aws_secret_access_key"] = S3_SECRET_KEY

            async with session.client("s3", **client_args) as s3:
                response = await s3.get_object(Bucket=S3_BUCKET, Key=filename)
                content = await response['Body'].read()
                logger.info(f"✅ Archivo descargado de S3: {len(content)} bytes")
                return content
        else:  # Modo desarrollo: leer archivo local
            local_path = os.path.join(LOCAL_UPLOADS_DIR, filename)
            logger.info(f"Leyendo archivo local: {local_path}")
            
            if not os.path.exists(local_path):
                raise FileNotFoundError(f"Archivo local no encontrado: {local_path}")
            
            async with aiofiles.open(local_path, "rb") as f:
                content = await f.read()
                logger.info(f"✅ Archivo leído localmente: {len(content)} bytes")
                return content
                
    except Exception as e:
        logger.error(f"Error descargando archivo {filename}: {str(e)}")
        raise
