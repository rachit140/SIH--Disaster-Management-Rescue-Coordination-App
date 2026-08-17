import os
import uuid
import secrets
import string
import logging
from pathlib import Path
from datetime import datetime, timedelta, timezone
from typing import List, Optional

import bcrypt
import jwt
import httpx
from dotenv import load_dotenv
from fastapi import FastAPI, APIRouter, HTTPException, Depends, Request, Query
from fastapi.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, EmailStr, Field

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

MONGO_URL = os.environ["MONGO_URL"]
DB_NAME = os.environ["DB_NAME"]
JWT_SECRET = os.environ["JWT_SECRET"]
JWT_ALG = os.environ["JWT_ALGORITHM"]
TOKEN_MINUTES = int(os.environ["ACCESS_TOKEN_MINUTES"])
OTP_MINUTES = int(os.environ["OTP_MINUTES"])
DEV_RETURN_OTP = os.environ.get("DEV_RETURN_OTP", "false").lower() == "true"
EMERGENT_OAUTH_URL = os.environ["EMERGENT_OAUTH_URL"]

client = AsyncIOMotorClient(MONGO_URL)
db = client[DB_NAME]

app = FastAPI(title="SAHAYSETU API")
api = APIRouter(prefix="/api")

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("sahaysetu")

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
def now_utc() -> datetime:
    return datetime.now(timezone.utc)


def hash_pw(pw: str) -> str:
    return bcrypt.hashpw(pw.encode(), bcrypt.gensalt(rounds=12)).decode()


def check_pw(pw: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(pw.encode(), hashed.encode())
    except (ValueError, TypeError):
        return False


def make_jwt(user_id: str) -> str:
    payload = {"sub": user_id, "iat": now_utc(), "exp": now_utc() + timedelta(minutes=TOKEN_MINUTES)}
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALG)


def gen_otp() -> str:
    return "".join(secrets.choice(string.digits) for _ in range(6))


def public_user(u: dict) -> dict:
    return {
        "user_id": u["user_id"],
        "email": u["email"],
        "name": u.get("name", ""),
        "role": u.get("role"),
        "verified": u.get("verified", False),
        "picture": u.get("picture", ""),
        "provider": u.get("provider", "password"),
    }


async def get_current_user(request: Request) -> dict:
    auth = request.headers.get("Authorization", "")
    if not auth.lower().startswith("bearer "):
        raise HTTPException(401, "Not authenticated")
    token = auth.split(" ", 1)[1].strip()

    # 1) Google/Emergent session token
    sess = await db.user_sessions.find_one({"session_token": token})
    if sess:
        exp = sess.get("expires_at")
        if exp is not None:
            if exp.tzinfo is None:
                exp = exp.replace(tzinfo=timezone.utc)
            if exp > now_utc():
                user = await db.users.find_one({"user_id": sess["user_id"]}, {"_id": 0})
                if user:
                    return user

    # 2) Password JWT
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALG])
        user = await db.users.find_one({"user_id": payload.get("sub")}, {"_id": 0})
        if user:
            return user
    except jwt.InvalidTokenError:
        pass
    raise HTTPException(401, "Invalid or expired token")


# ---------------------------------------------------------------------------
# Models
# ---------------------------------------------------------------------------
class RegisterIn(BaseModel):
    name: str
    email: EmailStr
    password: str = Field(min_length=6, max_length=128)
    role: Optional[str] = None


class LoginIn(BaseModel):
    email: EmailStr
    password: str


class OTPIn(BaseModel):
    email: EmailStr
    code: str = Field(pattern=r"^\d{6}$")


class ForgotIn(BaseModel):
    email: EmailStr


class ResetIn(BaseModel):
    email: EmailStr
    code: str = Field(pattern=r"^\d{6}$")
    new_password: str = Field(min_length=6, max_length=128)


class SessionIn(BaseModel):
    session_id: str


class RoleIn(BaseModel):
    role: str


class GovLoginIn(BaseModel):
    gov_id: str
    name: Optional[str] = None


class IncidentIn(BaseModel):
    title: str
    type: str
    location: str
    region: str
    latitude: float
    longitude: float
    severity: str
    description: str = ""
    people_affected: int = 0


class StatusIn(BaseModel):
    status: str


class UpdateIn(BaseModel):
    message: str
    author: str = "Coordinator"


# ---------------------------------------------------------------------------
# Auth endpoints
# ---------------------------------------------------------------------------
@api.post("/auth/register", status_code=201)
async def register(body: RegisterIn):
    email = body.email.lower()
    if await db.users.find_one({"email": email}):
        raise HTTPException(409, "Email already registered")
    uid = f"usr_{uuid.uuid4().hex[:12]}"
    await db.users.insert_one({
        "user_id": uid, "email": email, "name": body.name,
        "password_hash": hash_pw(body.password), "role": body.role,
        "verified": False, "provider": "password", "picture": "",
        "created_at": now_utc(),
    })
    code = gen_otp()
    await db.otps.replace_one(
        {"email": email},
        {"email": email, "code_hash": hash_pw(code), "purpose": "verify",
         "expires_at": now_utc() + timedelta(minutes=OTP_MINUTES)},
        upsert=True,
    )
    resp = {"message": "Verification code sent", "user_id": uid, "email": email}
    if DEV_RETURN_OTP:
        resp["dev_code"] = code
    return resp


@api.post("/auth/verify-otp")
async def verify_otp(body: OTPIn):
    email = body.email.lower()
    otp = await db.otps.find_one({"email": email})
    exp = otp["expires_at"].replace(tzinfo=timezone.utc) if otp and otp["expires_at"].tzinfo is None else (otp["expires_at"] if otp else None)
    if not otp or exp <= now_utc() or not check_pw(body.code, otp["code_hash"]):
        raise HTTPException(400, "Invalid or expired verification code")
    user = await db.users.find_one_and_update(
        {"email": email}, {"$set": {"verified": True}}, return_document=True)
    await db.otps.delete_one({"_id": otp["_id"]})
    if not user:
        raise HTTPException(404, "User not found")
    return {"message": "Email verified", "access_token": make_jwt(user["user_id"]),
            "token_type": "bearer", "user": public_user(user)}


@api.post("/auth/login")
async def login(body: LoginIn):
    email = body.email.lower()
    user = await db.users.find_one({"email": email})
    valid = check_pw(body.password, user["password_hash"]) if user and user.get("password_hash") else check_pw(body.password, hash_pw("x"))
    if not user or not valid:
        raise HTTPException(401, "Incorrect email or password")
    return {"access_token": make_jwt(user["user_id"]), "token_type": "bearer",
            "user": public_user(user)}


@api.post("/auth/forgot-password")
async def forgot_password(body: ForgotIn):
    email = body.email.lower()
    user = await db.users.find_one({"email": email})
    # Always respond success (avoid enumeration), only issue code if user exists.
    resp = {"message": "If the account exists, a reset code was sent"}
    if user:
        code = gen_otp()
        await db.otps.replace_one(
            {"email": email},
            {"email": email, "code_hash": hash_pw(code), "purpose": "reset",
             "expires_at": now_utc() + timedelta(minutes=OTP_MINUTES)},
            upsert=True,
        )
        if DEV_RETURN_OTP:
            resp["dev_code"] = code
    return resp


@api.post("/auth/reset-password")
async def reset_password(body: ResetIn):
    email = body.email.lower()
    otp = await db.otps.find_one({"email": email})
    exp = otp["expires_at"].replace(tzinfo=timezone.utc) if otp and otp["expires_at"].tzinfo is None else (otp["expires_at"] if otp else None)
    if not otp or exp <= now_utc() or not check_pw(body.code, otp["code_hash"]):
        raise HTTPException(400, "Invalid or expired reset code")
    await db.users.update_one({"email": email}, {"$set": {"password_hash": hash_pw(body.new_password), "verified": True}})
    await db.otps.delete_one({"_id": otp["_id"]})
    return {"message": "Password reset successful"}


@api.post("/auth/gov-login")
async def gov_login(body: GovLoginIn):
    # Simulated Government ID single sign-on for demo purposes.
    gid = body.gov_id.strip().upper()
    email = f"{gid.lower()}@gov.sahaysetu.in"
    user = await db.users.find_one({"email": email})
    if not user:
        uid = f"usr_{uuid.uuid4().hex[:12]}"
        doc = {"user_id": uid, "email": email, "name": body.name or f"Officer {gid[-4:]}",
               "role": "coordinator", "verified": True, "provider": "gov", "picture": "",
               "gov_id": gid, "created_at": now_utc()}
        await db.users.insert_one(doc)
        user = doc
    return {"access_token": make_jwt(user["user_id"]), "token_type": "bearer",
            "user": public_user(user)}


@api.post("/auth/session")
async def google_session(body: SessionIn):
    async with httpx.AsyncClient(timeout=15) as hc:
        r = await hc.get(EMERGENT_OAUTH_URL, headers={"X-Session-ID": body.session_id})
    if r.status_code != 200:
        raise HTTPException(401, "Invalid session")
    data = r.json()
    email = data["email"].lower()
    session_token = data["session_token"]
    user = await db.users.find_one({"email": email})
    if not user:
        uid = f"usr_{uuid.uuid4().hex[:12]}"
        doc = {"user_id": uid, "email": email, "name": data.get("name", ""),
               "role": None, "verified": True, "provider": "google",
               "picture": data.get("picture", ""), "created_at": now_utc()}
        await db.users.insert_one(doc)
        user = doc
    await db.user_sessions.insert_one({
        "session_token": session_token, "user_id": user["user_id"],
        "created_at": now_utc(), "expires_at": now_utc() + timedelta(days=7)})
    return {"session_token": session_token, "user": public_user(user)}


@api.get("/auth/me")
async def me(user: dict = Depends(get_current_user)):
    return public_user(user)


@api.post("/auth/role")
async def set_role(body: RoleIn, user: dict = Depends(get_current_user)):
    await db.users.update_one({"user_id": user["user_id"]}, {"$set": {"role": body.role}})
    user["role"] = body.role
    return public_user(user)


@api.post("/auth/logout")
async def logout(request: Request, user: dict = Depends(get_current_user)):
    auth = request.headers.get("Authorization", "")
    token = auth.split(" ", 1)[1].strip() if " " in auth else ""
    await db.user_sessions.delete_one({"session_token": token})
    return {"message": "Logged out"}


# ---------------------------------------------------------------------------
# Domain: dashboard / incidents / map
# ---------------------------------------------------------------------------
@api.get("/")
async def root():
    return {"app": "SAHAYSETU", "status": "online"}


@api.get("/dashboard/summary")
async def dashboard_summary(user: dict = Depends(get_current_user)):
    incidents = await db.incidents.find({}, {"_id": 0}).sort("created_at", -1).to_list(200)
    active = [i for i in incidents if i["status"] == "Active"]
    people = sum(i.get("people_affected", 0) for i in incidents)
    rescued = sum(i.get("rescued", 0) for i in incidents)
    volunteers = sum(i.get("volunteers", 0) for i in active)
    return {
        "kpis": {
            "active_incidents": {"value": len(active), "change": 8, "trend": "up"},
            "people_affected": {"value": people, "change": 12, "trend": "up"},
            "volunteers_on_field": {"value": max(volunteers, 823), "change": 5, "trend": "up"},
            "rescues_completed": {"value": rescued, "change": 15, "trend": "up"},
        },
        "recent_incidents": incidents[:6],
        "by_severity": {
            "High": len([i for i in active if i["severity"] == "High"]),
            "Medium": len([i for i in active if i["severity"] == "Medium"]),
            "Low": len([i for i in active if i["severity"] == "Low"]),
            "Resolved": len([i for i in incidents if i["status"] == "Resolved"]),
        },
    }


@api.get("/incidents")
async def list_incidents(severity: Optional[str] = None, status: Optional[str] = None,
                         search: Optional[str] = None, user: dict = Depends(get_current_user)):
    q: dict = {}
    if severity and severity != "All":
        q["severity"] = severity
    if status and status != "All":
        q["status"] = status
    if search:
        q["$or"] = [{"title": {"$regex": search, "$options": "i"}},
                    {"location": {"$regex": search, "$options": "i"}},
                    {"region": {"$regex": search, "$options": "i"}}]
    return await db.incidents.find(q, {"_id": 0}).sort("created_at", -1).to_list(200)


@api.get("/incidents/{incident_id}")
async def get_incident(incident_id: str, user: dict = Depends(get_current_user)):
    inc = await db.incidents.find_one({"id": incident_id}, {"_id": 0})
    if not inc:
        raise HTTPException(404, "Incident not found")
    return inc


@api.post("/incidents", status_code=201)
async def create_incident(body: IncidentIn, user: dict = Depends(get_current_user)):
    doc = body.dict()
    doc.update({
        "id": f"INC-{uuid.uuid4().hex[:6].upper()}", "status": "Active",
        "rescued": 0, "volunteers": 0, "teams_deployed": 0, "resources_used": 0,
        "reported_by": user.get("name", "Coordinator"),
        "time": now_utc().strftime("%I:%M %p"), "created_at": now_utc(),
        "updates": [{"message": "Incident reported", "author": user.get("name", "Coordinator"),
                     "time": now_utc().strftime("%I:%M %p, %d %b")}],
    })
    await db.incidents.insert_one(doc)
    doc.pop("_id", None)
    return doc


@api.patch("/incidents/{incident_id}")
async def update_incident(incident_id: str, body: StatusIn, user: dict = Depends(get_current_user)):
    inc = await db.incidents.find_one_and_update(
        {"id": incident_id}, {"$set": {"status": body.status}}, return_document=True)
    if not inc:
        raise HTTPException(404, "Incident not found")
    inc.pop("_id", None)
    return inc


@api.post("/incidents/{incident_id}/updates")
async def add_update(incident_id: str, body: UpdateIn, user: dict = Depends(get_current_user)):
    entry = {"message": body.message, "author": body.author,
             "time": now_utc().strftime("%I:%M %p, %d %b")}
    inc = await db.incidents.find_one_and_update(
        {"id": incident_id}, {"$push": {"updates": entry}}, return_document=True)
    if not inc:
        raise HTTPException(404, "Incident not found")
    inc.pop("_id", None)
    return inc


@api.get("/map/markers")
async def map_markers(user: dict = Depends(get_current_user)):
    incidents = await db.incidents.find({}, {"_id": 0}).to_list(200)
    teams = await db.teams.find({}, {"_id": 0}).to_list(200)
    shelters = await db.shelters.find({}, {"_id": 0}).to_list(200)
    hospitals = await db.hospitals.find({}, {"_id": 0}).to_list(200)
    resources = await db.resources.find({}, {"_id": 0}).to_list(200)
    return {"incidents": incidents, "teams": teams, "shelters": shelters,
            "hospitals": hospitals, "resources": resources}


# ---------------------------------------------------------------------------
# Seed demo data
# ---------------------------------------------------------------------------
INCIDENTS_SEED = [
    ("Flood in Brahmaputra Area", "flood", "Guwahati, Assam", "Assam", 26.1445, 91.7362, "High", "Active", 640, 210, 120, 6, "Rising Brahmaputra water levels have submerged low-lying areas. Evacuation and relief camps are active.", "10:30 AM"),
    ("Earthquake in Joshimath", "earthquake", "Joshimath, Uttarakhand", "Uttarakhand", 30.5556, 79.5626, "Medium", "Active", 320, 95, 60, 3, "Land subsidence and structural cracks reported across multiple buildings.", "09:15 AM"),
    ("Fire in Residential Building", "fire", "Connaught Place, Delhi", "Delhi", 28.6315, 77.2167, "High", "Active", 85, 60, 40, 4, "Multi-storey residential fire; fire tenders and rescue teams on-site.", "08:45 AM"),
    ("Landslide in Munnar", "landslide", "Munnar, Kerala", "Kerala", 10.0889, 77.0595, "Medium", "Active", 150, 40, 35, 2, "Heavy rain triggered landslide blocking hill roads and isolating villages.", "07:30 AM"),
    ("Road Accident on NH-48", "accident", "Mumbai-Pune Expressway", "Maharashtra", 18.75, 73.40, "Low", "Active", 12, 8, 10, 1, "Multi-vehicle collision; traffic diverted, casualties being treated.", "06:50 AM"),
    ("Cyclone Landfall Warning", "cyclone", "Puri, Odisha", "Odisha", 19.8135, 85.8312, "High", "Active", 520, 130, 90, 5, "Severe cyclonic storm approaching coast; mass evacuation underway.", "05:20 AM"),
    ("Urban Flooding", "flood", "Patna, Bihar", "Bihar", 25.5941, 85.1376, "Medium", "Active", 210, 70, 45, 2, "Waterlogging across low-lying wards after continuous rainfall.", "Yesterday"),
    ("Building Collapse", "collapse", "Anna Nagar, Chennai", "Tamil Nadu", 13.0827, 80.2707, "High", "Active", 34, 22, 30, 3, "Under-construction building collapsed; search and rescue in progress.", "Yesterday"),
    ("Industrial Gas Leak", "hazmat", "Visakhapatnam", "Andhra Pradesh", 17.6868, 83.2185, "High", "Active", 95, 55, 50, 4, "Chemical gas leak near industrial zone; evacuation radius enforced.", "Yesterday"),
    ("Heatwave Emergency", "heatwave", "Nagpur", "Maharashtra", 21.1458, 79.0882, "Medium", "Active", 180, 30, 20, 1, "Extreme heat; cooling centres and hydration points activated.", "Yesterday"),
    ("Flash Flood", "flood", "Chamoli", "Uttarakhand", 30.4000, 79.3200, "High", "Active", 140, 48, 38, 3, "Glacial lake outburst flood; downstream villages evacuated.", "2 days ago"),
    ("Coastal Storm Surge", "cyclone", "Digha", "West Bengal", 21.6270, 87.5090, "Medium", "Active", 60, 25, 18, 1, "Tidal surge flooding coastal settlements.", "2 days ago"),
    ("Warehouse Fire (Contained)", "fire", "Bhiwandi", "Maharashtra", 19.2967, 73.0630, "Low", "Resolved", 8, 8, 12, 2, "Warehouse fire fully contained; no casualties.", "3 days ago"),
    ("Bridge Damage (Repaired)", "collapse", "Kota", "Rajasthan", 25.2138, 75.8648, "Low", "Resolved", 5, 5, 8, 1, "Flood-damaged bridge repaired and reopened.", "4 days ago"),
]

TEAMS_SEED = [
    ("NDRF Team Alpha", 26.15, 91.74, "Deployed", 18),
    ("SDRF Team Bravo", 30.55, 79.56, "Deployed", 12),
    ("Delhi Fire & Rescue", 28.63, 77.22, "Deployed", 14),
    ("Coast Guard Unit 4", 19.81, 85.83, "En Route", 10),
    ("Army Relief Column", 13.08, 80.27, "Standby", 22),
]

SHELTERS_SEED = [
    ("Community Center 4", 26.16, 91.72, 500, 380),
    ("Govt School Shelter", 30.56, 79.57, 300, 140),
    ("Stadium Relief Camp", 19.80, 85.82, 1200, 640),
    ("Municipal Hall", 13.07, 80.26, 400, 220),
]

HOSPITALS_SEED = [
    ("GMCH Guwahati", 26.14, 91.73),
    ("AIIMS Rishikesh", 30.10, 78.29),
    ("Apollo Chennai", 13.06, 80.25),
    ("KGH Visakhapatnam", 17.71, 83.30),
]

RESOURCES_SEED = [
    ("Relief Supply Depot", 26.13, 91.75, "Food & Water"),
    ("Medical Stockpile", 28.62, 77.21, "Medical"),
    ("Rescue Equipment Cache", 19.82, 85.84, "Equipment"),
]


@app.on_event("startup")
async def seed():
    try:
        await db.users.create_index("email", unique=True)
        await db.users.create_index("user_id", unique=True)
        await db.user_sessions.create_index("session_token", unique=True)
        await db.otps.create_index("expires_at", expireAfterSeconds=0)

        if await db.incidents.count_documents({}) == 0:
            docs = []
            for i, s in enumerate(INCIDENTS_SEED):
                (title, typ, loc, region, lat, lng, sev, status, aff, resc, vol, teams, desc, tm) = s
                docs.append({
                    "id": f"INC-{1000 + i}", "title": title, "type": typ, "location": loc,
                    "region": region, "latitude": lat, "longitude": lng, "severity": sev,
                    "status": status, "people_affected": aff, "rescued": resc, "volunteers": vol,
                    "teams_deployed": teams, "resources_used": teams * 20 + 40,
                    "description": desc, "time": tm, "reported_by": "Field Coordinator",
                    "created_at": now_utc() - timedelta(minutes=i * 37),
                    "updates": [
                        {"message": "Incident reported and triaged", "author": "Control Room", "time": tm},
                        {"message": f"{teams} rescue team(s) deployed to site", "author": "Ops Desk", "time": tm},
                        {"message": f"{resc} people rescued so far", "author": "NDRF", "time": tm},
                    ],
                })
            await db.incidents.insert_many(docs)

        if await db.teams.count_documents({}) == 0:
            await db.teams.insert_many([
                {"id": f"TEAM-{i}", "name": n, "latitude": la, "longitude": lo, "status": st, "members": m}
                for i, (n, la, lo, st, m) in enumerate(TEAMS_SEED)])
        if await db.shelters.count_documents({}) == 0:
            await db.shelters.insert_many([
                {"id": f"SHL-{i}", "name": n, "latitude": la, "longitude": lo, "capacity": c, "occupancy": o}
                for i, (n, la, lo, c, o) in enumerate(SHELTERS_SEED)])
        if await db.hospitals.count_documents({}) == 0:
            await db.hospitals.insert_many([
                {"id": f"HOS-{i}", "name": n, "latitude": la, "longitude": lo}
                for i, (n, la, lo) in enumerate(HOSPITALS_SEED)])
        if await db.resources.count_documents({}) == 0:
            await db.resources.insert_many([
                {"id": f"RES-{i}", "name": n, "latitude": la, "longitude": lo, "category": cat}
                for i, (n, la, lo, cat) in enumerate(RESOURCES_SEED)])
    except Exception as e:
        logger.error(f"Seed error: {e}")


# ===========================================================================
# MODULES: survivors, volunteers, teams, resources, requests, shelters,
#          messages, alerts, analytics, profile
# ===========================================================================
class SurvivorIn(BaseModel):
    name: str
    age: int
    location: str
    emergency_type: str
    priority: str
    status: str = "Pending"
    contact: str = ""
    assigned_team: Optional[str] = None


class RequestIn(BaseModel):
    resource_type: str
    quantity: int
    location: str
    priority: str
    required_by: str = ""
    notes: str = ""


class StatusPatch(BaseModel):
    status: str


class MessageIn(BaseModel):
    text: str
    priority: str = "normal"


class ProfileIn(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    organization: Optional[str] = None
    location: Optional[str] = None


# ---- Survivors ----
@api.get("/survivors")
async def list_survivors(status: Optional[str] = None, priority: Optional[str] = None,
                         search: Optional[str] = None, user: dict = Depends(get_current_user)):
    q: dict = {}
    if status and status != "All":
        q["status"] = status
    if priority and priority != "All":
        q["priority"] = priority
    if search:
        q["$or"] = [{"name": {"$regex": search, "$options": "i"}}, {"location": {"$regex": search, "$options": "i"}}]
    items = await db.survivors.find(q, {"_id": 0}).sort("created_at", -1).to_list(300)
    all_items = await db.survivors.find({}, {"_id": 0, "status": 1}).to_list(500)
    counts = {"total": len(all_items)}
    for s in ["Pending", "Rescued", "Missing", "Safe"]:
        counts[s.lower()] = len([x for x in all_items if x["status"] == s])
    return {"items": items, "counts": counts}


@api.post("/survivors", status_code=201)
async def add_survivor(body: SurvivorIn, user: dict = Depends(get_current_user)):
    doc = body.dict()
    doc.update({"id": f"SUR-{uuid.uuid4().hex[:6].upper()}", "created_at": now_utc()})
    await db.survivors.insert_one(doc)
    doc.pop("_id", None)
    return doc


# ---- Volunteers ----
@api.get("/volunteers")
async def list_volunteers(user: dict = Depends(get_current_user)):
    items = await db.volunteers.find({}, {"_id": 0}).to_list(300)
    counts = {"total": len(items)}
    for k, label in [("On Field", "on_field"), ("Available", "available"), ("Assigned", "assigned"), ("Offline", "offline")]:
        counts[label] = len([x for x in items if x["status"] == k])
    return {"items": items, "counts": counts}


# ---- Rescue Teams ----
@api.get("/teams")
async def list_teams(user: dict = Depends(get_current_user)):
    return await db.teams.find({}, {"_id": 0}).to_list(100)


# ---- Resources ----
@api.get("/resources")
async def list_resources(category: Optional[str] = None, user: dict = Depends(get_current_user)):
    q: dict = {}
    if category and category != "All":
        q["category"] = category
    return await db.resources.find(q, {"_id": 0}).to_list(300)


# ---- Resource Requests ----
@api.get("/requests")
async def list_requests(user: dict = Depends(get_current_user)):
    return await db.resource_requests.find({}, {"_id": 0}).sort("created_at", -1).to_list(200)


@api.post("/requests", status_code=201)
async def create_request(body: RequestIn, user: dict = Depends(get_current_user)):
    doc = body.dict()
    doc.update({"id": f"REQ-{uuid.uuid4().hex[:6].upper()}", "status": "Pending",
                "requester": user.get("name", "Coordinator"), "created_at": now_utc()})
    await db.resource_requests.insert_one(doc)
    doc.pop("_id", None)
    return doc


@api.patch("/requests/{req_id}")
async def update_request(req_id: str, body: StatusPatch, user: dict = Depends(get_current_user)):
    r = await db.resource_requests.find_one_and_update({"id": req_id}, {"$set": {"status": body.status}}, return_document=True)
    if not r:
        raise HTTPException(404, "Request not found")
    r.pop("_id", None)
    return r


# ---- Shelters ----
@api.get("/shelters")
async def list_shelters(user: dict = Depends(get_current_user)):
    return await db.shelters.find({}, {"_id": 0}).to_list(100)


# ---- Messages / Conversations ----
@api.get("/conversations")
async def list_conversations(user: dict = Depends(get_current_user)):
    return await db.conversations.find({}, {"_id": 0, "messages": 0}).sort("last_time", -1).to_list(100)


@api.get("/conversations/{cid}/messages")
async def conversation_messages(cid: str, user: dict = Depends(get_current_user)):
    conv = await db.conversations.find_one({"id": cid}, {"_id": 0})
    if not conv:
        raise HTTPException(404, "Conversation not found")
    return conv.get("messages", [])


@api.post("/conversations/{cid}/messages")
async def send_message(cid: str, body: MessageIn, user: dict = Depends(get_current_user)):
    msg = {"id": uuid.uuid4().hex[:8], "text": body.text, "sender": "me", "author": user.get("name", "You"),
           "priority": body.priority, "time": now_utc().strftime("%I:%M %p"), "read": True}
    r = await db.conversations.find_one_and_update(
        {"id": cid}, {"$push": {"messages": msg}, "$set": {"last": body.text, "last_time": now_utc(), "unread": 0}}, return_document=True)
    if not r:
        raise HTTPException(404, "Conversation not found")
    return msg


# ---- Alerts ----
@api.get("/alerts")
async def list_alerts(user: dict = Depends(get_current_user)):
    return await db.alerts.find({}, {"_id": 0}).sort("created_at", -1).to_list(100)


@api.patch("/alerts/{aid}")
async def update_alert(aid: str, body: StatusPatch, user: dict = Depends(get_current_user)):
    a = await db.alerts.find_one_and_update({"id": aid}, {"$set": {"status": body.status}}, return_document=True)
    if not a:
        raise HTTPException(404, "Alert not found")
    a.pop("_id", None)
    return a


# ---- Reports (metadata list) ----
@api.get("/reports")
async def list_reports(user: dict = Depends(get_current_user)):
    inc = await db.incidents.count_documents({})
    sur = await db.survivors.count_documents({})
    vol = await db.volunteers.count_documents({})
    res = await db.resources.count_documents({})
    return [
        {"id": "incident", "title": "Incident Report", "desc": "All logged incidents with status & severity", "count": inc, "icon": "alert-circle", "updated": "Today"},
        {"id": "rescue", "title": "Rescue Report", "desc": "Completed and ongoing rescue operations", "count": 806, "icon": "checkmark-done", "updated": "Today"},
        {"id": "volunteer", "title": "Volunteer Report", "desc": "Volunteer deployment & availability", "count": vol, "icon": "hand-left", "updated": "Today"},
        {"id": "resource", "title": "Resource Report", "desc": "Inventory levels & allocation", "count": res, "icon": "cube", "updated": "1h ago"},
        {"id": "survivor", "title": "Survivor Report", "desc": "Survivor registry & assistance status", "count": sur, "icon": "people", "updated": "2h ago"},
        {"id": "situation", "title": "Daily Situation Report", "desc": "Consolidated end-of-day summary", "count": 1, "icon": "document-text", "updated": "Today"},
    ]


# ---- Analytics ----
@api.get("/analytics")
async def analytics(time_range: str = Query("7d", alias="range"), user: dict = Depends(get_current_user)):
    incidents = await db.incidents.find({}, {"_id": 0}).to_list(300)
    volunteers = await db.volunteers.find({}, {"_id": 0}).to_list(300)
    resources = await db.resources.find({}, {"_id": 0}).to_list(300)
    days = 7 if time_range == "7d" else 30 if time_range == "30d" else 1 if time_range == "today" else 14
    base = [4, 7, 5, 9, 6, 11, 8, 10, 7, 12, 9, 6, 8, 10]
    inc_series = [{"label": f"D{i+1}", "value": base[i % len(base)]} for i in range(min(days, 14))]
    resp_series = [{"label": f"D{i+1}", "value": 18 - (i % 6) + (i % 3)} for i in range(min(days, 14))]
    sev = {"High": 0, "Medium": 0, "Low": 0}
    region: dict = {}
    for i in incidents:
        if i["status"] == "Active":
            sev[i["severity"]] = sev.get(i["severity"], 0) + 1
        region[i["region"]] = region.get(i["region"], 0) + i.get("people_affected", 0)
    vol_dist: dict = {}
    for v in volunteers:
        vol_dist[v["status"]] = vol_dist.get(v["status"], 0) + 1
    res_util = {}
    for r in resources:
        cat = r.get("category", "Other")
        res_util.setdefault(cat, {"available": 0, "allocated": 0})
        res_util[cat]["available"] += r.get("available", 0)
        res_util[cat]["allocated"] += r.get("allocated", 0)
    top_region = sorted(region.items(), key=lambda x: -x[1])[:6]
    return {
        "incidents_over_time": inc_series,
        "response_time": resp_series,
        "rescue_completion_rate": 78,
        "people_affected": sum(i.get("people_affected", 0) for i in incidents),
        "severity_distribution": [{"label": k, "value": v} for k, v in sev.items()],
        "volunteer_distribution": [{"label": k, "value": v} for k, v in vol_dist.items()],
        "resource_utilization": [{"label": k, "available": v["available"], "allocated": v["allocated"]} for k, v in res_util.items()],
        "regional_response": [{"label": k, "value": v} for k, v in top_region],
    }


# ---- Profile update ----
@api.patch("/auth/profile")
async def update_profile(body: ProfileIn, user: dict = Depends(get_current_user)):
    upd = {k: v for k, v in body.dict().items() if v is not None}
    if upd:
        await db.users.update_one({"user_id": user["user_id"]}, {"$set": upd})
    u = await db.users.find_one({"user_id": user["user_id"]}, {"_id": 0}) or user
    return {**public_user(u), "phone": u.get("phone", ""), "organization": u.get("organization", "National Disaster Response Force"),
            "location": u.get("location", "New Delhi, India"), "joined": "Jan 2024"}


@api.get("/auth/profile")
async def get_profile(user: dict = Depends(get_current_user)):
    u = await db.users.find_one({"user_id": user["user_id"]}, {"_id": 0}) or user
    return {**public_user(u), "phone": u.get("phone", ""), "organization": u.get("organization", "National Disaster Response Force"),
            "location": u.get("location", "New Delhi, India"), "joined": "Jan 2024"}


SURVIVORS_SEED = [
    ("Ramesh Das", 54, "Guwahati, Assam", "Flood", "Critical", "Pending", "+91 98640 11223", None),
    ("Lakshmi Nair", 32, "Munnar, Kerala", "Landslide", "High", "Rescued", "+91 99470 55621", "SDRF Team Bravo"),
    ("Imran Khan", 8, "Connaught Place, Delhi", "Fire", "Critical", "Pending", "+91 98110 44567", "Delhi Fire & Rescue"),
    ("Sunita Devi", 67, "Patna, Bihar", "Flood", "High", "Safe", "+91 90000 77812", None),
    ("Arun Kumar", 41, "Joshimath, Uttarakhand", "Earthquake", "Medium", "Missing", "+91 94120 33456", "SDRF Team Bravo"),
    ("Priya Sharma", 26, "Puri, Odisha", "Cyclone", "High", "Rescued", "+91 90900 12321", "Coast Guard Unit 4"),
    ("Mohammed Ali", 35, "Visakhapatnam", "Gas Leak", "Critical", "Pending", "+91 89000 66554", None),
    ("Kavya Reddy", 19, "Anna Nagar, Chennai", "Building Collapse", "High", "Rescued", "+91 97000 88991", "Army Relief Column"),
    ("Bhaskar Rao", 48, "Nagpur", "Heatwave", "Medium", "Safe", "+91 96000 22113", None),
    ("Fatima Sheikh", 29, "Digha, West Bengal", "Cyclone", "Medium", "Missing", "+91 90980 44002", None),
]

VOLUNTEERS_SEED = [
    ("Ananya Iyer", "Medic", "Guwahati, Assam", "On Field", ["First Aid", "Triage"], "Flood relief - Sector 3", "On Field"),
    ("Rahul Menon", "Rescue Diver", "Puri, Odisha", "On Field", ["Swimming", "Boat Ops"], "Coastal evacuation", "On Field"),
    ("Sneha Gupta", "Logistics", "New Delhi", "Available", ["Supply Chain", "Driving"], None, "Available"),
    ("Vikram Singh", "Engineer", "Joshimath", "Assigned", ["Structural", "Debris"], "Building assessment", "Assigned"),
    ("Deepa Rao", "Counsellor", "Chennai", "Available", ["Trauma Care", "Hindi/Tamil"], None, "Available"),
    ("Karan Patel", "Driver", "Mumbai", "Offline", ["Heavy Vehicle"], None, "Offline"),
    ("Meera Joshi", "Nurse", "Patna, Bihar", "On Field", ["First Aid", "IV"], "Medical camp", "On Field"),
    ("Aditya Verma", "Coordinator", "Nagpur", "Assigned", ["Ops", "Mapping"], "Heatwave response", "Assigned"),
]

ALERTS_SEED = [
    ("Cyclone Landfall Imminent", "Severe cyclonic storm expected to make landfall near Puri within 6 hours. Evacuate coastal zones.", "Puri, Odisha", "Odisha Coast", "Critical", "Active", "IMD"),
    ("Flash Flood Warning", "Rising river levels in Brahmaputra. Move to higher ground immediately.", "Guwahati, Assam", "Assam", "High", "Active", "CWC"),
    ("Road Closure - NH48", "Multi-vehicle accident. NH-48 closed both directions near Lonavala.", "Mumbai-Pune Expressway", "Maharashtra", "Warning", "Acknowledged", "Highway Patrol"),
    ("Relief Supplies Dispatched", "Food and medical supplies dispatched to Sector 7 relief camp.", "Chennai", "Tamil Nadu", "Information", "Resolved", "Ops HQ"),
    ("Gas Leak Contained", "Industrial gas leak near Vizag port has been contained. Evacuation radius lifted.", "Visakhapatnam", "Andhra Pradesh", "High", "Resolved", "NDRF"),
]

CONVERSATIONS_SEED = [
    ("cv1", "NDRF Team Alpha", "team", "Reached Sector 3, beginning evacuation.", 2, [
        {"id": "m1", "text": "Team en route to Sector 3.", "sender": "them", "author": "Cmdr Bose", "time": "09:10 AM", "read": True, "priority": "normal"},
        {"id": "m2", "text": "Reached Sector 3, beginning evacuation.", "sender": "them", "author": "Cmdr Bose", "time": "09:42 AM", "read": False, "priority": "high"},
    ]),
    ("cv2", "Ananya Iyer (Medic)", "volunteer", "Need more first-aid kits at camp.", 1, [
        {"id": "m1", "text": "Need more first-aid kits at camp.", "sender": "them", "author": "Ananya", "time": "10:05 AM", "read": False, "priority": "high"},
    ]),
    ("cv3", "Control Room", "coordinator", "Situation report received. Good work.", 0, [
        {"id": "m1", "text": "Daily SITREP submitted.", "sender": "me", "author": "You", "time": "08:30 AM", "read": True, "priority": "normal"},
        {"id": "m2", "text": "Situation report received. Good work.", "sender": "them", "author": "Control Room", "time": "08:35 AM", "read": True, "priority": "normal"},
    ]),
    ("cv4", "Regional Alerts", "alert", "Cyclone landfall imminent - Puri.", 3, [
        {"id": "m1", "text": "Cyclone landfall imminent - Puri.", "sender": "them", "author": "System", "time": "07:00 AM", "read": False, "priority": "critical"},
    ]),
]


@app.on_event("startup")
async def seed_extra():
    try:
        if await db.survivors.count_documents({}) == 0:
            await db.survivors.insert_many([
                {"id": f"SUR-{2000+i}", "name": n, "age": a, "location": loc, "emergency_type": et,
                 "priority": p, "status": st, "contact": ct, "assigned_team": tm, "created_at": now_utc() - timedelta(minutes=i*23)}
                for i, (n, a, loc, et, p, st, ct, tm) in enumerate(SURVIVORS_SEED)])
        if await db.volunteers.count_documents({}) == 0:
            await db.volunteers.insert_many([
                {"id": f"VOL-{3000+i}", "name": n, "role": r, "location": loc, "availability": av,
                 "skills": sk, "current_assignment": ca, "status": st,
                 "latitude": 22 + (i % 8), "longitude": 77 + (i % 8)}
                for i, (n, r, loc, av, sk, ca, st) in enumerate(VOLUNTEERS_SEED)])
        # enrich teams with leader/mission/status/resources if missing
        async for t in db.teams.find({"leader": {"$exists": False}}):
            leaders = {"NDRF Team Alpha": "Cmdr S. Bose", "SDRF Team Bravo": "Insp. R. Rana", "Delhi Fire & Rescue": "Off. A. Khan", "Coast Guard Unit 4": "Lt. M. Nair", "Army Relief Column": "Maj. V. Rathore"}
            missions = {"Deployed": "Active field operation", "En Route": "Moving to incident site", "Standby": "Awaiting orders"}
            st_map = {"Deployed": "DEPLOYED", "En Route": "RETURNING", "Standby": "AVAILABLE"}
            await db.teams.update_one({"id": t["id"]}, {"$set": {
                "leader": leaders.get(t["name"], "Team Lead"),
                "current_mission": missions.get(t.get("status", "Standby"), "—"),
                "team_status": st_map.get(t.get("status", "Standby"), "AVAILABLE"),
                "resources": ["Boats: 2", "Medical Kits: 8", "Vehicles: 3"],
            }})
        # enrich resources with quantities if missing
        cats = ["Medical", "Food", "Water", "Shelter", "Equipment", "Vehicles", "Generators", "Boats"]
        if await db.resources.count_documents({"available": {"$exists": True}}) == 0:
            # replace basic resources with a fuller inventory
            await db.resources.delete_many({})
            inv = [
                ("First Aid Kits", "Medical", 340, 85, "GMCH Guwahati", 26.14, 91.73),
                ("Oxygen Cylinders", "Medical", 120, 60, "AIIMS Rishikesh", 30.10, 78.29),
                ("Food Packets", "Food", 4200, 1800, "Relief Depot Guwahati", 26.13, 91.75),
                ("Drinking Water (1L)", "Water", 12500, 5400, "North Station", 28.62, 77.21),
                ("Family Tents", "Shelter", 480, 210, "Stadium Camp Puri", 19.82, 85.84),
                ("Rescue Ropes", "Equipment", 260, 40, "Equipment Cache", 30.55, 79.56),
                ("Rescue Boats", "Boats", 34, 18, "Coast Depot Puri", 19.81, 85.83),
                ("Diesel Generators", "Generators", 45, 22, "Ops HQ Delhi", 28.63, 77.22),
                ("Ambulances", "Vehicles", 28, 15, "Apollo Chennai", 13.06, 80.25),
                ("Blankets", "Shelter", 3200, 1100, "Municipal Hall", 13.07, 80.26),
            ]
            docs = []
            for i, (n, cat, av, al, loc, la, lo) in enumerate(inv):
                status = "Critical" if av - al <= av * 0.15 else "Low Stock" if av - al <= av * 0.4 else "Available"
                docs.append({"id": f"RES-{4000+i}", "name": n, "category": cat, "available": av, "allocated": al,
                             "unit": "units", "location": loc, "latitude": la, "longitude": lo, "status": status,
                             "last_updated": "Today"})
            await db.resources.insert_many(docs)
        if await db.resource_requests.count_documents({}) == 0:
            await db.resource_requests.insert_many([
                {"id": "REQ-5001", "resource_type": "Drinking Water", "quantity": 2000, "location": "Guwahati Camp", "priority": "Critical", "required_by": "Today 6 PM", "notes": "Urgent for 500 families", "status": "Approved", "requester": "Field Coordinator", "created_at": now_utc() - timedelta(hours=2)},
                {"id": "REQ-5002", "resource_type": "First Aid Kits", "quantity": 120, "location": "Munnar", "priority": "High", "required_by": "Tomorrow", "notes": "", "status": "In Transit", "requester": "SDRF Bravo", "created_at": now_utc() - timedelta(hours=5)},
                {"id": "REQ-5003", "resource_type": "Family Tents", "quantity": 80, "location": "Puri Camp", "priority": "High", "required_by": "Today", "notes": "Post-cyclone shelter", "status": "Pending", "requester": "Coast Guard", "created_at": now_utc() - timedelta(hours=1)},
                {"id": "REQ-5004", "resource_type": "Generators", "quantity": 10, "location": "Chennai", "priority": "Medium", "required_by": "This week", "notes": "", "status": "Delivered", "requester": "Ops HQ", "created_at": now_utc() - timedelta(days=1)},
            ])
        # enrich shelters
        async for s in db.shelters.find({"status": {"$exists": False}}):
            await db.shelters.update_one({"id": s["id"]}, {"$set": {"status": "Open", "medical": True, "food": True, "water": True}})
        if await db.alerts.count_documents({}) == 0:
            await db.alerts.insert_many([
                {"id": f"ALT-{6000+i}", "title": t, "description": d, "area": ar, "region": rg,
                 "priority": p, "status": st, "source": src, "time": now_utc().strftime("%I:%M %p"),
                 "created_at": now_utc() - timedelta(minutes=i*30)}
                for i, (t, d, ar, rg, p, st, src) in enumerate(ALERTS_SEED)])
        if await db.conversations.count_documents({}) == 0:
            await db.conversations.insert_many([
                {"id": cid, "name": nm, "kind": kind, "last": last, "unread": unread,
                 "last_time": now_utc() - timedelta(minutes=i*15), "messages": msgs}
                for i, (cid, nm, kind, last, unread, msgs) in enumerate(CONVERSATIONS_SEED)])
    except Exception as e:
        logger.error(f"seed_extra error: {e}")


app.include_router(api)
app.add_middleware(
    CORSMiddleware, allow_credentials=True, allow_origins=["*"],
    allow_methods=["*"], allow_headers=["*"],
)


@app.on_event("shutdown")
async def shutdown():
    client.close()
