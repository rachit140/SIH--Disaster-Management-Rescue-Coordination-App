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
from twilio.rest import Client
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

WAHA_API_URL = os.environ.get("WAHA_API_URL", "http://localhost:3000")
TEXTBEE_API_KEY = os.environ.get("TEXTBEE_API_KEY", "")
TEXTBEE_DEVICE_ID = os.environ.get("TEXTBEE_DEVICE_ID", "")


def _normalize_phone(phone: str) -> str:
    """Normalize phone number to E.164 format (default India +91)."""
    if not phone:
        return ""
    clean = "".join(c for c in phone if c.isdigit() or c == "+")
    if clean.startswith("+"):
        return clean
    if clean.startswith("91") and len(clean) == 12:
        return f"+{clean}"
    if len(clean) == 10:
        return f"+91{clean}"
    return f"+{clean}"


def send_textbee_sms(to_number: str, body: str) -> bool:
    """Sends SMS via self-hosted/free Textbee Android SMS gateway."""
    to_number = _normalize_phone(to_number)
    if not to_number:
        return False
    if not TEXTBEE_API_KEY:
        logging.warning(f"[MOCK SMS] Credentials missing. To: {to_number}, Body: {body}")
        return False

    try:
        url = "https://api.textbee.dev/api/v1/gateway/send-sms"
        headers = {"x-api-key": TEXTBEE_API_KEY}
        payload = {
            "recipients": [to_number],
            "message": body
        }
        if TEXTBEE_DEVICE_ID:
            payload["device"] = TEXTBEE_DEVICE_ID
            
        res = httpx.post(url, json=payload, headers=headers, timeout=10.0)
        res_data = res.json()
        is_success = res_data.get("success") or res_data.get("data", {}).get("success")
        if res.status_code in [200, 201] and is_success:
            logging.info(f"[TEXTBEE SMS] Sent successfully to {to_number}")
            return True
        else:
            logging.error(f"[TEXTBEE SMS] Failed → {to_number}: {res.text}")
            return False
    except Exception as e:
        logging.error(f"[TEXTBEE SMS] Connection error → {to_number}: {e}")
        return False


def send_waha_whatsapp(to_number: str, body: str) -> bool:
    """Sends WhatsApp message via local WAHA (WhatsApp HTTP API) gateway."""
    to_number = _normalize_phone(to_number)
    if not to_number:
        return False

    try:
        # WAHA expects format: phone_number without + sign followed by @c.us
        clean_num = to_number.replace("+", "")
        url = f"{WAHA_API_URL}/api/sendText"
        payload = {
            "chatId": f"{clean_num}@c.us",
            "text": body,
            "session": "default"
        }
        res = httpx.post(url, json=payload, timeout=10.0)
        if res.status_code in [200, 201]:
            logging.info(f"[WAHA WHATSAPP] Sent successfully to {to_number}")
            return True
        else:
            logging.error(f"[WAHA WHATSAPP] Failed → {to_number}: {res.text}")
            return False
    except Exception as e:
        logging.error(f"[WAHA WHATSAPP] Connection error → {to_number}: {e}")
        return False


async def broadcast_sms(body: str):
    """Fetch all registered user phone numbers from DB and send SMS to each."""
    try:
        users = await db.users.find({"phone": {"$exists": True}}, {"_id": 0, "phone": 1}).to_list(1000)
        # Avoid duplicate numbers by casting to a set
        phones = list(set(u["phone"] for u in users if u.get("phone")))
        if not phones:
            logging.info(f"[BROADCAST SMS] No phones registered. Body: {body}")
            return
        for phone in phones:
            send_textbee_sms(phone, body)
    except Exception as e:
        logging.error(f"[BROADCAST SMS] Error: {e}")


async def broadcast_whatsapp(body: str):
    """Fetch all registered user phone numbers from DB and send WhatsApp to each."""
    try:
        users = await db.users.find({"phone": {"$exists": True}}, {"_id": 0, "phone": 1}).to_list(1000)
        # Avoid duplicate numbers by casting to a set
        phones = list(set(u["phone"] for u in users if u.get("phone")))
        if not phones:
            logging.info(f"[BROADCAST WA] No phones registered. Body: {body}")
            return
        for phone in phones:
            send_waha_whatsapp(phone, body)
    except Exception as e:
        logging.error(f"[BROADCAST WA] Error: {e}")

client = AsyncIOMotorClient(MONGO_URL)
db = client[DB_NAME]

import copy
import re

class InMemoryCursor:
    def __init__(self, data):
        self.data = data
        self.index = 0

    def __aiter__(self):
        return self

    async def __anext__(self):
        if self.index >= len(self.data):
            raise StopAsyncIteration
        val = self.data[self.index]
        self.index += 1
        return val

    def sort(self, key_or_list, direction=None):
        try:
            reverse = direction == -1 if direction is not None else False
            sort_key = key_or_list
            if isinstance(key_or_list, list) and key_or_list:
                sort_key = key_or_list[0][0]
                reverse = key_or_list[0][1] == -1
            
            # Sort with fallback for datetime or missing keys
            self.data.sort(key=lambda x: x.get(sort_key) or "", reverse=reverse)
        except Exception:
            pass
        return self

    async def to_list(self, length=None):
        if length is None:
            return self.data
        return self.data[:length]

class InMemoryCollection:
    def __init__(self, name):
        self.name = name
        self.data = []

    async def create_index(self, keys, **kwargs):
        pass

    async def count_documents(self, filter):
        count = 0
        for doc in self.data:
            if self._matches(doc, filter):
                count += 1
        return count

    def _matches(self, doc, filter):
        if not filter:
            return True
        for k, v in filter.items():
            if k == "$or":
                any_match = False
                for sub_filter in v:
                    if self._matches(doc, sub_filter):
                        any_match = True
                        break
                if not any_match:
                    return False
                continue

            val = doc.get(k)
            if isinstance(v, dict):
                if "$exists" in v:
                    exists = v["$exists"]
                    if exists:
                        if k not in doc: return False
                    else:
                        if k in doc: return False
                elif "$regex" in v:
                    pattern = v["$regex"]
                    options = v.get("$options", "")
                    flags = re.IGNORECASE if "i" in options else 0
                    if val is None or not re.search(pattern, str(val), flags):
                        return False
                else:
                    if val != v:
                        return False
            else:
                if val != v:
                    return False
        return True

    async def find_one(self, filter, projection=None):
        for doc in self.data:
            if self._matches(doc, filter):
                res = copy.deepcopy(doc)
                self._apply_projection(res, projection)
                return res
        return None

    def _apply_projection(self, doc, projection):
        if not projection:
            return
        for k, v in projection.items():
            if v == 0:
                doc.pop(k, None)

    async def insert_one(self, doc):
        d = copy.deepcopy(doc)
        if "_id" not in d:
            d["_id"] = str(uuid.uuid4())
        self.data.append(d)
        return d

    async def insert_many(self, docs):
        res = []
        for doc in docs:
            r = await self.insert_one(doc)
            res.append(r)
        return res

    async def replace_one(self, filter, replacement, upsert=False):
        for idx, doc in enumerate(self.data):
            if self._matches(doc, filter):
                rep = copy.deepcopy(replacement)
                if "_id" not in rep and "_id" in doc:
                    rep["_id"] = doc["_id"]
                self.data[idx] = rep
                return
        if upsert:
            await self.insert_one(replacement)

    async def delete_one(self, filter):
        for idx, doc in enumerate(self.data):
            if self._matches(doc, filter):
                self.data.pop(idx)
                return

    async def delete_many(self, filter):
        self.data = [doc for doc in self.data if not self._matches(doc, filter)]

    async def update_one(self, filter, update):
        for doc in self.data:
            if self._matches(doc, filter):
                self._apply_update(doc, update)
                return

    async def find_one_and_update(self, filter, update, return_document=None):
        for doc in self.data:
            if self._matches(doc, filter):
                self._apply_update(doc, update)
                return copy.deepcopy(doc)
        return None

    def _apply_update(self, doc, update):
        if "$set" in update:
            for k, v in update["$set"].items():
                doc[k] = copy.deepcopy(v)
        if "$push" in update:
            for k, v in update["$push"].items():
                if k not in doc:
                    doc[k] = []
                elif not isinstance(doc[k], list):
                    doc[k] = [doc[k]]
                doc[k].append(copy.deepcopy(v))

    def find(self, filter=None, projection=None):
        matching = []
        for doc in self.data:
            if self._matches(doc, filter):
                res = copy.deepcopy(doc)
                self._apply_projection(res, projection)
                matching.append(res)
        return InMemoryCursor(matching)

class InMemoryDatabase:
    def __init__(self):
        self.collections = {}

    def __getattr__(self, name):
        if name not in self.collections:
            self.collections[name] = InMemoryCollection(name)
        return self.collections[name]

    def __getitem__(self, name):
        return getattr(self, name)

db_initialized = False

async def init_db():
    global db, db_initialized
    if db_initialized:
        return
    try:
        await asyncio.wait_for(client.server_info(), timeout=2.0)
        logger.info("Successfully connected to MongoDB")
    except Exception:
        logger.warning("MongoDB not running. Switching to In-Memory Fallback Database!")
        db = InMemoryDatabase()
    db_initialized = True

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
        "phone": u.get("phone", ""),
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
    phone: Optional[str] = None


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


class SMSIn(BaseModel):
    to_number: str
    body: str


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
    user_doc = {
        "user_id": uid, "email": email, "name": body.name,
        "password_hash": hash_pw(body.password), "role": body.role,
        "verified": False, "provider": "password", "picture": "",
        "created_at": now_utc(),
    }
    if body.phone:
        user_doc["phone"] = _normalize_phone(body.phone)
    await db.users.insert_one(user_doc)
    code = gen_otp()
    await db.otps.replace_one(
        {"email": email},
        {"email": email, "code_hash": hash_pw(code), "purpose": "verify",
         "expires_at": now_utc() + timedelta(minutes=OTP_MINUTES)},
        upsert=True,
    )
    resp = {"message": "Verification code sent", "user_id": uid, "email": email}
    if body.phone:
        send_textbee_sms(body.phone, f"[SAHAYSETU] Your verification code is: {code}")
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
        if user.get("phone"):
            send_textbee_sms(user["phone"], f"[SAHAYSETU] Your password reset code is: {code}")
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


@api.post("/sms/send")
async def send_sms_endpoint(body: SMSIn, user: dict = Depends(get_current_user)):
    success = send_twilio_sms(body.to_number, body.body)
    if not success:
        return {"status": "fallback_mock", "message": "Twilio failed or was unconfigured. Message logged to server stdout."}
    return {"status": "success", "message": "SMS sent successfully via Twilio."}


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
    # CrisisUpdate → WhatsApp broadcast to all registered numbers
    sev = doc.get("severity", "")
    msg = (
        f"🚨 [SAHAYSETU] Crisis Update\n"
        f"Incident: {doc.get('title')}\n"
        f"Location: {doc.get('location')}\n"
        f"Severity: {sev}\n"
        f"Affected: {doc.get('people_affected', 0)} people\n"
        f"Status: {doc.get('status')}"
    )
    import asyncio
    asyncio.ensure_future(broadcast_whatsapp(msg))
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
        await init_db()
        await db.users.create_index("email", unique=True)
        await db.users.create_index("user_id", unique=True)
        await db.user_sessions.create_index("session_token", unique=True)
        await db.otps.create_index("expires_at", expireAfterSeconds=0)

        # Seed default users
        default_users = [
            ("arjun@sahaysetu.in", "Arjun Coordinator", "rescue123", "coordinator"),
            ("rachitsharma9838@gmail.com", "Rachit Sharma", "123456789", "admin")
        ]
        for email, name, password, role in default_users:
            if not await db.users.find_one({"email": email}):
                uid = f"usr_{uuid.uuid4().hex[:12]}"
                await db.users.insert_one({
                    "user_id": uid, "email": email, "name": name,
                    "password_hash": hash_pw(password), "role": role,
                    "verified": True, "provider": "password", "picture": "",
                    "phone": "+916393144211",   # Default test phone for broadcast notifications
                    "created_at": now_utc(),
                })
            else:
                # Ensure phone is set for existing seed users (in-memory DB restart)
                await db.users.update_one(
                    {"email": email, "phone": {"$exists": False}},
                    {"$set": {"phone": "+916393144211"}}
                )

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


# ---------------------------------------------------------------------------
# Domain: Missing Persons, Casualties, Camps, Announcements
# ---------------------------------------------------------------------------
class MissingPersonIn(BaseModel):
    name: str
    age: Optional[int] = None
    gender: Optional[str] = "Unknown"  # Male | Female | Other | Unknown
    last_seen_location: str
    description: str = ""
    contact_name: str = ""
    contact_phone: str = ""
    photo_url: str = ""



class CasualtyIn(BaseModel):
    name: Optional[str] = "Unknown"
    age: Optional[int] = None
    gender: Optional[str] = "Unknown"
    casualty_type: Optional[str] = "Fatal"  # Fatal | Injured | Missing
    location: str
    incident_datetime: Optional[str] = ""
    photo_url: Optional[str] = ""
    description: Optional[str] = ""
    reporter_name: Optional[str] = ""
    contact_name: Optional[str] = ""
    contact_phone: Optional[str] = ""
    additional_info: Optional[str] = ""
    latitude: Optional[float] = 0.0
    longitude: Optional[float] = 0.0
    status: Optional[str] = "PENDING"



class CampIn(BaseModel):
    name: str
    location: str
    latitude: float = 0.0
    longitude: float = 0.0
    capacity: int = 0
    occupancy: int = 0
    status: str = "ACTIVE"  # ACTIVE | FULL | CLOSED
    medical: bool = False
    food: bool = True
    water: bool = True
    shelter: bool = True
    contact_number: Optional[str] = ""
    description: Optional[str] = ""
    camp_type: Optional[str] = "Relief Camp"



class AnnouncementIn(BaseModel):
    title: str
    body: str
    priority: str = "Info"  # Info | Warning | Critical
    area: str = "All"


class ResourceRequestIn(BaseModel):
    camp_id: str
    camp_name: str
    resource_category: str
    resource_name: str
    quantity_required: int
    unit: str
    priority: str = "MEDIUM"  # LOW | MEDIUM | HIGH | CRITICAL
    required_by: str = ""
    description: Optional[str] = ""
    remarks: Optional[str] = ""


class ResourceResponseIn(BaseModel):
    quantity_offered: int
    expected_delivery_time: str
    delivery_method: str = "Delivery" # Delivery | Pickup
    remarks: Optional[str] = ""



@api.get("/missing-persons")
async def list_missing_persons(user: dict = Depends(get_current_user)):
    return await db.missing_persons.find({}, {"_id": 0}).sort("created_at", -1).to_list(500)


@api.post("/missing-persons", status_code=201)
async def create_missing_person(body: MissingPersonIn, user: dict = Depends(get_current_user)):
    doc = body.dict()
    doc.update({
        "id": f"MP-{uuid.uuid4().hex[:6].upper()}",
        "status": "Pending Request",
        "reported_by": user.get("name", "Coordinator"),
        "created_at": now_utc(),
    })
    await db.missing_persons.insert_one(doc)
    doc.pop("_id", None)
    return doc


@api.patch("/missing-persons/{mp_id}")
async def update_missing_person(mp_id: str, body: StatusPatch, user: dict = Depends(get_current_user)):
    old_doc = await db.missing_persons.find_one({"id": mp_id})
    if not old_doc:
        raise HTTPException(404, "Missing person record not found")
        
    doc = await db.missing_persons.find_one_and_update(
        {"id": mp_id}, {"$set": {"status": body.status}}, return_document=True)
    doc.pop("_id", None)
    
    return doc



@api.get("/casualties")
async def list_casualties(user: dict = Depends(get_current_user)):
    # Support "my-reports" filter for citizens
    role = user.get("role", "CITIZEN")
    provider = user.get("provider", "")
    
    # If the user is a citizen and requests their reports
    query = {}
    if role == "CITIZEN" and provider != "gov":
        # Return all for safety, but check if we want to filter to user's reports.
        # Let's filter by reported_by_user_id to only show My Reports to citizens
        query = {"reported_by_user_id": user.get("user_id")}
        
    return await db.casualties.find(query, {"_id": 0}).sort("created_at", -1).to_list(500)


@api.post("/casualties", status_code=201)
async def create_casualty(body: CasualtyIn, user: dict = Depends(get_current_user)):
    doc = body.dict()
    doc.update({
        "id": f"CAS-{uuid.uuid4().hex[:6].upper()}",
        "status": "PENDING",
        "reported_by": user.get("name", "Citizen"),
        "reported_by_user_id": user.get("user_id"),
        "created_at": now_utc(),
        "updated_at": now_utc(),
        "assigned_agency": None,
        "history": [
            {
                "status": "PENDING",
                "changed_by": user.get("name", "Citizen"),
                "timestamp": now_utc(),
                "remarks": "Casualty report submitted by citizen"
            }
        ]
    })
    await db.casualties.insert_one(doc)
    doc.pop("_id", None)
    return doc


@api.patch("/casualties/{cas_id}/status")
async def update_casualty_status(cas_id: str, body: StatusPatch, user: dict = Depends(get_current_user)):
    old_doc = await db.casualties.find_one({"id": cas_id})
    if not old_doc:
        raise HTTPException(404, "Casualty record not found")
        
    new_status = body.status.upper()
    history_entry = {
        "status": new_status,
        "changed_by": user.get("name", "Coordinator"),
        "timestamp": now_utc(),
        "remarks": f"Status updated to {new_status}"
    }
    
    # Define update parameters
    upd = {
        "status": new_status,
        "updated_at": now_utc()
    }
    
    # If a rescue agency is assigning/updating the operations
    if new_status in ["RESCUE IN PROCESS", "COMPLETED"]:
        upd["assigned_agency"] = user.get("organization") or user.get("name", "Rescue Agency")
        
    doc = await db.casualties.find_one_and_update(
        {"id": cas_id},
        {
            "$set": upd,
            "$push": {"history": history_entry}
        },
        return_document=True
    )
    doc.pop("_id", None)
    
    return doc



@api.get("/camps")
async def list_camps(
    latitude: Optional[float] = None,
    longitude: Optional[float] = None,
    radius: Optional[float] = 10.0,
    user: dict = Depends(get_current_user)
):
    camps = await db.shelters.find({}, {"_id": 0}).sort("name", 1).to_list(500)
    
    # Calculate distance if user location is provided
    if latitude is not None and longitude is not None:
        import math
        def get_distance(lat1, lon1, lat2, lon2):
            # Haversine formula
            R = 6371.0 # Radius of Earth in km
            dlat = math.radians(lat2 - lat1)
            dlon = math.radians(lon2 - lon1)
            a = math.sin(dlat / 2)**2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon / 2)**2
            c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
            return R * c

        # Append distance to camps and sort
        for camp in camps:
            camp_lat = camp.get("latitude") or 0.0
            camp_lng = camp.get("longitude") or 0.0
            camp["distance"] = get_distance(latitude, longitude, camp_lat, camp_lng)
            
        # Filter by radius if it's set
        role = user.get("role", "CITIZEN")
        if role == "CITIZEN":
            # For citizens, return only ACTIVE or FULL camps, hide CLOSED ones
            camps = [c for c in camps if c.get("status", "ACTIVE") != "CLOSED" and c.get("distance", 0) <= radius]
            
        camps.sort(key=lambda x: x.get("distance", 0.0))
        
    return camps


@api.post("/camps", status_code=201)
async def create_camp(body: CampIn, user: dict = Depends(get_current_user)):
    doc = body.dict()
    # Auto-adjust status based on occupancy
    status = "ACTIVE"
    if doc["occupancy"] >= doc["capacity"]:
        status = "FULL"
        
    doc.update({
        "id": f"CMP-{uuid.uuid4().hex[:6].upper()}",
        "status": status,
        "created_by": user.get("name", "Coordinator"),
        "created_at": now_utc(),
        "updated_at": now_utc()
    })
    await db.shelters.insert_one(doc)
    doc.pop("_id", None)
    return doc


@api.patch("/camps/{camp_id}/occupancy")
async def update_camp_occupancy(camp_id: str, body: dict, user: dict = Depends(get_current_user)):
    occupancy = body.get("occupancy")
    if occupancy is None or occupancy < 0:
        raise HTTPException(400, "Invalid occupancy count")
        
    camp = await db.shelters.find_one({"id": camp_id})
    if not camp:
        raise HTTPException(404, "Camp not found")
        
    capacity = camp.get("capacity", 100)
    if occupancy > capacity:
        raise HTTPException(400, "Occupancy cannot exceed camp capacity")
        
    # Auto status shifts
    status = "ACTIVE"
    if occupancy >= capacity:
        status = "FULL"
        
    updated = await db.shelters.find_one_and_update(
        {"id": camp_id},
        {"$set": {"occupancy": occupancy, "status": status, "updated_at": now_utc()}},
        return_document=True
    )
    updated.pop("_id", None)
    return updated


@api.patch("/camps/{camp_id}/resources")
async def update_camp_resources(camp_id: str, body: dict, user: dict = Depends(get_current_user)):
    camp = await db.shelters.find_one({"id": camp_id})
    if not camp:
        raise HTTPException(404, "Camp not found")
        
    # Update resource availability flags
    upd = {
        "food": body.get("food", camp.get("food", True)),
        "water": body.get("water", camp.get("water", True)),
        "medical": body.get("medical", camp.get("medical", False)),
        "shelter": body.get("shelter", camp.get("shelter", True)),
        "updated_at": now_utc()
    }
    
    updated = await db.shelters.find_one_and_update(
        {"id": camp_id},
        {"$set": upd},
        return_document=True
    )
    updated.pop("_id", None)
    return updated


@api.patch("/camps/{camp_id}/status")
async def update_camp_status(camp_id: str, body: StatusPatch, user: dict = Depends(get_current_user)):
    camp = await db.shelters.find_one({"id": camp_id})
    if not camp:
        raise HTTPException(404, "Camp not found")
        
    status = body.status.upper()
    upd = {
        "status": status,
        "updated_at": now_utc()
    }
    
    # Track extra variables on closure
    if status == "CLOSED":
        upd["closed_by"] = user.get("name", "Coordinator")
        upd["closed_at"] = now_utc()
        
    updated = await db.shelters.find_one_and_update(
        {"id": camp_id},
        {"$set": upd},
        return_document=True
    )
    updated.pop("_id", None)
    return updated


# --- Resource Requests & Volunteer Responses ---

@api.get("/resource-requests")
async def list_resource_requests(user: dict = Depends(get_current_user)):
    role = user.get("role", "CITIZEN")
    # For Citizens/Volunteers, only return APPROVED or OPEN/VOLUNTEER_RESPONDED/IN_FULFILLMENT statuses
    if role == "CITIZEN":
        return await db.resource_requests.find(
            {"status": {"$in": ["APPROVED", "OPEN", "VOLUNTEER_RESPONDED", "IN_FULFILLMENT"]}},
            {"_id": 0}
        ).sort("created_at", -1).to_list(500)
    # Admin/Agencies get access to all requests
    return await db.resource_requests.find({}, {"_id": 0}).sort("created_at", -1).to_list(500)


@api.post("/resource-requests", status_code=201)
async def create_resource_request(body: ResourceRequestIn, user: dict = Depends(get_current_user)):
    doc = body.dict()
    doc.update({
        "id": f"REQ-{uuid.uuid4().hex[:6].upper()}",
        "quantity_fulfilled": 0,
        "status": "PENDING_REVIEW",
        "requested_by": user.get("name", "Coordinator"),
        "requested_by_user_id": user.get("user_id"),
        "created_at": now_utc(),
        "updated_at": now_utc(),
        "history": [
            {
                "status": "PENDING_REVIEW",
                "changed_by": user.get("name", "Coordinator"),
                "timestamp": now_utc(),
                "remarks": "Resource request created and submitted for admin review"
            }
        ],
        "offers": []
    })
    await db.resource_requests.insert_one(doc)
    doc.pop("_id", None)
    return doc


@api.patch("/resource-requests/{req_id}/status")
async def update_request_status(req_id: str, body: StatusPatch, user: dict = Depends(get_current_user)):
    req_doc = await db.resource_requests.find_one({"id": req_id})
    if not req_doc:
        raise HTTPException(404, "Resource request not found")
        
    status = body.status.upper()
    history_entry = {
        "status": status,
        "changed_by": user.get("name", "Administrator"),
        "timestamp": now_utc(),
        "remarks": f"Status updated to {status} by administrative control"
    }
    
    # Map APPROVED directly to OPEN status for community view
    upd_status = status
    if status == "APPROVED":
        upd_status = "OPEN"
        
    upd = {
        "status": upd_status,
        "updated_at": now_utc()
    }
    
    if status == "APPROVED":
        upd["approved_by"] = user.get("name", "Admin")
        upd["approved_at"] = now_utc()
        
    updated = await db.resource_requests.find_one_and_update(
        {"id": req_id},
        {
            "$set": upd,
            "$push": {"history": history_entry}
        },
        return_document=True
    )
    return updated


@api.post("/resource-requests/{req_id}/offers", status_code=201)
async def submit_volunteer_offer(req_id: str, body: ResourceResponseIn, user: dict = Depends(get_current_user)):
    req_doc = await db.resource_requests.find_one({"id": req_id})
    if not req_doc:
        raise HTTPException(404, "Resource request not found")
        
    offer_id = f"OFF-{uuid.uuid4().hex[:6].upper()}"
    offer_doc = {
        "id": offer_id,
        "resource_request_id": req_id,
        "volunteer_id": user.get("user_id"),
        "volunteer_name": user.get("name", "Volunteer"),
        "volunteer_phone": user.get("phone", ""),
        "quantity_offered": body.quantity_offered,
        "expected_delivery_time": body.expected_delivery_time,
        "delivery_method": body.delivery_method,
        "remarks": body.remarks,
        "status": "SUBMITTED", # SUBMITTED | ACCEPTED | DELIVERED | REJECTED
        "created_at": now_utc(),
        "updated_at": now_utc()
    }
    
    # Push offer and advance request status to VOLUNTEER_RESPONDED / IN_FULFILLMENT
    updated = await db.resource_requests.find_one_and_update(
        {"id": req_id},
        {
            "$push": {
                "offers": offer_doc,
                "history": {
                    "status": "VOLUNTEER_RESPONDED",
                    "changed_by": user.get("name", "Volunteer"),
                    "timestamp": now_utc(),
                    "remarks": f"Volunteer {user.get('name')} offered {body.quantity_offered} units"
                }
            },
            "$set": {
                "status": "VOLUNTEER_RESPONDED",
                "updated_at": now_utc()
            }
        },
        return_document=True
    )
    updated.pop("_id", None)
    return updated


@api.patch("/resource-requests/{req_id}/offers/{offer_id}/status")
async def update_offer_status(req_id: str, offer_id: str, body: dict, user: dict = Depends(get_current_user)):
    req_doc = await db.resource_requests.find_one({"id": req_id})
    if not req_doc:
        raise HTTPException(404, "Resource request not found")
        
    status = body.get("status", "").upper() # ACCEPTED | DELIVERED | REJECTED
    offers = req_doc.get("offers", [])
    
    target_offer = None
    for o in offers:
        if o["id"] == offer_id:
            o["status"] = status
            o["updated_at"] = now_utc()
            target_offer = o
            break
            
    if not target_offer:
        raise HTTPException(404, "Volunteer offer not found")
        
    # Recalculate fulfilled quantity on delivery confirmation
    quantity_fulfilled = req_doc.get("quantity_fulfilled", 0)
    req_status = req_doc.get("status", "OPEN")
    
    if status == "DELIVERED":
        quantity_fulfilled += target_offer["quantity_offered"]
        if quantity_fulfilled >= req_doc["quantity_required"]:
            req_status = "FULFILLED"
        else:
            req_status = "IN_FULFILLMENT"
            
    # Save update
    updated = await db.resource_requests.find_one_and_update(
        {"id": req_id},
        {
            "$set": {
                "offers": offers,
                "quantity_fulfilled": quantity_fulfilled,
                "status": req_status,
                "updated_at": now_utc()
            },
            "$push": {
                "history": {
                    "status": req_status,
                    "changed_by": user.get("name", "Coordinator"),
                    "timestamp": now_utc(),
                    "remarks": f"Fulfillment updated: delivery of {target_offer['quantity_offered']} units confirmed"
                }
            }
        },
        return_document=True
    )
    updated.pop("_id", None)
    return updated




@api.get("/announcements")
async def list_announcements(user: dict = Depends(get_current_user)):
    return await db.announcements.find({}, {"_id": 0}).sort("created_at", -1).to_list(200)


@api.post("/announcements", status_code=201)
async def create_announcement(body: AnnouncementIn, user: dict = Depends(get_current_user)):
    doc = body.dict()
    doc.update({
        "id": f"ANN-{uuid.uuid4().hex[:6].upper()}",
        "author": user.get("name", "Coordinator"),
        "created_at": now_utc(),
    })
    await db.announcements.insert_one(doc)
    doc.pop("_id", None)
    # Announcement → WhatsApp to all registered users
    priority_emoji = {"Critical": "🚨", "Warning": "⚠️", "Info": "ℹ️"}.get(doc["priority"], "📢")
    wa_body = (
        f"{priority_emoji} [SAHAYSETU] {doc['priority']} Announcement\n"
        f"{doc['title']}\n\n"
        f"{doc['body']}\n"
        f"Area: {doc['area']}"
    )
    import asyncio
    asyncio.ensure_future(broadcast_whatsapp(wa_body))
    return doc


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
        await init_db()
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


app.add_middleware(
    CORSMiddleware, allow_credentials=True, allow_origins=["*"],
    allow_methods=["*"], allow_headers=["*"],
)
app.include_router(api)


@app.on_event("shutdown")
async def shutdown():
    client.close()
