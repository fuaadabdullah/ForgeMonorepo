from datetime import datetime
from typing import Optional, Any

from sqlalchemy import Column, DateTime, ForeignKey, Integer, String, Text, create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship

# declarative_base() returns a runtime base class that's not a proper
# typing-aware base for mypy. Annotate as Any to avoid mypy complaining
# about using the runtime Base as a type in class definitions.
Base: Any = declarative_base()


class Job(Base):
    __tablename__ = 'jobs'

    id = Column(String, primary_key=True)
    name = Column(String, nullable=False)
    guild = Column(String, nullable=True)
    template = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    runs = relationship('Run', back_populates='job', cascade='all, delete-orphan')


class Run(Base):
    __tablename__ = 'runs'

    id = Column(String, primary_key=True)
    job_id = Column(String, ForeignKey('jobs.id'), nullable=False)
    started_at = Column(DateTime, default=datetime.utcnow)
    status = Column(String, nullable=False, default='running')  # running, succeeded, failed
    logs = Column(Text, default='')  # JSON array of log lines

    job = relationship('Job', back_populates='runs')


# Create engine and tables
engine = create_engine('sqlite:///jobs.db')
Base.metadata.create_all(engine)
