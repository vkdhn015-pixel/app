"""Backend regression tests for Villan/Daman gaming platform.
Covers: auth OTP, wallet, all 13 games /play, interactive crash, feed, win-rate economics.
"""
import os
import time
import random
import pytest
import requests

BASE_URL = os.environ.get("EXPO_PUBLIC_BACKEND_URL") or os.environ.get("EXPO_BACKEND_URL")
assert BASE_URL, "EXPO_PUBLIC_BACKEND_URL / EXPO_BACKEND_URL must be set"
BASE_URL = BASE_URL.rstrip("/")
API = f"{BASE_URL}/api"


def _rand_phone():
    return "+91" + str(random.randint(7000000000, 9999999999))


@pytest.fixture(scope="session")
def session():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


@pytest.fixture(scope="session")
def auth(session):
    phone = _rand_phone()
    r = session.post(f"{API}/auth/send-otp", json={"phone": phone}, timeout=15)
    assert r.status_code == 200, r.text
    body = r.json()
    assert body.get("dev_mode") is True and body.get("otp")
    otp = body["otp"]
    r2 = session.post(f"{API}/auth/verify-otp", json={"phone": phone, "otp": otp, "name": "TEST_User"}, timeout=15)
    assert r2.status_code == 200, r2.text
    data = r2.json()
    assert data.get("token") and data.get("user")
    assert data["user"]["balance"] == 50.0
    return {"phone": phone, "token": data["token"], "user": data["user"]}


@pytest.fixture
def headers(auth):
    return {"Authorization": f"Bearer {auth['token']}", "Content-Type": "application/json"}


# ---------------- AUTH ----------------
class TestAuth:
    def test_send_otp_bad_phone(self, session):
        r = session.post(f"{API}/auth/send-otp", json={"phone": "12345"})
        assert r.status_code == 400

    def test_verify_otp_invalid(self, session):
        phone = _rand_phone()
        session.post(f"{API}/auth/send-otp", json={"phone": phone})
        r = session.post(f"{API}/auth/verify-otp", json={"phone": phone, "otp": "000000"})
        assert r.status_code == 400


# ---------------- WALLET ----------------
class TestWallet:
    def test_wallet_returns_balance(self, session, headers):
        r = session.get(f"{API}/wallet", headers=headers)
        assert r.status_code == 200
        d = r.json()
        assert "balance" in d and isinstance(d["balance"], (int, float))
        assert d["vip_tier"] == "bronze"

    def test_wallet_requires_auth(self, session):
        r = session.get(f"{API}/wallet")
        assert r.status_code == 401


# ---------------- GAMES /play ----------------
GAME_TYPES = [
    "dice", "spin", "andar-bahar", "teenpatti", "number-king",
    "plinko", "mines", "match3", "bullseye", "sudoku", "tournament",
]


class TestGamesPlay:
    @pytest.mark.parametrize("gt", GAME_TYPES)
    def test_play_game(self, session, headers, gt):
        # ensure some balance
        w = session.get(f"{API}/wallet", headers=headers).json()
        if w["balance"] < 1:
            pytest.skip("insufficient balance")
        before = w["balance"]
        r = session.post(f"{API}/games/play", json={"game_type": gt, "bet_amount": 1.0, "params": {}}, headers=headers)
        assert r.status_code == 200, f"{gt}: {r.text}"
        d = r.json()
        for k in ("win", "payout", "balance", "result"):
            assert k in d, f"{gt} missing {k}"
        assert isinstance(d["win"], bool)
        # balance math
        expected = round(before - 1.0 + (d["payout"] if d["win"] else 0.0), 2)
        assert abs(d["balance"] - expected) < 0.01, f"{gt} balance mismatch: before={before} payout={d['payout']} after={d['balance']}"

    def test_bet_negative_rejected(self, session, headers):
        r = session.post(f"{API}/games/play", json={"game_type": "dice", "bet_amount": 0}, headers=headers)
        assert r.status_code == 400

    def test_bet_over_balance_rejected(self, session, headers):
        r = session.post(f"{API}/games/play", json={"game_type": "dice", "bet_amount": 999999}, headers=headers)
        assert r.status_code == 400


# ---------------- CRASH INTERACTIVE ----------------
class TestCrash:
    def test_crash_start_no_crash_point(self, session, headers):
        w = session.get(f"{API}/wallet", headers=headers).json()
        if w["balance"] < 1:
            pytest.skip("insufficient balance")
        r = session.post(f"{API}/games/crash/start", json={"bet_amount": 1.0, "game_type": "crash"}, headers=headers)
        assert r.status_code == 200, r.text
        d = r.json()
        assert d.get("round_id") and d.get("started_at") and d.get("curve")
        assert "crash_point" not in d, "crash_point leaked to client"
        # status
        s = session.get(f"{API}/games/crash/status/{d['round_id']}", headers=headers)
        assert s.status_code == 200
        assert s.json()["status"] in ("flying", "crashed", "cashed")
        # settle (loss)
        st = session.post(f"{API}/games/crash/settle", json={"round_id": d["round_id"]}, headers=headers)
        assert st.status_code == 200
        assert st.json()["win"] is False

    def test_crash_cashout_flow(self, session, headers):
        w = session.get(f"{API}/wallet", headers=headers).json()
        if w["balance"] < 1:
            pytest.skip("insufficient balance")
        r = session.post(f"{API}/games/crash/start", json={"bet_amount": 1.0}, headers=headers)
        assert r.status_code == 200
        rid = r.json()["round_id"]
        # cashout immediately at 1.05
        c = session.post(f"{API}/games/crash/cashout", json={"round_id": rid, "multiplier": 1.05}, headers=headers)
        assert c.status_code == 200
        # Either win (round survived) or crashed (very low crash_point)
        body = c.json()
        assert "balance" in body


# ---------------- FEED ----------------
class TestFeed:
    def test_feed_returns_15(self, session):
        r = session.get(f"{API}/games/feed")
        assert r.status_code == 200
        feed = r.json().get("feed", [])
        assert len(feed) == 15
        for e in feed:
            assert "name" in e and "game" in e and "amount" in e


# ---------------- WIN RATE ECONOMICS ----------------
class TestWinRateEconomics:
    def test_dice_win_rate_around_38(self, session, headers):
        # Top up via admin adjust so we have plenty of balance
        # We'll just try 200 bets of 1 each; ensure balance suffices via admin.
        # Login as admin.
        admin_phone = os.environ.get("ADMIN_SEED_PHONE", "+919999999999")
        admin_pw = os.environ.get("ADMIN_SEED_PASSWORD", "Vicky@0122")
        alog = session.post(f"{API}/admin/login", json={"phone": admin_phone, "password": admin_pw})
        if alog.status_code != 200:
            pytest.skip("admin unavailable")
        admin_token = alog.json()["token"]
        me = session.get(f"{API}/me", headers=headers).json()
        session.post(
            f"{API}/admin/users/{me['id']}/adjust",
            json={"delta": 500.0, "reason": "TEST_topup"},
            headers={"Authorization": f"Bearer {admin_token}", "Content-Type": "application/json"},
        )
        N = 200
        wins = 0
        for _ in range(N):
            r = session.post(f"{API}/games/play", json={"game_type": "dice", "bet_amount": 1.0,
                                                        "params": {"pick": "over", "threshold": 50}}, headers=headers)
            if r.status_code != 200:
                break
            if r.json()["win"]:
                wins += 1
        rate = wins / N
        print(f"Observed dice win rate over {N}: {rate:.3f}")
        assert 0.30 <= rate <= 0.46, f"win rate {rate:.3f} outside 30-46% band"
