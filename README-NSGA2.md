# ExamSolver - NSGA2 Edition

Multi-objective exam invigilator scheduling using **NSGA-II (Non-dominated Sorting Genetic Algorithm II)** algorithm.

## Overview

This is a TypeScript + React frontend wrapper around a Python NSGA2-based optimization engine for exam scheduling. It provides a web interface to:

1. **Run the NSGA2 Solver** - Generate optimal invigilator assignments
2. **Analyze Results** - View workload distribution and metrics
3. **Export Schedules** - Download optimized schedule in Excel format

## Architecture

```
exam-scheduling-solver-NSGA2/
├── server.ts                      # Express.js API server
├── src/                           # React frontend (Vite)
│   ├── App.tsx                    # Main UI component
│   ├── components/                # Reusable components
│   └── ...
└── package.json                   # Node.js dependencies

Backend (separate):
../exam-scheduling-engine-main-NSGA2/exam-scheduling-engine-main/
├── main.py                        # Entry point
├── src/
│   ├── model.py                   # NSGA2 optimization problem definition
│   ├── loader.py                  # Data loading
│   ├── exporter.py                # Excel output
│   └── ...
└── config.py                      # Solver parameters
```

## Setup

### Prerequisites
- Node.js 16+
- Python 3.9+
- `pymoo` library (for NSGA2)

### Installation

1. **Install Node dependencies:**
   ```bash
   cd exam-scheduling-solver-NSGA2
   npm install
   ```

2. **Ensure Python backend is configured:**
   The server uses the NSGA2 backend from:
   ```
   ../exam-scheduling-engine-main-NSGA2/exam-scheduling-engine-main/
   ```

### Configuration

Edit `../exam-scheduling-engine-main-NSGA2/exam-scheduling-engine-main/config.py` to adjust:

- `POPULATION_SIZE` - Population size for genetic algorithm
- `NUM_GENERATIONS` - Number of generations to evolve
- `RANDOM_SEED` - Reproducibility seed
- Weight parameters (`WEIGHT_FAIRNESS_F1`, `WEIGHT_QUALITY_F2`, `WEIGHT_WEEKEND_F3`)
- Penalty coefficients for constraint violations

## Running

### Development

```bash
npm run dev
```

Starts the Vite dev server + Express API on `http://localhost:3000`

### Production

```bash
npm run build
npm run start
```

## API Endpoints

### POST /api/solve
Runs the NSGA2 solver with exam/staff data from the backend data folder.

**Response:**
```json
{
  "success": true,
  "schedule": [...],
  "metrics": {...}
}
```

### POST /api/export
Generates and downloads the optimized schedule as an Excel file.

**Returns:** Excel file (`Ket_Qua_Xep_Lich.xlsx`)

### POST /api/solve/stop
Terminates a running solver process.

## Key Features (NSGA2)

✅ **Multi-Objective Optimization**
- Fairness (shift distribution, equity)
- Quality (travel distance, elderly protection)
- Weekend balance

✅ **Constraint Handling**
- Hard constraints (no time conflicts)
- Soft constraints (preferences, load balancing)
- Elderly staff protection (RC6)

✅ **Robin Hood Post-Processing**
- Refines final schedule to balance shift gaps
- Respects hard constraints during optimization

## Optimization Objectives (3D Pareto Front)

1. **F1: Fairness Score**
   - Balanced shift distribution
   - Fair commute distance allocation
   - Intergenerational equity

2. **F2: Quality Score**
   - Minimized total travel distance
   - Elderly staff protection (no late shifts)
   - Consecutive shift penalties

3. **F3: Weekend Score**
   - Reduced weekend assignments for heavily-loaded staff

## Data Files

Place exam and staff data in:
```
../exam-scheduling-engine-main-NSGA2/exam-scheduling-engine-main/data/
```

Expected Excel format with columns:
- **Shifts:** Ngày, Ca thi, Cơ sở, Số lượng cán bộ cần thiết
- **Staff:** Tên, Tuổi, Cơ sở, KC CS1 (km), KC CS2 (km)

## Output Files

After solving, results are saved to:
```
../exam-scheduling-engine-main-NSGA2/exam-scheduling-engine-main/outputs/
├── Ket_Qua_Xep_Lich.xlsx    # Main schedule output
└── lich_truc_final.xlsx      # Alternative format
```

## Customization

### Adjusting Algorithm Parameters

Edit `config.py` in the backend:

```python
POPULATION_SIZE = 300           # Default: 300
NUM_GENERATIONS = 1000          # Default: 1000
MUTATION_RATE = 0.1             # Default: 0.1
ALLOWED_SHIFT_DEVIATION = 2     # Default: 2 (±2 from average)
RANDOM_SEED = 42                # Default: 42 (0 = random)
```

### Changing Solver Weights

```python
WEIGHT_FAIRNESS_F1 = 1.0        # Fairness importance
WEIGHT_QUALITY_F2 = 1.0         # Quality importance
WEIGHT_WEEKEND_F3 = 0.5         # Weekend importance
```

## Troubleshooting

### Solver crashes
- Check Python backend logs in console
- Verify data files are in `data/` folder
- Ensure `pymoo` is installed: `pip install pymoo`

### No solver output
- Check if Python process started successfully
- Verify path to `main.py` is correct
- Review console errors in browser

### Poor solution quality
- Increase `NUM_GENERATIONS` for longer evolution
- Increase `POPULATION_SIZE` for more diverse solutions
- Adjust weight parameters in `config.py`

## License

Project for exam scheduling optimization.
