#!/usr/bin/env python3
"""Initialize database with a test user"""
import sys
sys.path.insert(0, '.')

from app.db.session import SessionLocal
from app.db.models.user import User
from app.services.auth_service import AuthService
from uuid import uuid4

# Create test organization and user
org_id = str(uuid4())
test_email = "demo@clinicalvision.ai"
test_password = "Demo123!"

print(f"Creating test user: {test_email}")
print(f"Password: {test_password}")
print(f"Organization ID: {org_id}")

db = SessionLocal()
try:
    # Check if user exists
    existing = db.query(User).filter(User.email == test_email).first()
    if existing:
        print("User already exists!")
    else:
        # Create user
        from app.schemas.auth import RegisterRequest
        auth_service = AuthService(db)
        
        request = RegisterRequest(
            email=test_email,
            password=test_password,
            first_name="Demo",
            last_name="User",
            role="radiologist",
            organization_id=org_id
        )
        
        user = auth_service.register(request)
        print(f"✓ User created successfully: {user.email}")
        print(f"  ID: {user.id}")
        print(f"  Role: {user.role}")
        
except Exception as e:
    print(f"✗ Error: {e}")
    import traceback
    traceback.print_exc()
finally:
    db.close()

print("\nYou can now login with:")
print(f"  Email: {test_email}")
print(f"  Password: {test_password}")
