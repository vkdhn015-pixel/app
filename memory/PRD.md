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

## Game economics
Server-controlled: 38% win / 62% loss. Adjustable at Admin → App Settings. Outcomes are decided server-side (fair random) — animations only visualize the returned result.

## Auth
Mobile OTP (dev-mode until Twilio keys are configured in `/app/backend/.env`).

## Admin
Seeded: `+919999999999` / `Vicky@0122`.
