#!/usr/bin/env python3
"""
Test script for authentication endpoints
"""
import requests

BASE_URL = "http://localhost:8000"

def test_register():
    """Test user registration"""
    print("Testing user registration...")
    data = {
        "email": "test@example.com",
        "username": "testuser",
        "password": "testpassword123",
        "full_name": "Test User"
    }

    response = requests.post(f"{BASE_URL}/auth/register", json=data)
    print(f"Register response: {response.status_code}")

    if response.status_code == 200:
        result = response.json()
        print(f"Registration successful: {result['user']['username']}")
        return result['access_token']
    else:
        print(f"Registration failed: {response.text}")
        return None

def test_login():
    """Test user login"""
    print("Testing user login...")
    data = {
        "username": "testuser",
        "password": "testpassword123"
    }

    response = requests.post(
        f"{BASE_URL}/auth/login",
        data=data,
        headers={"Content-Type": "application/x-www-form-urlencoded"}
    )
    print(f"Login response: {response.status_code}")

    if response.status_code == 200:
        result = response.json()
        print(f"Login successful: {result['user']['username']}")
        return result['access_token']
    else:
        print(f"Login failed: {response.text}")
        return None

def test_me(token):
    """Test get current user endpoint"""
    print("Testing get current user...")
    headers = {"Authorization": f"Bearer {token}"}
    response = requests.get(f"{BASE_URL}/auth/me", headers=headers)
    print(f"Me response: {response.status_code}")

    if response.status_code == 200:
        result = response.json()
        print(f"Current user: {result}")
    else:
        print(f"Get me failed: {response.text}")

def test_protected_route(token):
    """Test a protected route"""
    print("Testing protected route...")
    headers = {"Authorization": f"Bearer {token}"}
    response = requests.get(f"{BASE_URL}/v1/models", headers=headers)
    print(f"Protected route response: {response.status_code}")

    if response.status_code == 200:
        result = response.json()
        print(f"Models: {len(result.get('data', []))} models available")
    else:
        print(f"Protected route failed: {response.text}")

if __name__ == "__main__":
    print("Starting authentication tests...")

    # Test registration
    token = test_register()
    if not token:
        # If registration fails, try login (user might already exist)
        token = test_login()

    if token:
        # Test authenticated endpoints
        test_me(token)
        test_protected_route(token)
    else:
        print("Authentication failed, cannot test protected endpoints")

    print("Authentication tests completed.")
