"""
Project file model.
Represents uploaded files associated with projects.
"""

from sqlalchemy import Column, ForeignKey, Integer, String, Text
from sqlalchemy.dialects.postgresql import JSON, UUID
from sqlalchemy.orm import relationship

from app.models.base import BaseModel


class ProjectFile(BaseModel):
    """
    Project file model representing uploaded documents.
    
    Stores file metadata, processed content, and AI analysis results.
    
    Attributes:
        project_id: Parent project
        filename: Original filename
        file_path: Storage path (S3 key or local path)
        file_size: File size in bytes
        mime_type: MIME type (e.g., application/pdf)
        category: File category (technical, regulatory, financial, other)
        description: Optional file description
        processed_text: Extracted text content
        ai_analysis: AI analysis results (JSON)
        file_metadata: Additional file metadata (JSON)
    """
    
    __tablename__ = "project_files"
    
    project_id = Column(
        UUID(as_uuid=True),
        ForeignKey("projects.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    
    # File Information
    filename = Column(String(255), nullable=False)
    
    file_path = Column(
        String(500),
        nullable=False,
        comment="Storage path (S3 key or local path)",
    )
    
    file_size = Column(
        Integer,
        nullable=True,
        comment="File size in bytes",
    )
    
    file_type = Column(
        String(20),
        nullable=True,
        comment="File extension without dot (pdf, docx, xlsx)",
    )
    
    mime_type = Column(
        String(100),
        nullable=True,
        comment="MIME type (e.g., application/pdf, application/vnd.openxmlformats-officedocument.wordprocessingml.document)",
    )
    
    uploaded_by = Column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
        comment="User who uploaded the file",
    )
    
    # Classification
    category = Column(
        String(50),
        default="other",
        comment="technical, regulatory, financial, other",
    )
    
    description = Column(Text, nullable=True)
    
    # Processing Results
    processed_text = Column(
        Text,
        nullable=True,
        comment="Extracted text content from document",
    )
    
    ai_analysis = Column(
        JSON,
        nullable=True,
        comment="AI analysis results and insights",
    )
    
    # Metadata (renamed to avoid SQLAlchemy reserved name conflict)
    file_metadata = Column(
        JSON,
        nullable=True,
        comment="Additional metadata (page count, dimensions, etc.)",
    )
    
    # Relationships
    project = relationship("Project", back_populates="files")
    
    def __repr__(self) -> str:
        return f"<ProjectFile {self.filename}>"
