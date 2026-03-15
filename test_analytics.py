#!/usr/bin/env python3
"""Test all analytics endpoints from inside the container."""
import requests
import json

BASE = "http://localhost:8000"

# Login
resp = requests.post(f"{BASE}/api/v1/auth/login", json={
    "email": "demo@clinicalvision.ai",
    "password": "Demo123!"
})
if resp.status_code != 200:
    print(f"LOGIN FAILED: {resp.status_code} {resp.text[:200]}")
    exit(1)

token = resp.json()["access_token"]
headers = {"Authorization": f"Bearer {token}"}
print(f"Logged in OK. Token: {token[:20]}...")

# Test each analytics endpoint
endpoints = [
    ("/api/v1/analytics/overview?period=all", "OVERVIEW"),
    ("/api/v1/analytics/performance?period=all", "PERFORMANCE"),
    ("/api/v1/analytics/model-intelligence?period=all", "MODEL-INTELLIGENCE"),
    ("/api/v1/analytics/system-health", "SYSTEM-HEALTH"),
]

for url, name in endpoints:
    print(f"\n{'='*60}")
    print(f"=== {name} ===")
    print(f"{'='*60}")
    try:
        resp = requests.get(f"{BASE}{url}", headers=headers, timeout=30)
        if resp.status_code != 200:
            print(f"  ERROR: {resp.status_code} {resp.text[:300]}")
            continue
        data = resp.json()
        for key, val in data.items():
            if isinstance(val, list):
                print(f"  {key}: {len(val)} items")
                for item in val[:3]:
                    print(f"    {json.dumps(item)[:180]}")
            elif isinstance(val, dict):
                print(f"  {key}: {json.dumps(val)[:200]}")
            else:
                print(f"  {key}: {val}")
    except Exception as e:
        print(f"  EXCEPTION: {e}")
