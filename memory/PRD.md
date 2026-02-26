# Trio TAG - Fitness Event Dashboard PRD

## Original Problem Statement
Build a single-page web dashboard for the "Trio TAG" fitness event to manage teams, data entry, and a live leaderboard. Event organized by 365 Run Club x Puma at XTRALIVING.

## Architecture
- **Frontend**: React + Tailwind + Shadcn/UI (port 3000)
- **Backend**: FastAPI (port 8001)
- **Database**: MongoDB
- **Auth**: JWT-based (username: 365run, password: GANG365)

## User Personas
1. **Event Volunteers** - Use Admin Panel to upload participants, generate teams, enter station times
2. **Spectators/Participants** - View the public Live Leaderboard on big screens

## Core Requirements
- CSV upload for participants (Name, Gender)
- Team generation: 2M/1F mode or Random mode (3 per team)
- Wave assignment (3 teams per wave)
- Time entry per station in MM:SS format
- 6 stations: Row 750m, Farmers carry, Ski 750m, Broad burpee jumps, Assault bike, Body weight lunges
- Live leaderboard with auto-refresh (3s polling)
- Active wave pulsing green indicator
- Dark theme with volt green (#CCFF00) accents

## What's Been Implemented (Feb 2026)
- [x] Login page with JWT auth
- [x] Admin Control Panel with 3 tabs (Upload, Teams, Time Entry)
- [x] CSV participant upload with male/female summary
- [x] Team generation (2M/1F and Random modes)
- [x] Wave assignment (3 teams per wave)
- [x] Station time data entry (MM:SS format)
- [x] Live Leaderboard with 3s auto-refresh
- [x] Active wave pulsing indicator
- [x] Reset all data functionality
- [x] Full dark theme UI matching event poster aesthetic
- [x] Logos: 365 RUN CLUB, PUMA, XTRALIVING in header
- [x] All backend API endpoints tested and working
- [x] Responsive design for tablet/mobile

## Prioritized Backlog
### P0 (Critical) - All Done
### P1 (High)
- [ ] Export results to CSV/PDF
- [ ] Print-friendly leaderboard view
### P2 (Nice-to-Have)
- [ ] Sound effects on rank changes
- [ ] QR code generator for leaderboard URL
- [ ] Timer stopwatch built into admin panel
- [ ] Station rotation tracking per wave

## Next Tasks
1. Test with real event data
2. Add result export functionality
3. Add shareable leaderboard URL with QR code
