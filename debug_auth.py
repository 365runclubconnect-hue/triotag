import requests
import jwt
from datetime import datetime, timezone

# Test JWT token creation and validation
JWT_SECRET = "trio-tag-365-secret-key"
base_url = "https://fitness-event-hub.preview.emergentagent.com"

# Login first to get token
login_response = requests.post(f"{base_url}/api/auth/login", 
                              json={"username": "365run", "password": "GANG365"})
print(f"Login status: {login_response.status_code}")

if login_response.status_code == 200:
    data = login_response.json()
    token = data['token']
    print(f"Token: {token}")
    
    # Try to decode the token locally
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=["HS256"])
        print(f"Decoded payload: {payload}")
    except Exception as e:
        print(f"Token decode error: {e}")
    
    # Test a simple authenticated endpoint
    headers = {'Authorization': f'Bearer {token}'}
    test_response = requests.get(f"{base_url}/api/participants/summary", headers=headers)
    print(f"Participants/summary with auth: {test_response.status_code}")
    
    # Test a protected endpoint that's failing
    csv_data = "Name,Gender\nTest User,M"
    files = {'file': ('test.csv', csv_data, 'text/csv')}
    upload_response = requests.post(f"{base_url}/api/participants/upload", 
                                   files=files, 
                                   headers=headers)
    print(f"Upload with auth: {upload_response.status_code}")
    if upload_response.status_code != 200:
        print(f"Upload error: {upload_response.text}")
else:
    print(f"Login failed: {login_response.text}")