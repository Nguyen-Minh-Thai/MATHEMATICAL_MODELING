# NSGA2 Solver Integration Guide

## Project Structure

This project wraps the NSGA2-based Python solver from `exam-scheduling-engine-main-NSGA2` in a modern TypeScript/React web interface.

### Frontend (exam-scheduling-solver-NSGA2)
- **Technology:** Vite + React + TypeScript + TailwindCSS
- **Port:** http://localhost:3000
- **Features:**
  - Real-time solver execution monitoring
  - Interactive dashboards
  - Multi-objective visualization
  - Excel export

### Backend (exam-scheduling-engine-main-NSGA2)
- **Technology:** Python 3.9+ with pymoo
- **Algorithm:** NSGA-II (Multi-Objective Genetic Algorithm)
- **Objectives:** 3D Pareto optimization
  - Fairness (shift balance, equity)
  - Quality (distance, elderly protection)
  - Weekend balance

## Quick Start

### 1. Install Dependencies

```bash
# Frontend dependencies
cd exam-scheduling-solver-NSGA2
npm install

# Backend dependencies (if not already installed)
cd ../exam-scheduling-engine-main-NSGA2/exam-scheduling-engine-main
pip install -r requirements.txt
```

### 2. Prepare Data Files

Place your exam/staff data in:
```
../exam-scheduling-engine-main-NSGA2/exam-scheduling-engine-main/data/
```

Required Excel columns:
- **Shifts Excel:**
  - Ngày (Date)
  - Ca thi (Shift ID)
  - Cơ sở (Campus)
  - Số lượng cán bộ cần thiết (Required staff count)

- **Staff Excel:**
  - Tên (Name)
  - Tuổi (Age)
  - Cơ sở (Home campus)
  - KC CS1 (km) (Distance to campus 1)
  - KC CS2 (km) (Distance to campus 2)

### 3. Start the Server

```bash
npm run dev
```

This starts:
- Vite dev server on port 5173
- Express API on port 3000
- Connected through Vite proxy

### 4. Access the Web Interface

Open **http://localhost:3000** in your browser

## Server Configuration

### File: server.ts

Key configuration paths:

```typescript
// Backend root directory
const repoRoot = path.join(process.cwd(), '..', 'exam-scheduling-engine-main-NSGA2', 'exam-scheduling-engine-main');

// Python executable (auto-detected or from PYTHON_PATH env var)
const pythonExe = process.env.PYTHON_PATH || 'python';

// Main solver entry point
const scriptPath = path.join(repoRoot, 'main.py');
```

### Environment Variables

Create `.env` file if needed:

```bash
# Optional: Specify Python executable path
PYTHON_PATH=/usr/bin/python3
# or
PYTHON_PATH=C:\Python314\python.exe

# Optional: Specify node environment
NODE_ENV=development
```

## Python Backend Configuration

### File: config.py

Located in `../exam-scheduling-engine-main-NSGA2/exam-scheduling-engine-main/config.py`

**Key Solver Parameters:**

```python
# Algorithm parameters
POPULATION_SIZE = 300              # Population per generation
NUM_GENERATIONS = 1000             # Total generations
MUTATION_RATE = 0.1                # Mutation probability
RANDOM_SEED = 42                   # For reproducibility

# Constraint parameters
ALLOWED_SHIFT_DEVIATION = 2        # Max ±shifts from average
ELDERLY_AGE_THRESHOLD = 45         # Age threshold for protection

# Objective weights (Tchebycheff scalarization)
WEIGHT_FAIRNESS_F1 = 1.0
WEIGHT_QUALITY_F2 = 1.0
WEIGHT_WEEKEND_F3 = 0.5

# Penalty coefficients (higher = stricter)
HARD_CONFLICT_PENALTY = 1e6        # Time overlap violation
NO_ASSIGNMENT_PENALTY = 1e5        # Staff with 0 shifts
OUT_OF_RANGE_PENALTY = 1000        # Out of deviation range
MAX_MIN_GAP_PENALTY = 100
STD_DEVIATION_PENALTY = 50
ELDERLY_LATE_SHIFT_PENALTY = 200
ELDERLY_SHIFT_OVERLOAD_PENALTY = 100
...and more
```

**Tuning Guide:**

1. **Better Fairness** → Increase `WEIGHT_FAIRNESS_F1` (up to 2.0)
2. **Better Quality** → Increase `WEIGHT_QUALITY_F2` or `WEIGHT_WEEKEND_F3`
3. **Faster Convergence** → Lower `POPULATION_SIZE` to 100-200
4. **Better Solutions** → Increase `NUM_GENERATIONS` to 1500-2000

## Data Input/Output

### Input Data

```
../exam-scheduling-engine-main-NSGA2/exam-scheduling-engine-main/data/
├── ca_thi.xlsx           # Exam shifts (configurable in config.py)
└── can_bo.xlsx           # Staff data (configurable in config.py)
```

### Output Files

```
../exam-scheduling-engine-main-NSGA2/exam-scheduling-engine-main/outputs/
├── Ket_Qua_Xep_Lich.xlsx       # Main schedule output
├── lich_truc_final.xlsx        # Alternative format
└── logs/                       # Solver logs (optional)
```

## Frontend UI Components

### Main Views

1. **Dashboard**
   - Solver engine status
   - Constraint satisfaction progress
   - Performance metrics

2. **Data Management**
   - Upload exam/staff files
   - View loaded data
   - Configure solver parameters

3. **Results Schedule**
   - View optimized assignment
   - Workload analysis
   - Compliance checks
   - Export to Excel

## Solver API Flow

### Request Flow

```
User clicks "Run Solver"
    ↓
Frontend: POST /api/solve
    ↓
Server: Spawn Python process (main.py)
    ↓
Python: Load data → Run NSGA2 → Generate results
    ↓
Server: Capture output
    ↓
Frontend: Display metrics & enable export
```

### Error Handling

- Solver already running → HTTP 409 (Conflict)
- Python exit code ≠ 0 → HTTP 500 with stderr
- Missing output files → HTTP 500 with explanation

## Performance Optimization

### For Large Instances (100+ staff)

```python
# config.py
POPULATION_SIZE = 150              # Reduce population
NUM_GENERATIONS = 500              # Reduce generations (trade quality for speed)
```

Typical runtime: 5-15 minutes depending on instance size

### For Better Solutions (small instances <50 staff)

```python
POPULATION_SIZE = 500              # Larger population
NUM_GENERATIONS = 1500             # More iterations
RANDOM_SEED = 0                    # Vary seed (try multiple runs)
```

## Troubleshooting

### Issue: "Solver already running"

The previous solver process didn't finish. Wait or:
```bash
# Kill processes
pkill -f python
# or
taskkill /F /IM python.exe  # Windows
```

### Issue: "Python solver exited with code"

- Check Python installation: `python --version`
- Check dependencies: `pip list | grep pymoo`
- Check data files exist in `data/` folder
- Review server logs for stderr output

### Issue: Solver hangs or times out

- Reduce `POPULATION_SIZE` and `NUM_GENERATIONS`
- Check if data has conflicts (time-slot conflicts)
- Increase available CPU resources

### Issue: Poor solution quality

- Increase `NUM_GENERATIONS` to 1500+
- Increase `POPULATION_SIZE` to 400+
- Run multiple times (results vary due to randomness)
- Adjust penalty coefficients in config.py

## Development

### Debugging

Enable verbose output:

```bash
# Windows
set DEBUG=* && npm run dev

# Linux/Mac
export DEBUG=* && npm run dev
```

### Hot Module Reload (HMR)

Frontend auto-reloads on code changes. Backend changes require restart.

### Building for Production

```bash
npm run build
npm run start
```

## Deployment

### Docker (Optional)

Create `Dockerfile`:

```dockerfile
FROM node:18
WORKDIR /app
COPY . .
RUN npm install
EXPOSE 3000
CMD ["npm", "start"]
```

### Requirements for Production

- Python 3.9+
- Node.js 16+
- 4GB RAM minimum
- CPU with multi-core support recommended

## Support & Documentation

- NSGA-II Algorithm: https://pymoo.org/
- React/Vite: https://vitejs.dev/
- Express.js: https://expressjs.com/
- Original NSGA2 Model: See `model.py` in backend
