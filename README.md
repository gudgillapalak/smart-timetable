# Smart Timetable – AI timetable generator (GA / SA / PSO)

React + Node (Express) + MySQL. Generates clash-free class timetables with a Genetic Algorithm,
Simulated Annealing or Particle Swarm Optimisation, stores every result as a version, and lets you
fix things by drag-and-drop with instant conflict checking.

## Run it
Requirements: Node 18+, MySQL 8 (or MariaDB 10.5+).

```bash
# 1. API
cd backend
cp .env.example .env        # put your MySQL user/password in it
npm install
npm run db:init             # creates the database, tables and demo data
npm run dev                 # http://localhost:5000

# 2. Web app (second terminal)
cd frontend
npm install
npm run dev                 # http://localhost:5173
```
Demo logins: `admin / admin123`, `fac1 … fac8 / faculty123`, `student / student123`.

Try the optimisers without a database: `cd backend && npm run test:scheduler`.

## Roles
| Role | Can do |
|---|---|
| admin | everything: data entry, generate, edit, publish, export |
| faculty | see own timetable (published version), set unavailable / disliked slots, read-only student view |
| student | read-only batch timetable |
Faculty/students see the **published** version (Timetables → Publish).

## How the scheduling works
A solution is one `(day, slot, room)` triple per weekly session (subject × sessions-per-week; labs span 2 consecutive slots).
`cost = hard × 100 + soft`, `fitness = 1 / (1 + cost)`.

Hard (must be 0): faculty clash · batch clash · room clash · room too small · wrong room type (lab vs classroom) ·
faculty unavailable · session running past the end of the day.
Soft: faculty dislike slot · idle gaps in a batch's day · same subject twice in a day.

* **GA** – tournament selection, uniform crossover, per-gene mutation, elitism.
* **SA** – single-session moves and time swaps, geometric cooling.
* **PSO** – continuous (day, slot, room-index) vectors per session, rounded when evaluated.
All three can start from a randomised-greedy "smart seed" (adjustable) so they converge quickly. Runs execute in a worker thread.

## Manual edit
Open a version → drag a class. On drag start the server pre-computes the result of dropping on every cell
(best free room chosen automatically); cells turn green / amber / red instantly. Dropping on red asks for confirmation.
"Save as new version" copies the current state first if you want to keep the original.

## Layout
```
backend/src/scheduler   problem.js  evaluate.js  algorithms.js  worker.js  selftest.js
backend/src/routes      crud, auth, faculty, settings, generate, timetables
frontend/src/components  Viewer (grids + drag/drop), PrefPanel, CrudPage, exporters (PDF/Excel)
```
Notes: deleting a subject/room/faculty that a saved version uses is blocked (delete the version first).
Change `JWT_SECRET` before deploying.
