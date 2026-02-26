import requests
import sys
import json
import tempfile
from datetime import datetime

class TrioTAGAPITester:
    def __init__(self, base_url="https://fitness-event-hub.preview.emergentagent.com"):
        self.base_url = base_url
        self.api = f"{base_url}/api"
        self.token = None
        self.tests_run = 0
        self.tests_passed = 0
        self.test_results = []

    def log_test(self, name, success, details=""):
        """Log test result"""
        self.tests_run += 1
        if success:
            self.tests_passed += 1
            print(f"✅ {name}")
        else:
            print(f"❌ {name}: {details}")
        
        self.test_results.append({
            "test": name,
            "success": success,
            "details": details
        })
        return success

    def run_api_test(self, name, method, endpoint, expected_status, data=None, files=None, need_auth=False):
        """Run a single API test"""
        url = f"{self.api}/{endpoint}"
        headers = {'Content-Type': 'application/json'}
        
        if need_auth and self.token:
            headers['Authorization'] = f'Bearer {self.token}'
        
        if files:
            headers.pop('Content-Type', None)  # Let requests handle content-type for files
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=headers, timeout=10)
            elif method == 'POST':
                if files:
                    response = requests.post(url, files=files, headers=headers if need_auth else {}, timeout=10)
                else:
                    response = requests.post(url, json=data, headers=headers, timeout=10)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=headers, timeout=10)
            else:
                return self.log_test(name, False, f"Unsupported method: {method}")

            success = response.status_code == expected_status
            if success:
                return self.log_test(name, True), response.json() if response.text else {}
            else:
                return self.log_test(name, False, f"Expected {expected_status}, got {response.status_code}. Response: {response.text[:200]}"), {}

        except Exception as e:
            return self.log_test(name, False, f"Request failed: {str(e)}"), {}

    def test_login_valid(self):
        """Test login with valid credentials"""
        success, response = self.run_api_test(
            "Login with valid credentials (365run/GANG365)",
            "POST",
            "auth/login",
            200,
            data={"username": "365run", "password": "GANG365"}
        )
        if success and 'token' in response:
            self.token = response['token']
            return True
        return False

    def test_login_invalid(self):
        """Test login with invalid credentials"""
        success, _ = self.run_api_test(
            "Login with invalid credentials",
            "POST", 
            "auth/login",
            401,
            data={"username": "wrong", "password": "wrong"}
        )
        return success

    def test_stations_endpoint(self):
        """Test stations endpoint"""
        success, response = self.run_api_test(
            "Get stations list",
            "GET",
            "stations", 
            200
        )
        if success:
            stations = response.get('stations', [])
            expected_stations = [
                "Row 750m",
                "Farmers carry 24kg/16kg - 60m", 
                "Ski 750m",
                "Broad burpee jumps 40m",
                "Assault bike - 90cal",
                "Body weight lunges 40m"
            ]
            if len(stations) == 6 and all(s in stations for s in expected_stations):
                return self.log_test("Stations content validation", True)
            else:
                return self.log_test("Stations content validation", False, f"Expected 6 stations, got {len(stations)}")
        return False

    def test_csv_upload(self):
        """Test CSV upload of participants"""
        # Create test CSV content
        csv_content = "Name,Gender\nJohn Doe,M\nJane Smith,F\nBob Johnson,M\nAlice Wilson,F\nCharlie Brown,M\nDiana Prince,F"
        
        # Create temporary file
        with tempfile.NamedTemporaryFile(mode='w', suffix='.csv', delete=False) as f:
            f.write(csv_content)
            temp_file_path = f.name
        
        # Test upload
        with open(temp_file_path, 'rb') as f:
            files = {'file': ('test_participants.csv', f, 'text/csv')}
            success, response = self.run_api_test(
                "CSV upload of participants",
                "POST",
                "participants/upload",
                200,
                files=files,
                need_auth=True
            )
        
        if success:
            if response.get('total') == 6 and response.get('males') == 3 and response.get('females') == 3:
                return self.log_test("CSV upload data validation", True)
            else:
                return self.log_test("CSV upload data validation", False, f"Expected 6 total (3M/3F), got {response}")
        return False

    def test_participants_summary(self):
        """Test participants summary endpoint"""
        success, response = self.run_api_test(
            "Get participants summary",
            "GET",
            "participants/summary",
            200
        )
        if success and response.get('total', 0) > 0:
            return self.log_test("Participants summary has data", True)
        return success

    def test_team_generation_2m1f(self):
        """Test team generation with 2M/1F mode"""
        success, response = self.run_api_test(
            "Generate teams (2M/1F mode)",
            "POST", 
            "teams/generate",
            200,
            data={"mode": "2m1f"},
            need_auth=True
        )
        return success

    def test_team_generation_random(self):
        """Test team generation with random mode"""
        success, response = self.run_api_test(
            "Generate teams (random mode)",
            "POST",
            "teams/generate", 
            200,
            data={"mode": "random"},
            need_auth=True
        )
        return success

    def test_get_teams(self):
        """Test get teams endpoint"""
        success, response = self.run_api_test(
            "Get teams list",
            "GET",
            "teams",
            200
        )
        if success and len(response.get('teams', [])) > 0:
            return self.log_test("Teams list has data", True)
        return success

    def test_get_waves(self):
        """Test get waves endpoint"""
        success, response = self.run_api_test(
            "Get waves list", 
            "GET",
            "waves",
            200
        )
        if success and len(response.get('waves', [])) > 0:
            return self.log_test("Waves list has data", True)
        return success

    def test_save_time(self):
        """Test time entry saving"""
        success, _ = self.run_api_test(
            "Save team time (Team 1, Row 750m, 5:30)",
            "POST",
            "times/save",
            200,
            data={
                "team_id": 1,
                "station": "Row 750m", 
                "time_str": "5:30"
            },
            need_auth=True
        )
        return success

    def test_active_settings(self):
        """Test setting and getting active wave/station"""
        # Set active settings
        success1, _ = self.run_api_test(
            "Set active wave and station",
            "PUT",
            "settings/active", 
            200,
            data={"wave_id": 1, "station": "Row 750m"},
            need_auth=True
        )
        
        # Get active settings
        success2, response = self.run_api_test(
            "Get active settings",
            "GET",
            "settings/active",
            200
        )
        
        if success1 and success2:
            if response.get('active_wave_id') == 1 and response.get('active_station') == "Row 750m":
                return self.log_test("Active settings validation", True)
            else:
                return self.log_test("Active settings validation", False, f"Expected wave_id=1 and station='Row 750m', got {response}")
        return False

    def test_leaderboard(self):
        """Test leaderboard endpoint (public access)"""
        success, response = self.run_api_test(
            "Get leaderboard (public access)",
            "GET",
            "leaderboard",
            200
        )
        if success:
            leaderboard = response.get('leaderboard', [])
            if len(leaderboard) > 0:
                # Check if leaderboard has proper structure
                entry = leaderboard[0]
                required_fields = ['team_id', 'members', 'current_station', 'total_time_str', 'rank']
                if all(field in entry for field in required_fields):
                    return self.log_test("Leaderboard structure validation", True)
                else:
                    return self.log_test("Leaderboard structure validation", False, f"Missing required fields in leaderboard entry")
            else:
                return self.log_test("Leaderboard has data", True)  # Empty is also valid
        return success

    def test_reset_data(self):
        """Test data reset functionality"""
        success, _ = self.run_api_test(
            "Reset all data", 
            "POST",
            "reset",
            200,
            need_auth=True
        )
        return success

    def test_auth_protection(self):
        """Test that protected endpoints require authentication"""
        # Temporarily remove token
        old_token = self.token
        self.token = None
        
        success, _ = self.run_api_test(
            "Protected endpoint without auth (should fail)",
            "POST",
            "participants/upload",
            401,
            files={'file': ('test.csv', 'Name,Gender\nTest,M', 'text/csv')}
        )
        
        # Restore token
        self.token = old_token
        return success

def main():
    print("🏃 Starting Trio TAG API Tests...")
    print(f"Testing backend at: https://fitness-event-hub.preview.emergentagent.com")
    print("=" * 50)
    
    tester = TrioTAGAPITester()
    
    # Test sequence
    print("\n🔐 Authentication Tests")
    if not tester.test_login_valid():
        print("❌ Critical: Login failed, stopping tests")
        return 1
    
    tester.test_login_invalid()
    tester.test_auth_protection()
    
    print("\n📊 Basic Endpoints")
    tester.test_stations_endpoint()
    
    print("\n👥 Participant Management")
    tester.test_csv_upload()
    tester.test_participants_summary()
    
    print("\n🏆 Team Management")  
    tester.test_team_generation_2m1f()
    tester.test_get_teams()
    tester.test_get_waves()
    
    print("\n⏱️ Time Management")
    tester.test_save_time()
    tester.test_active_settings()
    
    print("\n📋 Leaderboard")
    tester.test_leaderboard()
    
    print("\n🔄 Data Management")
    tester.test_reset_data()
    
    # Test random team generation after reset
    print("\n🎲 Testing Random Teams After Reset")
    tester.test_csv_upload()  # Re-upload data
    tester.test_team_generation_random()
    
    # Final results
    print("\n" + "=" * 50)
    print(f"📊 Final Results: {tester.tests_passed}/{tester.tests_run} tests passed")
    
    if tester.tests_passed == tester.tests_run:
        print("🎉 All backend tests passed!")
        return 0
    else:
        print(f"⚠️  {tester.tests_run - tester.tests_passed} tests failed")
        return 1

if __name__ == "__main__":
    sys.exit(main())