from datetime import datetime

import pytest
from fastapi.testclient import TestClient

from forge.api.auth import get_current_active_user
from forge.main import app
from forge.models.user import User


# Create a mock user for testing
def mock_get_current_active_user():
    return User(
        id=1,
        username='test_user',
        email='test@example.com',
        is_active=True,
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow(),
    )


@pytest.fixture
def client():
    """Test client fixture with auth bypassed."""
    # Override the auth dependency for testing
    app.dependency_overrides[get_current_active_user] = mock_get_current_active_user
    return TestClient(app)
