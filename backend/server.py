from fastapi import FastAPI, APIRouter, UploadFile, File, HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
import csv
import io
import random
import jwt
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime, timezone

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

app = FastAPI()
api_router = APIRouter(prefix="/api")
security = HTTPBearer(auto_error=False)

JWT_SECRET = "trio-tag-365-secret-key"
ADMIN_USERNAME = "365run"
ADMIN_PASSWORD = "GANG365"

STATIONS = [
    "Row 750m",
    "Farmers carry 24kg/16kg - 60m",
    "Ski 750m",
    "Broad burpee jumps 40m",
    "Assault bike - 90cal",
    "Body weight lunges 40m"
]

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# --- Models ---
class LoginRequest(BaseModel):
    username: str
    password: str

class GenerateTeamsRequest(BaseModel):
    mode: str  # "2m1f" or "random"

class SaveTimeRequest(BaseModel):
    team_id: int
    station: str
    time_str: str  # MM:SS format

class SetActiveRequest(BaseModel):
    wave_id: Optional[int] = None
    station: Optional[str] = None

class MemberModel(BaseModel):
    name: str
    gender: str

class EditTeamRequest(BaseModel):
    members: List[MemberModel]

# --- Auth ---
def verify_token(credentials: HTTPAuthorizationCredentials = Depends(security)):
    if not credentials:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        payload = jwt.decode(credentials.credentials, JWT_SECRET, algorithms=["HS256"])
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

@api_router.post("/auth/login")
async def login(req: LoginRequest):
    if req.username == ADMIN_USERNAME and req.password == ADMIN_PASSWORD:
        token = jwt.encode(
            {"sub": req.username, "iat": int(datetime.now(timezone.utc).timestamp())},
            JWT_SECRET, algorithm="HS256"
        )
        return {"token": token, "username": req.username}
    raise HTTPException(status_code=401, detail="Invalid credentials")

# --- Participants ---
@api_router.post("/participants/upload")
async def upload_participants(file: UploadFile = File(...), _=Depends(verify_token)):
    content = await file.read()
    text = content.decode("utf-8")
    reader = csv.reader(io.StringIO(text))
    
    participants = []
    for row in reader:
        if len(row) < 2:
            continue
        name = row[0].strip()
        gender = row[1].strip().upper()
        if not name or gender not in ("M", "F"):
            continue
        if name.lower() == "name" and gender.lower() in ("gender", "G"):
            continue  # skip header
        participants.append({"name": name, "gender": gender})
    
    if not participants:
        raise HTTPException(status_code=400, detail="No valid participants found in CSV")
    
    # Clear existing participants and teams
    await db.participants.delete_many({})
    await db.teams.delete_many({})
    await db.waves.delete_many({})
    await db.settings.delete_many({})
    
    await db.participants.insert_many(participants)
    
    total = len(participants)
    males = sum(1 for p in participants if p["gender"] == "M")
    females = total - males
    
    return {"total": total, "males": males, "females": females, "message": f"Uploaded {total} participants"}

@api_router.get("/participants/summary")
async def get_participants_summary():
    participants = await db.participants.find({}, {"_id": 0}).to_list(10000)
    total = len(participants)
    males = sum(1 for p in participants if p["gender"] == "M")
    females = total - males
    return {"total": total, "males": males, "females": females, "participants": participants}

# --- Teams & Waves ---
@api_router.post("/teams/generate")
async def generate_teams(req: GenerateTeamsRequest, _=Depends(verify_token)):
    participants = await db.participants.find({}, {"_id": 0}).to_list(10000)
    if not participants:
        raise HTTPException(status_code=400, detail="No participants uploaded yet")
    
    await db.teams.delete_many({})
    await db.waves.delete_many({})
    await db.settings.delete_many({})
    
    teams = []
    team_id = 1
    
    if req.mode == "2m1f":
        males = [p for p in participants if p["gender"] == "M"]
        females = [p for p in participants if p["gender"] == "F"]
        random.shuffle(males)
        random.shuffle(females)
        
        while len(males) >= 2 and len(females) >= 1:
            members = [males.pop(), males.pop(), females.pop()]
            teams.append({
                "team_id": team_id,
                "members": [{"name": m["name"], "gender": m["gender"]} for m in members],
                "station_times": {}
            })
            team_id += 1
        
        # Remaining participants
        remaining = males + females
        random.shuffle(remaining)
        while len(remaining) >= 3:
            group = [remaining.pop() for _ in range(3)]
            teams.append({
                "team_id": team_id,
                "members": [{"name": m["name"], "gender": m["gender"]} for m in group],
                "station_times": {}
            })
            team_id += 1
        
        # If any left over (1-2 people), make a smaller team
        if remaining:
            teams.append({
                "team_id": team_id,
                "members": [{"name": m["name"], "gender": m["gender"]} for m in remaining],
                "station_times": {}
            })
    else:
        # Random teams
        shuffled = participants[:]
        random.shuffle(shuffled)
        while len(shuffled) >= 3:
            group = [shuffled.pop() for _ in range(3)]
            teams.append({
                "team_id": team_id,
                "members": [{"name": m["name"], "gender": m["gender"]} for m in group],
                "station_times": {}
            })
            team_id += 1
        if shuffled:
            teams.append({
                "team_id": team_id,
                "members": [{"name": m["name"], "gender": m["gender"]} for m in shuffled],
                "station_times": {}
            })
    
    if teams:
        await db.teams.insert_many(teams)
    
    # Create waves (3 teams per wave)
    waves = []
    wave_id = 1
    for i in range(0, len(teams), 3):
        wave_teams = teams[i:i+3]
        waves.append({
            "wave_id": wave_id,
            "team_ids": [t["team_id"] for t in wave_teams]
        })
        wave_id += 1
    
    if waves:
        await db.waves.insert_many(waves)
    
    return {"teams_count": len(teams), "waves_count": len(waves), "message": f"Generated {len(teams)} teams in {len(waves)} waves"}

@api_router.get("/teams")
async def get_teams():
    teams = await db.teams.find({}, {"_id": 0}).to_list(10000)
    return {"teams": teams}

@api_router.get("/waves")
async def get_waves():
    waves = await db.waves.find({}, {"_id": 0}).to_list(10000)
    teams = await db.teams.find({}, {"_id": 0}).to_list(10000)
    teams_map = {t["team_id"]: t for t in teams}
    
    result = []
    for wave in waves:
        wave_teams = [teams_map.get(tid) for tid in wave["team_ids"] if tid in teams_map]
        result.append({
            "wave_id": wave["wave_id"],
            "team_ids": wave["team_ids"],
            "teams": wave_teams
        })
    return {"waves": result}

# --- Time Entry ---
@api_router.post("/times/save")
async def save_time(req: SaveTimeRequest, _=Depends(verify_token)):
    if req.station not in STATIONS:
        raise HTTPException(status_code=400, detail=f"Invalid station: {req.station}")
    
    # Validate MM:SS format
    parts = req.time_str.split(":")
    if len(parts) != 2:
        raise HTTPException(status_code=400, detail="Time must be in MM:SS format")
    try:
        minutes = int(parts[0])
        seconds = int(parts[1])
        if minutes < 0 or seconds < 0 or seconds > 59:
            raise ValueError
        total_seconds = minutes * 60 + seconds
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid time format. Use MM:SS")
    
    await db.teams.update_one(
        {"team_id": req.team_id},
        {"$set": {f"station_times.{req.station}": {"time_str": req.time_str, "total_seconds": total_seconds}}}
    )
    
    return {"message": f"Saved {req.time_str} for Team {req.team_id} at {req.station}"}

# --- Settings ---
@api_router.put("/settings/active")
async def set_active(req: SetActiveRequest, _=Depends(verify_token)):
    update = {}
    if req.wave_id is not None:
        update["active_wave_id"] = req.wave_id
    if req.station is not None:
        update["active_station"] = req.station
    
    if update:
        await db.settings.update_one(
            {"key": "active"},
            {"$set": update},
            upsert=True
        )
    return {"message": "Active settings updated"}

@api_router.get("/settings/active")
async def get_active():
    settings = await db.settings.find_one({"key": "active"}, {"_id": 0})
    if not settings:
        return {"active_wave_id": None, "active_station": None}
    return {
        "active_wave_id": settings.get("active_wave_id"),
        "active_station": settings.get("active_station")
    }

# --- Leaderboard ---
@api_router.get("/leaderboard")
async def get_leaderboard():
    teams = await db.teams.find({}, {"_id": 0}).to_list(10000)
    settings = await db.settings.find_one({"key": "active"}, {"_id": 0})
    active_wave_id = settings.get("active_wave_id") if settings else None
    active_station = settings.get("active_station") if settings else None
    
    # Get wave info for each team
    waves = await db.waves.find({}, {"_id": 0}).to_list(10000)
    team_wave_map = {}
    active_team_ids = set()
    for wave in waves:
        for tid in wave["team_ids"]:
            team_wave_map[tid] = wave["wave_id"]
        if wave["wave_id"] == active_wave_id:
            active_team_ids = set(wave["team_ids"])
    
    leaderboard = []
    for team in teams:
        station_times = team.get("station_times", {})
        total_seconds = 0
        completed_stations = 0
        current_station = "Not Started"
        
        for station in STATIONS:
            if station in station_times:
                total_seconds += station_times[station]["total_seconds"]
                completed_stations += 1
        
        # Determine current station
        if completed_stations == 0:
            current_station = "Not Started"
        elif completed_stations >= len(STATIONS):
            current_station = "Finished"
        else:
            current_station = STATIONS[completed_stations]
        
        # Format total time
        mins = total_seconds // 60
        secs = total_seconds % 60
        total_time_str = f"{mins:02d}:{secs:02d}" if total_seconds > 0 else "--:--"
        
        leaderboard.append({
            "team_id": team["team_id"],
            "members": team["members"],
            "station_times": station_times,
            "current_station": current_station,
            "total_seconds": total_seconds,
            "total_time_str": total_time_str,
            "completed_stations": completed_stations,
            "is_active": team["team_id"] in active_team_ids,
            "wave_id": team_wave_map.get(team["team_id"])
        })
    
    # Sort: teams with times first (by total_seconds asc), then teams with no times
    with_times = [t for t in leaderboard if t["total_seconds"] > 0]
    without_times = [t for t in leaderboard if t["total_seconds"] == 0]
    with_times.sort(key=lambda x: x["total_seconds"])
    without_times.sort(key=lambda x: x["team_id"])
    
    sorted_lb = with_times + without_times
    for i, entry in enumerate(sorted_lb):
        entry["rank"] = i + 1
    
    return {
        "leaderboard": sorted_lb,
        "active_wave_id": active_wave_id,
        "active_station": active_station,
        "stations": STATIONS
    }

@api_router.get("/stations")
async def get_stations():
    return {"stations": STATIONS}

# --- Reset ---
@api_router.post("/reset")
async def reset_data(_=Depends(verify_token)):
    await db.participants.delete_many({})
    await db.teams.delete_many({})
    await db.waves.delete_many({})
    await db.settings.delete_many({})
    return {"message": "All data reset"}

# Include router
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
