# Villan 11 — Premium Mobile Gaming Platform

## Overview
Full-stack Expo (React Native) + FastAPI + MongoDB gaming platform with dark premium branding (Villan 11 eagle logo, gold/red accents). Mobile OTP auth, wallet, deposits/withdrawals (manual QR/UPI approval), 4 playable mini-games (Crash, Aviator, Dice, Spin Wheel — all 38% win / 62% loss), promotions, VIP tiers, notifications, support, and full admin panel.

## Screens
User: Splash, Login (Mobile OTP), OTP, Home, Games Lobby (10 categories · 4 playable), Wallet, Deposit (QR & UPI), Withdraw, Transactions, Promotions & Referral, VIP & Rewards, Notifications, Customer Support, Profile, Settings, Game screens (Crash / Aviator / Dice / Spin / Coming-Soon).
Admin: Login, Dashboard, User Management, Deposit Requests, Withdrawal Requests, Payments (QR/UPI/Limits), Broadcast, Reports & Analytics, App Settings (win-rate control), Support Tickets.

## Tech
- Backend: FastAPI, MongoDB (motor), JWT auth, bcrypt, Twilio (dev-mode fallback), qrcode.
- Frontend: Expo Router, expo-linear-gradient, react-native-reanimated, safe-area-context, gesture-handler, Ionicons.

## Games (all 13 playable)
Crash, Aviator, Dice, Spin Wheel, Andar Bahar, Teen Patti, Number King, Plinko, Mines, Sudoku, Match Three, Bull's Eye, Weekly Cup. Each has a themed animation:
- Crash/Aviator: 3-2-1 countdown, rocket/plane climb, live real-time multiplier counter, drifting particle background, crash transition.
- Spin: accelerate/decelerate wheel with pointer + win celebration.
- Dice: rotate + bounce roll.
- Cards (Andar Bahar / Teen Patti): shuffle + flip reveal.
- Number King: shuffle reveal. Plinko: ball drop. Mines: sequential tile reveal. Match3: reels. Bull's Eye: dart fly.
- Global: round-history chips (fade/slide), win particle burst, reduced-motion support (AccessibilityInfo), loading/error states, duplicate-tap prevention (controls disabled while busy).

## Crash / Aviator — interactive cash-out
- `POST /games/crash/start` deducts bet, commits a hidden server-side crash point (62% crash <1.25x, 38% winnable up to 12x → preserves 38% economics).
- Client flies rocket with a live multiplier (shared curve m(t)=1+0.35t+0.09t²), shows a green CASH OUT button.
- `GET /games/crash/status/{id}` is polled (crash point revealed only after it crashes → anti-cheat).
- `POST /games/crash/cashout` settles the win at the tapped multiplier (server clamps by time + crash point).
- `POST /games/crash/settle` records a loss if the rocket crashes with no cash-out. Auto cash-out still supported via the Auto Cash-Out field.

## Live Bet Feed
- `GET /games/feed` returns recent real wins (masked names) padded with synthetic entries; `LiveBetFeed` component shows a scrolling "LIVE WINS" strip on every game screen, prepending a new entry every ~2.8s.

## Win Go (Daman-style color prediction) — signature game
- Timed rounds: 30s / 1min / 3min / 5min. Live period number + countdown; betting locks in the last 5s.
- Bet on Green (2x) / Violet (4.5x) / Red (2x), Numbers 0-9 (9x), Big/Small (2x) via a bet sheet (amount + quantity).
- Result number 0-9 with standard color mapping (0=red+violet, 5=green+violet, 1/3/7/9=green, 2/4/6/8=red); size big/small.
- Rounds auto-settle server-side when the period ends; winnings credited. Game History table + My Bets tab.
- 38% win economics enforced by biasing the drawn number toward the user's highest-stake bet.
- Endpoints: GET /api/wingo/state (settles + history + my bets), POST /api/wingo/bet. Entry points: Games lobby featured card + Home Popular rail (/wingo).

## Game economics
Server-controlled: 38% win / 62% loss. Adjustable at Admin → App Settings. Outcomes are decided server-side (fair random) — animations only visualize the returned result.

## Auth
Mobile OTP (dev-mode until Twilio keys are configured in `/app/backend/.env`).

## Admin
Seeded: `+919999999999` / `Vicky@0122`.
