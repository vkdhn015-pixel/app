"""Daman-style premium gaming platform backend.

Features:
- Mobile OTP auth (dev-mode fallback + Twilio real SMS when configured)
- JWT sessions
- Wallet, deposits, withdrawals, transactions
- Games engine (38% win / 62% loss controlled server-side)
- Promotions, VIP, notifications, support tickets
- Admin: users, deposits, withdrawals, QR/UPI, payment settings, broadcasts, reports
"""
from fastapi import FastAPI, APIRouter, HTTPException, Depends, Header, Request
from fastapi.security import HTTPBearer
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
import io
import base64
import random
import secrets
import string
import uuid
import bcrypt
import jwt
import qrcode
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime, timezone, timedelta

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

# ------- Config -------
mongo_url = os.environ["MONGO_URL"]
DB_NAME = os.environ["DB_NAME"]
JWT_SECRET = os.environ["JWT_SECRET"]
JWT_ALGO = os.environ.get("JWT_ALGO", "HS256")
JWT_EXPIRES_HOURS = int(os.environ.get("JWT_EXPIRES_HOURS", "720"))
ADMIN_SEED_PHONE = os.environ["ADMIN_SEED_PHONE"]
ADMIN_SEED_PASSWORD = os.environ["ADMIN_SEED_PASSWORD"]
TWILIO_ACCOUNT_SID = os.environ.get("TWILIO_ACCOUNT_SID", "")
TWILIO_AUTH_TOKEN = os.environ.get("TWILIO_AUTH_TOKEN", "")
TWILIO_VERIFY_SERVICE = os.environ.get("TWILIO_VERIFY_SERVICE", "")
PLAYER_WIN_RATE = float(os.environ.get("PLAYER_WIN_RATE", "0.38"))

client = AsyncIOMotorClient(mongo_url)
db = client[DB_NAME]

app = FastAPI(title="Daman Gaming API")
api = APIRouter(prefix="/api")

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")
logger = logging.getLogger("daman")

# ------- Helpers -------
def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def new_id() -> str:
    return str(uuid.uuid4())


def clean(doc: Optional[dict]) -> Optional[dict]:
    if not doc:
        return None
    doc.pop("_id", None)
    return doc


def make_uid() -> str:
    """Short numeric UID displayed on user profile e.g. DG1234567."""
    return "DG" + "".join(secrets.choice(string.digits) for _ in range(7))


def hash_password(pw: str) -> str:
    return bcrypt.hashpw(pw.encode(), bcrypt.gensalt()).decode()


def verify_password(pw: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(pw.encode(), hashed.encode())
    except Exception:
        return False


def create_token(subject: str, role: str) -> str:
    payload = {
        "sub": subject,
        "role": role,
        "iat": datetime.now(timezone.utc),
        "exp": datetime.now(timezone.utc) + timedelta(hours=JWT_EXPIRES_HOURS),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGO)


async def get_current_user(authorization: Optional[str] = Header(None)) -> dict:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(401, "Missing token")
    token = authorization.split(" ", 1)[1]
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGO])
    except jwt.PyJWTError:
        raise HTTPException(401, "Invalid token")
    if payload.get("role") != "user":
        raise HTTPException(403, "Not a user token")
    user = clean(await db.users.find_one({"id": payload["sub"]}))
    if not user:
        raise HTTPException(404, "User not found")
    return user


async def get_current_admin(authorization: Optional[str] = Header(None)) -> dict:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(401, "Missing token")
    token = authorization.split(" ", 1)[1]
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGO])
    except jwt.PyJWTError:
        raise HTTPException(401, "Invalid token")
    if payload.get("role") != "admin":
        raise HTTPException(403, "Admin only")
    admin = clean(await db.admins.find_one({"id": payload["sub"]}))
    if not admin:
        raise HTTPException(404, "Admin not found")
    return admin


# ------- Twilio helpers -------
_twilio_enabled = bool(TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN and TWILIO_VERIFY_SERVICE)
_twilio_client = None
if _twilio_enabled:
    try:
        from twilio.rest import Client as TwilioClient
        _twilio_client = TwilioClient(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN)
    except Exception as e:
        logger.warning(f"Twilio init failed, fallback to dev-mode OTP: {e}")
        _twilio_enabled = False


def gen_otp() -> str:
    return "".join(secrets.choice(string.digits) for _ in range(6))


# ------- Models -------
class SendOtpIn(BaseModel):
    phone: str


class VerifyOtpIn(BaseModel):
    phone: str
    otp: str
    name: Optional[str] = None
    referral: Optional[str] = None


class AdminLoginIn(BaseModel):
    phone: str
    password: str


class PlayGameIn(BaseModel):
    game_type: str  # crash | aviator | dice | spin | generic
    bet_amount: float
    params: Dict[str, Any] = Field(default_factory=dict)


# Interactive crash/aviator round
class CrashStartIn(BaseModel):
    bet_amount: float
    game_type: str = "crash"  # crash | aviator
    auto_cash_out: Optional[float] = None


class CrashCashoutIn(BaseModel):
    round_id: str
    multiplier: float


class CrashSettleIn(BaseModel):
    round_id: str


# Shared multiplier curve: m(t) = 1 + A*t + B*t^2  (t in seconds)
CRASH_A = 0.35
CRASH_B = 0.09


def crash_multiplier_at(elapsed_s: float) -> float:
    return round(1.0 + CRASH_A * elapsed_s + CRASH_B * elapsed_s * elapsed_s, 2)



class DepositCreate(BaseModel):
    amount: float
    utr: str
    method: str = "upi"  # upi | qr


class WithdrawCreate(BaseModel):
    amount: float
    upi_id: str
    account_name: str


class SupportTicketIn(BaseModel):
    subject: str
    message: str


class BroadcastIn(BaseModel):
    title: str
    body: str


class UpsertPaymentConfigIn(BaseModel):
    upi_ids: List[str] = Field(default_factory=list)
    qr_data: Optional[str] = None  # UPI URI string. Backend renders PNG.
    min_deposit: float = 100
    min_withdraw: float = 200
    max_withdraw: float = 100000


# ------- Startup: seed -------
@app.on_event("startup")
async def startup():
    # Seed admin
    existing = await db.admins.find_one({"phone": ADMIN_SEED_PHONE})
    if not existing:
        await db.admins.insert_one({
            "id": new_id(),
            "phone": ADMIN_SEED_PHONE,
            "name": "Super Admin",
            "password_hash": hash_password(ADMIN_SEED_PASSWORD),
            "created_at": now_iso(),
        })
        logger.info(f"Seeded admin: {ADMIN_SEED_PHONE}")

    # Seed payment settings
    if not await db.payment_config.find_one({"id": "default"}):
        upi_uri = "upi://pay?pa=daman@upi&pn=Daman%20Gaming&cu=INR"
        await db.payment_config.insert_one({
            "id": "default",
            "upi_ids": ["daman@upi", "damanpay@okhdfcbank"],
            "qr_data": upi_uri,
            "min_deposit": 100,
            "min_withdraw": 200,
            "max_withdraw": 100000,
            "player_win_rate": PLAYER_WIN_RATE,
            "updated_at": now_iso(),
        })

    # Seed promotions
    if await db.promotions.count_documents({}) == 0:
        await db.promotions.insert_many([
            {"id": new_id(), "title": "First Deposit 100% Bonus", "subtitle": "Get up to ₹5,000 on your first top-up", "code": "FIRST100", "active": True, "created_at": now_iso()},
            {"id": new_id(), "title": "Refer & Earn ₹250", "subtitle": "Invite friends and both earn instantly", "code": "REFER250", "active": True, "created_at": now_iso()},
            {"id": new_id(), "title": "Weekend Cashback 15%", "subtitle": "Every Sat & Sun on total wagers", "code": "WEEKEND15", "active": True, "created_at": now_iso()},
        ])

    # Seed VIP tiers
    if await db.vip_tiers.count_documents({}) == 0:
        await db.vip_tiers.insert_many([
            {"id": "bronze", "name": "Bronze", "min_wager": 0, "cashback": 2, "perks": ["Daily bonus", "Basic support"], "color": "#CD7F32"},
            {"id": "silver", "name": "Silver", "min_wager": 25000, "cashback": 5, "perks": ["Weekly bonus", "Priority support", "Free spins"], "color": "#C0C0C0"},
            {"id": "gold", "name": "Gold", "min_wager": 100000, "cashback": 8, "perks": ["Daily cashback", "Dedicated manager", "Higher limits"], "color": "#FFD700"},
            {"id": "platinum", "name": "Platinum", "min_wager": 500000, "cashback": 12, "perks": ["VIP events", "Exclusive tournaments", "Custom limits"], "color": "#E5E4E2"},
        ])


async def get_win_rate() -> float:
    cfg = await db.payment_config.find_one({"id": "default"}) or {}
    return float(cfg.get("player_win_rate", PLAYER_WIN_RATE))


async def add_transaction(user_id: str, kind: str, amount: float, meta: dict, status: str = "completed") -> dict:
    tx = {
        "id": new_id(),
        "user_id": user_id,
        "kind": kind,  # deposit | withdraw | bet | win | bonus | refund
        "amount": amount,
        "status": status,
        "meta": meta,
        "created_at": now_iso(),
    }
    await db.transactions.insert_one(tx)
    tx.pop("_id", None)
    return tx


# =========================================================
# AUTH
# =========================================================
@api.post("/auth/send-otp")
async def send_otp(payload: SendOtpIn):
    phone = payload.phone.strip()
    if not phone.startswith("+") or len(phone) < 8:
        raise HTTPException(400, "Phone must be in E.164 (e.g. +919999999999)")

    otp = gen_otp()
    # store OTP with 5-min expiry
    await db.otps.update_one(
        {"phone": phone},
        {"$set": {"phone": phone, "otp": otp, "expires_at": (datetime.now(timezone.utc) + timedelta(minutes=5)).isoformat(), "created_at": now_iso()}},
        upsert=True,
    )

    if _twilio_enabled:
        try:
            _twilio_client.verify.v2.services(TWILIO_VERIFY_SERVICE).verifications.create(to=phone, channel="sms")
            return {"success": True, "dev_mode": False}
        except Exception as e:
            logger.error(f"Twilio failure, falling back to dev OTP: {e}")

    # dev-mode: return OTP directly (visible for testing)
    logger.info(f"DEV OTP for {phone}: {otp}")
    return {"success": True, "dev_mode": True, "otp": otp}


@api.post("/auth/verify-otp")
async def verify_otp(payload: VerifyOtpIn):
    phone = payload.phone.strip()
    if _twilio_enabled:
        try:
            check = _twilio_client.verify.v2.services(TWILIO_VERIFY_SERVICE).verification_checks.create(to=phone, code=payload.otp)
            if check.status != "approved":
                raise HTTPException(400, "Invalid OTP")
        except HTTPException:
            raise
        except Exception:
            # fall through to local OTP check
            pass

    # local (dev) OTP check
    rec = await db.otps.find_one({"phone": phone})
    if not _twilio_enabled:
        if not rec or rec.get("otp") != payload.otp:
            raise HTTPException(400, "Invalid OTP")
        if datetime.fromisoformat(rec["expires_at"]) < datetime.now(timezone.utc):
            raise HTTPException(400, "OTP expired")

    # find or create user
    user = clean(await db.users.find_one({"phone": phone}))
    if not user:
        user = {
            "id": new_id(),
            "phone": phone,
            "uid": make_uid(),
            "name": payload.name or f"Player{secrets.randbelow(9999)}",
            "avatar": None,
            "balance": 50.0,  # welcome bonus
            "bonus_balance": 50.0,
            "vip_tier": "bronze",
            "total_wagered": 0.0,
            "referral_code": secrets.token_urlsafe(6),
            "referred_by": payload.referral,
            "created_at": now_iso(),
            "last_login": now_iso(),
        }
        await db.users.insert_one(user.copy())
        await add_transaction(user["id"], "bonus", 50.0, {"note": "Welcome bonus"})
        await db.notifications.insert_one({
            "id": new_id(),
            "user_id": user["id"],
            "title": "Welcome to Daman Gaming!",
            "body": "₹50 welcome bonus has been credited to your wallet.",
            "read": False,
            "created_at": now_iso(),
        })
    else:
        await db.users.update_one({"id": user["id"]}, {"$set": {"last_login": now_iso()}})

    await db.otps.delete_many({"phone": phone})
    token = create_token(user["id"], "user")
    return {"success": True, "token": token, "user": clean(await db.users.find_one({"id": user["id"]}))}


# =========================================================
# USER / PROFILE
# =========================================================
@api.get("/me")
async def get_me(user=Depends(get_current_user)):
    return user


@api.patch("/me")
async def update_me(payload: Dict[str, Any], user=Depends(get_current_user)):
    allowed = {k: v for k, v in payload.items() if k in {"name", "avatar", "email"}}
    if allowed:
        await db.users.update_one({"id": user["id"]}, {"$set": allowed})
    return clean(await db.users.find_one({"id": user["id"]}))


# =========================================================
# WALLET / TRANSACTIONS
# =========================================================
@api.get("/wallet")
async def wallet(user=Depends(get_current_user)):
    return {"balance": user["balance"], "bonus_balance": user.get("bonus_balance", 0.0), "vip_tier": user["vip_tier"]}


@api.get("/wallet/transactions")
async def transactions(user=Depends(get_current_user), kind: Optional[str] = None, limit: int = 100):
    q: dict = {"user_id": user["id"]}
    if kind:
        q["kind"] = kind
    docs = await db.transactions.find(q, {"_id": 0}).sort("created_at", -1).limit(limit).to_list(limit)
    return docs


# =========================================================
# DEPOSITS
# =========================================================
@api.get("/payment/config")
async def public_payment_config():
    cfg = clean(await db.payment_config.find_one({"id": "default"})) or {}
    # generate QR PNG (base64) from qr_data
    qr_data = cfg.get("qr_data") or ""
    qr_png_b64 = ""
    if qr_data:
        img = qrcode.make(qr_data)
        buf = io.BytesIO()
        img.save(buf, format="PNG")
        qr_png_b64 = base64.b64encode(buf.getvalue()).decode()
    return {
        "upi_ids": cfg.get("upi_ids", []),
        "qr_data": qr_data,
        "qr_png_base64": qr_png_b64,
        "min_deposit": cfg.get("min_deposit", 100),
        "min_withdraw": cfg.get("min_withdraw", 200),
        "max_withdraw": cfg.get("max_withdraw", 100000),
    }


@api.post("/deposits")
async def create_deposit(payload: DepositCreate, user=Depends(get_current_user)):
    cfg = await db.payment_config.find_one({"id": "default"}) or {}
    if payload.amount < cfg.get("min_deposit", 100):
        raise HTTPException(400, f"Minimum deposit is ₹{cfg.get('min_deposit', 100)}")
    if not payload.utr or len(payload.utr) < 4:
        raise HTTPException(400, "Please provide a valid UTR / reference number")
    dep = {
        "id": new_id(),
        "user_id": user["id"],
        "user_phone": user["phone"],
        "user_name": user["name"],
        "amount": payload.amount,
        "utr": payload.utr,
        "method": payload.method,
        "status": "pending",
        "created_at": now_iso(),
    }
    await db.deposits.insert_one(dep.copy())
    dep.pop("_id", None)
    return dep


@api.get("/deposits/mine")
async def my_deposits(user=Depends(get_current_user)):
    return await db.deposits.find({"user_id": user["id"]}, {"_id": 0}).sort("created_at", -1).to_list(200)


# =========================================================
# WITHDRAWALS
# =========================================================
@api.post("/withdrawals")
async def create_withdraw(payload: WithdrawCreate, user=Depends(get_current_user)):
    cfg = await db.payment_config.find_one({"id": "default"}) or {}
    if payload.amount < cfg.get("min_withdraw", 200):
        raise HTTPException(400, f"Minimum withdrawal is ₹{cfg.get('min_withdraw', 200)}")
    if payload.amount > cfg.get("max_withdraw", 100000):
        raise HTTPException(400, f"Maximum withdrawal is ₹{cfg.get('max_withdraw', 100000)}")
    if payload.amount > user["balance"]:
        raise HTTPException(400, "Insufficient balance")
    # lock funds
    await db.users.update_one({"id": user["id"]}, {"$inc": {"balance": -payload.amount}})
    w = {
        "id": new_id(),
        "user_id": user["id"],
        "user_phone": user["phone"],
        "user_name": user["name"],
        "amount": payload.amount,
        "upi_id": payload.upi_id,
        "account_name": payload.account_name,
        "status": "pending",
        "created_at": now_iso(),
    }
    await db.withdrawals.insert_one(w.copy())
    await add_transaction(user["id"], "withdraw", -payload.amount, {"upi_id": payload.upi_id, "status": "pending"}, status="pending")
    w.pop("_id", None)
    return w


@api.get("/withdrawals/mine")
async def my_withdrawals(user=Depends(get_current_user)):
    return await db.withdrawals.find({"user_id": user["id"]}, {"_id": 0}).sort("created_at", -1).to_list(200)


# =========================================================
# GAMES (all 38% win / 62% loss)
# =========================================================
GAME_CATEGORIES = [
    {"id": "crash", "name": "Crash Games", "icon": "rocket", "color": "#FF6B6B", "playable": True},
    {"id": "aviator", "name": "Aviator", "icon": "airplane", "color": "#FF9A9E", "playable": True},
    {"id": "dice", "name": "Dice Games", "icon": "dice", "color": "#FFB020", "playable": True},
    {"id": "spin", "name": "Spin Games", "icon": "target", "color": "#2ECA7F", "playable": True},
    {"id": "cards", "name": "Card Games", "icon": "cards", "color": "#4A4A4A", "playable": False},
    {"id": "number", "name": "Number Games", "icon": "grid", "color": "#FF7E67", "playable": False},
    {"id": "arcade", "name": "Arcade Games", "icon": "gamepad", "color": "#FF6B6B", "playable": False},
    {"id": "puzzle", "name": "Puzzle Games", "icon": "puzzle", "color": "#FF9A9E", "playable": False},
    {"id": "casual", "name": "Casual Games", "icon": "smiley", "color": "#FFB020", "playable": False},
    {"id": "skill", "name": "Skill Games", "icon": "trophy", "color": "#2ECA7F", "playable": False},
    {"id": "tournament", "name": "Tournaments", "icon": "medal", "color": "#E53935", "playable": False},
]


@api.get("/games/catalog")
async def games_catalog():
    return {"categories": GAME_CATEGORIES}


@api.post("/games/play")
async def play_game(payload: PlayGameIn, user=Depends(get_current_user)):
    if payload.bet_amount <= 0:
        raise HTTPException(400, "Bet must be positive")
    if payload.bet_amount > user["balance"]:
        raise HTTPException(400, "Insufficient balance")

    win_rate = await get_win_rate()
    is_win = random.random() < win_rate

    # deduct bet up-front
    await db.users.update_one({"id": user["id"]}, {"$inc": {"balance": -payload.bet_amount, "total_wagered": payload.bet_amount}})
    await add_transaction(user["id"], "bet", -payload.bet_amount, {"game": payload.game_type})

    payout = 0.0
    result_meta: Dict[str, Any] = {"game": payload.game_type, "win": is_win}

    gt = payload.game_type
    if gt == "crash":
        # multiplier: if win -> user's cash_out point is BELOW crash; else above.
        target = float(payload.params.get("cash_out", 2.0))
        target = max(1.01, min(target, 100.0))
        if is_win:
            crash_at = round(random.uniform(target + 0.1, target + max(5.0, target * 2)), 2)
            payout = payload.bet_amount * target
        else:
            crash_at = round(random.uniform(1.01, max(1.02, target - 0.05)), 2)
        result_meta.update({"crash_at": crash_at, "cash_out": target})
    elif gt == "aviator":
        target = float(payload.params.get("cash_out", 2.0))
        target = max(1.01, min(target, 100.0))
        if is_win:
            fly_to = round(random.uniform(target + 0.2, target + max(6.0, target * 2.5)), 2)
            payout = payload.bet_amount * target
        else:
            fly_to = round(random.uniform(1.01, max(1.02, target - 0.05)), 2)
        result_meta.update({"fly_to": fly_to, "cash_out": target})
    elif gt == "dice":
        # user picks "over" or "under" a threshold 1..99. multiplier ~ 99/chance
        pick = payload.params.get("pick", "over")
        threshold = int(payload.params.get("threshold", 50))
        threshold = max(2, min(98, threshold))
        if pick == "over":
            chance = 100 - threshold
        else:
            chance = threshold
        multiplier = round(97.0 / chance, 2)
        # roll must reflect outcome
        if is_win:
            if pick == "over":
                roll = random.randint(threshold + 1, 100)
            else:
                roll = random.randint(1, threshold - 1)
            payout = payload.bet_amount * multiplier
        else:
            if pick == "over":
                roll = random.randint(1, threshold)
            else:
                roll = random.randint(threshold, 100)
        result_meta.update({"roll": roll, "pick": pick, "threshold": threshold, "multiplier": multiplier})
    elif gt == "spin":
        # 8 segments with different multipliers
        segments = payload.params.get("segments") or [0, 1.5, 0, 2, 0, 3, 0, 5]
        segments = [float(s) for s in segments]
        winning_indices = [i for i, v in enumerate(segments) if v > 0]
        losing_indices = [i for i, v in enumerate(segments) if v <= 0]
        if is_win and winning_indices:
            idx = random.choice(winning_indices)
        else:
            idx = random.choice(losing_indices or list(range(len(segments))))
            is_win = segments[idx] > 0
        if is_win:
            payout = payload.bet_amount * segments[idx]
        result_meta.update({"segment_index": idx, "segment_multiplier": segments[idx]})
    elif gt == "andar-bahar":
        pick = payload.params.get("pick", "andar")
        result_meta["pick"] = pick
        result_meta["winner"] = pick if is_win else ("bahar" if pick == "andar" else "andar")
        if is_win: payout = payload.bet_amount * 1.9; result_meta["multiplier"] = 1.9
    elif gt == "teenpatti":
        hands = ["Trail", "Pure Sequence", "Sequence", "Color", "Pair", "High Card"]
        result_meta["player_hand"] = random.choice(hands); result_meta["dealer_hand"] = random.choice(hands)
        if is_win: payout = payload.bet_amount * 2.0; result_meta["multiplier"] = 2.0
    elif gt == "number-king":
        pick = int(payload.params.get("number", 5)); pick = max(0, min(9, pick))
        roll = pick if is_win else random.choice([n for n in range(10) if n != pick])
        if is_win: payout = payload.bet_amount * 9.0
        result_meta.update({"pick": pick, "roll": roll, "multiplier": 9.0})
    elif gt == "plinko":
        slots = [10, 4, 2, 1.2, 0.5, 1.2, 2, 4, 10]
        idx = random.choice([i for i, m in enumerate(slots) if (m > 1 if is_win else m <= 1)])
        if is_win: payout = payload.bet_amount * slots[idx]
        result_meta.update({"slot": idx, "multiplier": slots[idx]})
    elif gt == "mines":
        picks = int(payload.params.get("picks", 3)); picks = max(1, min(5, picks))
        multiplier = round(1.0 + picks * 0.6, 2)
        if is_win:
            payout = payload.bet_amount * multiplier
            revealed = ["gem"] * picks
        else:
            mine_at = random.randint(0, picks - 1)
            revealed = ["gem" if i != mine_at else "mine" for i in range(picks)]
        result_meta.update({"picks": picks, "revealed": revealed, "multiplier": multiplier})
    elif gt == "match3":
        symbols = ["A", "B", "C", "S", "D", "7"]
        if is_win:
            sym = random.choice(symbols); board = [sym, sym, sym]
            mult = 5.0 if sym in ("D", "7") else 2.5
            payout = payload.bet_amount * mult; result_meta["multiplier"] = mult
        else:
            board = random.sample(symbols, 3)
        result_meta["board"] = board
    elif gt == "bullseye":
        if is_win:
            ring = random.choices(["bullseye", "inner", "middle"], weights=[1, 2, 3])[0]
            mult = {"bullseye": 10.0, "inner": 5.0, "middle": 2.0}[ring]
            payout = payload.bet_amount * mult
            result_meta.update({"ring": ring, "multiplier": mult})
        else:
            result_meta.update({"ring": "miss", "multiplier": 0})
    elif gt == "sudoku":
        if is_win: payout = payload.bet_amount * 2.5; result_meta["multiplier"] = 2.5
    elif gt == "tournament":
        rank = random.randint(1, 3) if is_win else random.randint(4, 10)
        if is_win:
            mult = {1: 8.0, 2: 4.0, 3: 2.0}[rank]
            payout = payload.bet_amount * mult; result_meta["multiplier"] = mult
        result_meta["rank"] = rank
    else:
        # generic
        if is_win:
            multiplier = round(random.uniform(1.5, 3.0), 2)
            payout = payload.bet_amount * multiplier
            result_meta["multiplier"] = multiplier

    if payout > 0:
        await db.users.update_one({"id": user["id"]}, {"$inc": {"balance": payout}})
        await add_transaction(user["id"], "win", payout, result_meta)

    fresh = clean(await db.users.find_one({"id": user["id"]}))
    return {"win": is_win, "payout": payout, "balance": fresh["balance"], "result": result_meta}


# =========================================================
# INTERACTIVE CRASH / AVIATOR (live tap-to-cash-out)
# =========================================================
@api.post("/games/crash/start")
async def crash_start(payload: CrashStartIn, user=Depends(get_current_user)):
    bet = payload.bet_amount
    if bet <= 0:
        raise HTTPException(400, "Bet must be positive")
    if bet > user["balance"]:
        raise HTTPException(400, "Insufficient balance")

    win_rate = await get_win_rate()
    winnable = random.random() < win_rate
    # Economics: ~win_rate rounds give room to cash out; rest crash almost instantly.
    if winnable:
        crash_point = round(random.uniform(1.30, 12.0), 2)
    else:
        crash_point = round(random.uniform(1.00, 1.25), 2)

    await db.users.update_one({"id": user["id"]}, {"$inc": {"balance": -bet, "total_wagered": bet}})
    await add_transaction(user["id"], "bet", -bet, {"game": payload.game_type})

    rid = new_id()
    started_at = datetime.now(timezone.utc)
    await db.crash_rounds.insert_one({
        "id": rid,
        "user_id": user["id"],
        "game_type": payload.game_type,
        "bet": bet,
        "crash_point": crash_point,
        "auto_cash_out": payload.auto_cash_out,
        "started_at": started_at.isoformat(),
        "settled": False,
    })
    fresh = clean(await db.users.find_one({"id": user["id"]}))
    # crash_point is intentionally NOT returned to the client (anti-cheat).
    return {
        "round_id": rid,
        "started_at": started_at.isoformat(),
        "auto_cash_out": payload.auto_cash_out,
        "balance": fresh["balance"],
        "curve": {"a": CRASH_A, "b": CRASH_B},
    }


@api.post("/games/crash/cashout")
async def crash_cashout(payload: CrashCashoutIn, user=Depends(get_current_user)):
    rnd = await db.crash_rounds.find_one({"id": payload.round_id, "user_id": user["id"]})
    if not rnd:
        raise HTTPException(404, "Round not found")
    if rnd["settled"]:
        raise HTTPException(400, "Round already settled")

    started = datetime.fromisoformat(rnd["started_at"])
    elapsed = (datetime.now(timezone.utc) - started).total_seconds()
    server_mult = crash_multiplier_at(elapsed)
    crash_point = rnd["crash_point"]

    # If the round has already reached the crash point (server-side time), it's a loss.
    if server_mult >= crash_point:
        await db.crash_rounds.update_one({"id": rnd["id"]}, {"$set": {"settled": True, "outcome": "crashed", "settled_at": now_iso()}})
        fresh = clean(await db.users.find_one({"id": user["id"]}))
        return {"win": False, "crashed": True, "crash_point": crash_point, "balance": fresh["balance"]}

    # Effective cash-out multiplier: clamped by both crash point and server time (anti-cheat).
    effective = min(payload.multiplier, crash_point, server_mult + 0.15)
    effective = max(1.01, round(effective, 2))
    payout = round(rnd["bet"] * effective, 2)

    await db.users.update_one({"id": user["id"]}, {"$inc": {"balance": payout}})
    await add_transaction(user["id"], "win", payout, {"game": rnd["game_type"], "multiplier": effective, "win": True})
    await db.crash_rounds.update_one({"id": rnd["id"]}, {"$set": {"settled": True, "outcome": "cashed", "cash_multiplier": effective, "settled_at": now_iso()}})
    fresh = clean(await db.users.find_one({"id": user["id"]}))
    return {"win": True, "crashed": False, "multiplier": effective, "payout": payout, "balance": fresh["balance"]}


@api.post("/games/crash/settle")
async def crash_settle(payload: CrashSettleIn, user=Depends(get_current_user)):
    """Called by the client when the rocket crashed without a cash-out. Bet already deducted."""
    rnd = await db.crash_rounds.find_one({"id": payload.round_id, "user_id": user["id"]})
    if not rnd:
        raise HTTPException(404, "Round not found")
    if not rnd["settled"]:
        await db.crash_rounds.update_one({"id": rnd["id"]}, {"$set": {"settled": True, "outcome": "crashed", "settled_at": now_iso()}})
    fresh = clean(await db.users.find_one({"id": user["id"]}))
    return {"win": False, "crash_point": rnd["crash_point"], "balance": fresh["balance"]}


@api.get("/games/crash/status/{round_id}")
async def crash_status(round_id: str, user=Depends(get_current_user)):
    """Polled by the client. Reveals crash_point ONLY once the round has actually crashed."""
    rnd = await db.crash_rounds.find_one({"id": round_id, "user_id": user["id"]})
    if not rnd:
        raise HTTPException(404, "Round not found")
    started = datetime.fromisoformat(rnd["started_at"])
    elapsed = (datetime.now(timezone.utc) - started).total_seconds()
    server_mult = crash_multiplier_at(elapsed)
    crash_point = rnd["crash_point"]
    if rnd["settled"] and rnd.get("outcome") == "cashed":
        return {"status": "cashed", "multiplier": rnd.get("cash_multiplier"), "crash_point": crash_point}
    if server_mult >= crash_point:
        if not rnd["settled"]:
            await db.crash_rounds.update_one({"id": rnd["id"]}, {"$set": {"settled": True, "outcome": "crashed", "settled_at": now_iso()}})
        return {"status": "crashed", "crash_point": crash_point, "multiplier": crash_point}
    return {"status": "flying", "multiplier": server_mult}


# =========================================================
# LIVE BET FEED (recent wins across players)
# =========================================================
_FEED_NAMES = [
    "RajaKing", "LuckyStar", "AceHunter", "NoorX", "ProGamer99", "Mr_Vijay", "SkyWinner",
    "GoldRush", "RoyalAK", "ShadowFox", "BetMaster", "TigerZ", "CrazyRider", "DiamondD",
    "SonuBhai", "QueenBee", "FastCash", "RockyB", "MegaWin", "SilentK", "ThunderX", "ZaraPlays",
]


def _mask_name(name: str) -> str:
    if len(name) <= 3:
        return name[0] + "**"
    return name[:2] + "***" + name[-1]


@api.get("/games/feed")
async def games_feed(game: Optional[str] = None, limit: int = 15):
    """Recent real wins (masked) padded with lively synthetic entries."""
    entries: List[dict] = []
    q: dict = {"kind": "win"}
    async for t in db.transactions.find(q, {"_id": 0}).sort("created_at", -1).limit(limit):
        u = await db.users.find_one({"id": t["user_id"]}, {"name": 1})
        nm = _mask_name((u or {}).get("name", "Player"))
        mult = (t.get("meta") or {}).get("multiplier")
        entries.append({
            "name": nm,
            "game": (t.get("meta") or {}).get("game", "crash"),
            "amount": round(t.get("amount", 0), 2),
            "multiplier": mult,
            "real": True,
        })
    # pad with synthetic
    while len(entries) < limit:
        entries.append({
            "name": _mask_name(random.choice(_FEED_NAMES)),
            "game": game or random.choice(["crash", "aviator", "dice", "spin", "mines", "plinko"]),
            "amount": round(random.choice([50, 120, 250, 480, 999, 1500, 3200, 7800]) * random.uniform(0.5, 1.5), 2),
            "multiplier": round(random.uniform(1.5, 12.0), 2),
            "real": False,
        })
    random.shuffle(entries)
    return {"feed": entries}



# =========================================================
@api.get("/promotions")
async def promotions():
    return await db.promotions.find({"active": True}, {"_id": 0}).sort("created_at", -1).to_list(50)


@api.get("/vip")
async def vip(user=Depends(get_current_user)):
    tiers = await db.vip_tiers.find({}, {"_id": 0}).sort("min_wager", 1).to_list(20)
    return {"tiers": tiers, "current": user["vip_tier"], "total_wagered": user.get("total_wagered", 0.0)}


@api.get("/notifications")
async def get_notifications(user=Depends(get_current_user)):
    return await db.notifications.find({"$or": [{"user_id": user["id"]}, {"broadcast": True}]}, {"_id": 0}).sort("created_at", -1).to_list(100)


@api.post("/notifications/{nid}/read")
async def mark_read(nid: str, user=Depends(get_current_user)):
    await db.notifications.update_one({"id": nid}, {"$set": {"read": True}})
    return {"success": True}


@api.post("/support/tickets")
async def create_ticket(payload: SupportTicketIn, user=Depends(get_current_user)):
    t = {
        "id": new_id(),
        "user_id": user["id"],
        "user_phone": user["phone"],
        "subject": payload.subject,
        "message": payload.message,
        "status": "open",
        "created_at": now_iso(),
    }
    await db.tickets.insert_one(t.copy())
    t.pop("_id", None)
    return t


@api.get("/support/tickets")
async def my_tickets(user=Depends(get_current_user)):
    return await db.tickets.find({"user_id": user["id"]}, {"_id": 0}).sort("created_at", -1).to_list(50)


# =========================================================
# ADMIN
# =========================================================
@api.post("/admin/login")
async def admin_login(payload: AdminLoginIn):
    admin = await db.admins.find_one({"phone": payload.phone})
    if not admin or not verify_password(payload.password, admin["password_hash"]):
        raise HTTPException(401, "Invalid phone or password")
    return {"token": create_token(admin["id"], "admin"), "admin": {"id": admin["id"], "phone": admin["phone"], "name": admin["name"]}}


@api.get("/admin/dashboard")
async def admin_dashboard(admin=Depends(get_current_admin)):
    total_users = await db.users.count_documents({})
    pending_deposits = await db.deposits.count_documents({"status": "pending"})
    pending_withdrawals = await db.withdrawals.count_documents({"status": "pending"})
    # daily revenue = sum of approved deposits today
    today_start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0).isoformat()
    deposits_today = await db.deposits.find({"status": "approved", "created_at": {"$gte": today_start}}, {"_id": 0}).to_list(1000)
    revenue_today = sum(d["amount"] for d in deposits_today)
    total_deposits_amt = 0.0
    async for d in db.deposits.find({"status": "approved"}, {"amount": 1}):
        total_deposits_amt += d.get("amount", 0)
    total_withdrawals_amt = 0.0
    async for w in db.withdrawals.find({"status": "approved"}, {"amount": 1}):
        total_withdrawals_amt += w.get("amount", 0)
    return {
        "total_users": total_users,
        "pending_deposits": pending_deposits,
        "pending_withdrawals": pending_withdrawals,
        "revenue_today": revenue_today,
        "total_deposits": total_deposits_amt,
        "total_withdrawals": total_withdrawals_amt,
    }


@api.get("/admin/users")
async def admin_list_users(admin=Depends(get_current_admin), q: Optional[str] = None):
    query: dict = {}
    if q:
        query = {"$or": [{"phone": {"$regex": q, "$options": "i"}}, {"uid": {"$regex": q, "$options": "i"}}, {"name": {"$regex": q, "$options": "i"}}]}
    return await db.users.find(query, {"_id": 0}).sort("created_at", -1).limit(200).to_list(200)


@api.post("/admin/users/{uid}/adjust")
async def admin_adjust_balance(uid: str, payload: Dict[str, Any], admin=Depends(get_current_admin)):
    delta = float(payload.get("delta", 0))
    reason = payload.get("reason", "Admin adjustment")
    u = await db.users.find_one({"id": uid})
    if not u:
        raise HTTPException(404, "User not found")
    await db.users.update_one({"id": uid}, {"$inc": {"balance": delta}})
    await add_transaction(uid, "bonus" if delta > 0 else "refund", delta, {"reason": reason, "by": admin["phone"]})
    return clean(await db.users.find_one({"id": uid}))


@api.post("/admin/users/{uid}/block")
async def admin_block_user(uid: str, admin=Depends(get_current_admin)):
    u = await db.users.find_one({"id": uid})
    if not u:
        raise HTTPException(404, "User not found")
    await db.users.update_one({"id": uid}, {"$set": {"blocked": not u.get("blocked", False)}})
    return clean(await db.users.find_one({"id": uid}))


@api.get("/admin/deposits")
async def admin_list_deposits(admin=Depends(get_current_admin), status: Optional[str] = None):
    q: dict = {}
    if status:
        q["status"] = status
    return await db.deposits.find(q, {"_id": 0}).sort("created_at", -1).to_list(500)


@api.post("/admin/deposits/{did}/{action}")
async def admin_act_deposit(did: str, action: str, admin=Depends(get_current_admin)):
    if action not in {"approve", "reject"}:
        raise HTTPException(400, "action must be approve|reject")
    dep = await db.deposits.find_one({"id": did})
    if not dep:
        raise HTTPException(404, "Not found")
    if dep["status"] != "pending":
        raise HTTPException(400, "Already processed")
    if action == "approve":
        await db.users.update_one({"id": dep["user_id"]}, {"$inc": {"balance": dep["amount"]}})
        await add_transaction(dep["user_id"], "deposit", dep["amount"], {"utr": dep["utr"], "method": dep["method"]})
        await db.notifications.insert_one({
            "id": new_id(), "user_id": dep["user_id"],
            "title": "Deposit Approved",
            "body": f"₹{dep['amount']} credited to your wallet.", "read": False, "created_at": now_iso(),
        })
    else:
        await db.notifications.insert_one({
            "id": new_id(), "user_id": dep["user_id"],
            "title": "Deposit Rejected",
            "body": f"Your deposit of ₹{dep['amount']} was rejected. Please contact support.", "read": False, "created_at": now_iso(),
        })
    await db.deposits.update_one({"id": did}, {"$set": {"status": "approved" if action == "approve" else "rejected", "processed_at": now_iso(), "processed_by": admin["phone"]}})
    return clean(await db.deposits.find_one({"id": did}))


@api.get("/admin/withdrawals")
async def admin_list_withdrawals(admin=Depends(get_current_admin), status: Optional[str] = None):
    q: dict = {}
    if status:
        q["status"] = status
    return await db.withdrawals.find(q, {"_id": 0}).sort("created_at", -1).to_list(500)


@api.post("/admin/withdrawals/{wid}/{action}")
async def admin_act_withdrawal(wid: str, action: str, admin=Depends(get_current_admin)):
    if action not in {"approve", "reject"}:
        raise HTTPException(400, "action must be approve|reject")
    w = await db.withdrawals.find_one({"id": wid})
    if not w:
        raise HTTPException(404, "Not found")
    if w["status"] != "pending":
        raise HTTPException(400, "Already processed")
    if action == "approve":
        # funds already locked; complete the tx
        await add_transaction(w["user_id"], "withdraw", -w["amount"], {"upi_id": w["upi_id"], "status": "completed"})
        await db.notifications.insert_one({
            "id": new_id(), "user_id": w["user_id"],
            "title": "Withdrawal Approved",
            "body": f"₹{w['amount']} has been sent to {w['upi_id']}.", "read": False, "created_at": now_iso(),
        })
    else:
        # refund
        await db.users.update_one({"id": w["user_id"]}, {"$inc": {"balance": w["amount"]}})
        await add_transaction(w["user_id"], "refund", w["amount"], {"reason": "Withdrawal rejected"})
        await db.notifications.insert_one({
            "id": new_id(), "user_id": w["user_id"],
            "title": "Withdrawal Rejected",
            "body": f"Your withdrawal of ₹{w['amount']} was rejected. Amount refunded.", "read": False, "created_at": now_iso(),
        })
    await db.withdrawals.update_one({"id": wid}, {"$set": {"status": "approved" if action == "approve" else "rejected", "processed_at": now_iso(), "processed_by": admin["phone"]}})
    return clean(await db.withdrawals.find_one({"id": wid}))


@api.get("/admin/payment-config")
async def admin_get_payment(admin=Depends(get_current_admin)):
    cfg = clean(await db.payment_config.find_one({"id": "default"})) or {}
    return cfg


@api.patch("/admin/payment-config")
async def admin_update_payment(payload: UpsertPaymentConfigIn, admin=Depends(get_current_admin)):
    doc = payload.model_dump()
    doc["updated_at"] = now_iso()
    await db.payment_config.update_one({"id": "default"}, {"$set": doc}, upsert=True)
    return clean(await db.payment_config.find_one({"id": "default"}))


@api.patch("/admin/app-settings")
async def admin_update_app_settings(payload: Dict[str, Any], admin=Depends(get_current_admin)):
    # allow tweaking win rate
    if "player_win_rate" in payload:
        wr = float(payload["player_win_rate"])
        wr = max(0.0, min(1.0, wr))
        await db.payment_config.update_one({"id": "default"}, {"$set": {"player_win_rate": wr}}, upsert=True)
    return clean(await db.payment_config.find_one({"id": "default"}))


@api.post("/admin/broadcast")
async def admin_broadcast(payload: BroadcastIn, admin=Depends(get_current_admin)):
    doc = {
        "id": new_id(),
        "title": payload.title,
        "body": payload.body,
        "broadcast": True,
        "read": False,
        "created_at": now_iso(),
    }
    await db.notifications.insert_one(doc.copy())
    doc.pop("_id", None)
    return doc


@api.get("/admin/reports")
async def admin_reports(admin=Depends(get_current_admin)):
    # basic aggregate for last 7 days
    from collections import defaultdict
    days_data: Dict[str, Dict[str, float]] = defaultdict(lambda: {"deposits": 0.0, "withdrawals": 0.0, "bets": 0.0, "wins": 0.0})
    async for d in db.deposits.find({"status": "approved"}, {"_id": 0}):
        days_data[d["created_at"][:10]]["deposits"] += d["amount"]
    async for w in db.withdrawals.find({"status": "approved"}, {"_id": 0}):
        days_data[w["created_at"][:10]]["withdrawals"] += w["amount"]
    async for t in db.transactions.find({"kind": "bet"}, {"_id": 0}):
        days_data[t["created_at"][:10]]["bets"] += abs(t["amount"])
    async for t in db.transactions.find({"kind": "win"}, {"_id": 0}):
        days_data[t["created_at"][:10]]["wins"] += t["amount"]
    series = sorted([{"date": k, **v} for k, v in days_data.items()], key=lambda x: x["date"])
    return {"series": series[-14:]}


@api.get("/admin/tickets")
async def admin_tickets(admin=Depends(get_current_admin)):
    return await db.tickets.find({}, {"_id": 0}).sort("created_at", -1).to_list(200)


# Root
@api.get("/")
async def root():
    return {"ok": True, "app": "Daman Gaming", "time": now_iso()}


app.include_router(api)
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("shutdown")
async def shutdown():
    client.close()
