#!/usr/bin/env python3
"""
Comprehensive integration test for Phase 5 features:
- User authentication (register/login)
- Protected API endpoints (RAG, providers, ollama, litellm, analytics)
- Vector database integration
"""

from typing import Any

import requests


def test_auth_flow(base_url: str = 'http://localhost:8000') -> str | None:
    """Test user registration and login flow."""
    print('🔐 Testing Authentication Flow...')

    # Test user registration
    register_data = {
        'email': 'test@example.com',
        'username': 'testuser',
        'password': 'testpass123',
        'full_name': 'Test User',
        'is_active': True,
        'is_superuser': False,
    }

    try:
        response = requests.post(f'{base_url}/auth/register', json=register_data)
        if response.status_code == 200:
            print('✅ User registration successful')
        else:
            print(f'❌ User registration failed: {response.status_code} - {response.text}')
            return None
    except Exception as e:
        print(f'❌ User registration error: {e}')
        return None

    # Test user login
    login_data = {'username': 'testuser', 'password': 'testpass123'}

    try:
        response = requests.post(f'{base_url}/auth/login', data=login_data)
        if response.status_code == 200:
            token_data = response.json()
            access_token = token_data.get('access_token')
            if access_token:
                print('✅ User login successful')
                return access_token
            else:
                print('❌ No access token in login response')
                return None
        else:
            print(f'❌ User login failed: {response.status_code} - {response.text}')
            return None
    except Exception as e:
        print(f'❌ User login error: {e}')
        return None


def test_protected_endpoint(
    endpoint: str,
    method: str = 'GET',
    token: str | None = None,
    data: dict[str, Any] | None = None,
    description: str = '',
) -> bool:
    """Test a protected endpoint with authentication."""
    base_url = 'http://localhost:8000'
    url = f'{base_url}{endpoint}'

    headers = {}
    if token:
        headers['Authorization'] = f'Bearer {token}'

    try:
        if method == 'GET':
            response = requests.get(url, headers=headers)
        elif method == 'POST':
            response = requests.post(url, headers=headers, json=data)
        elif method == 'DELETE':
            response = requests.delete(url, headers=headers)
        else:
            print(f'❌ Unsupported method: {method}')
            return False

        if response.status_code == 200:
            print(f'✅ {description} - Success')
            return True
        elif response.status_code == 401:
            print(f'❌ {description} - Authentication required (401)')
            return False
        else:
            print(f'❌ {description} - Failed: {response.status_code} - {response.text}')
            return False
    except Exception as e:
        print(f'❌ {description} - Error: {e}')
        return False


def test_without_auth(endpoint: str, description: str) -> bool:
    """Test that endpoint requires authentication."""
    print(f'🔒 Testing {description} without auth...')
    return not test_protected_endpoint(endpoint, description=f'{description} (should fail)')


def test_with_auth(
    endpoint: str,
    method: str = 'GET',
    token: str | None = None,
    data: dict[str, Any] | None = None,
    description: str = '',
) -> bool:
    """Test endpoint with authentication."""
    print(f'🔓 Testing {description} with auth...')
    return test_protected_endpoint(endpoint, method, token, data, description)


def main():
    """Run comprehensive integration tests."""
    print('🚀 Starting Phase 5 Integration Tests')
    print('=' * 50)

    base_url = 'http://localhost:8000'

    # Check if server is running
    try:
        response = requests.get(f'{base_url}/health', timeout=5)
        if response.status_code != 200:
            print('❌ Server health check failed. Is the server running?')
            return
        print('✅ Server is healthy')
    except Exception as e:
        print(f'❌ Cannot connect to server: {e}')
        print('💡 Make sure to run: pnpm dev (in ForgeTM/apps/frontend) and uvicorn (in backend)')
        return

    # Test authentication flow
    access_token = test_auth_flow(base_url)
    if not access_token:
        print('❌ Authentication tests failed. Cannot proceed with protected endpoint tests.')
        return

    print('\n' + '=' * 50)
    print('🛡️  Testing Protected Endpoints')
    print('=' * 50)

    # Test that endpoints require authentication
    auth_tests = [
        ('/rag/documents', 'RAG list documents'),
        ('/providers/health', 'Providers health'),
        ('/ollama/models', 'Ollama list models'),
        ('/v1/models', 'LiteLLM list models'),
        ('/v1/analytics', 'Analytics'),
    ]

    unauth_success = True
    for endpoint, description in auth_tests:
        if not test_without_auth(endpoint, description):
            unauth_success = False

    print('\n' + '=' * 50)
    print('🔓 Testing Endpoints With Authentication')
    print('=' * 50)

    # Test endpoints with authentication
    auth_tests_with_token = [
        ('/rag/documents', 'GET', None, 'RAG list documents'),
        ('/providers/health', 'GET', None, 'Providers health'),
        ('/v1/models', 'GET', None, 'LiteLLM list models'),
        ('/v1/providers', 'GET', None, 'LiteLLM providers'),
        ('/v1/analytics', 'GET', None, 'Analytics'),
        ('/rag/stats', 'GET', None, 'RAG stats'),
        ('/auth/me', 'GET', None, 'Get current user'),
    ]

    auth_success = True
    for endpoint, method, data, description in auth_tests_with_token:
        if not test_with_auth(endpoint, method, access_token, data, description):
            auth_success = False

    print('\n' + '=' * 50)
    print('📊 Testing Vector Database Integration')
    print('=' * 50)

    # Test vector database functionality
    vector_tests = [
        ('/rag/documents/test-data', 'POST', None, 'Add test documents'),
        ('/rag/search', 'POST', {'query': 'ForgeTM platform', 'limit': 5}, 'Search documents'),
    ]

    vector_success = True
    for endpoint, method, data, description in vector_tests:
        if not test_with_auth(endpoint, method, access_token, data, description):
            vector_success = False

    print('\n' + '=' * 50)
    print('📋 Test Results Summary')
    print('=' * 50)

    all_passed = unauth_success and auth_success and vector_success

    print(f'Authentication Required Tests: {"✅ PASSED" if unauth_success else "❌ FAILED"}')
    print(f'Authenticated Access Tests: {"✅ PASSED" if auth_success else "❌ FAILED"}')
    print(f'Vector Database Tests: {"✅ PASSED" if vector_success else "❌ FAILED"}')

    if all_passed:
        print('\n🎉 ALL TESTS PASSED! Phase 5 implementation is complete.')
        print('✅ User authentication system working')
        print('✅ All API endpoints properly protected')
        print('✅ Vector database integration functional')
        print('✅ JWT token authentication working')
    else:
        print('\n⚠️  Some tests failed. Check the output above for details.')

    print('\n' + '=' * 50)


if __name__ == '__main__':
    main()
