# RotorBench

**MultiRotor WorkBench - A drone build configurator and analysis tool**

RotorBench helps FPV drone enthusiasts design, analyze, and optimize their drone builds with real-time performance calculations, component compatibility checking, and detailed flight time simulations.

## Prerequisites

- **Python 3.8+** (for backend)
- **Node.js 22.13+** (for frontend; Node 22 LTS recommended)
- **npm 10+**

## Installation

### 1. Clone the Repository

```bash
git clone https://github.com/c-y-i/RotorBench.git
cd RotorBench
```

### 2. Backend Setup

```bash
cd backend

# Create a virtual environment (recommended)
python -m venv venv

# Activate virtual environment
# On Windows:
venv\Scripts\activate
# On macOS/Linux:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt
```

### 3. Frontend Setup

```bash
cd ../rotorbench

# Install dependencies
npm ci
```

## Running the Application

### Start the Backend Server

```bash
cd backend

# Make sure virtual environment is activated
# Then start the server:
python -m uvicorn main:app --reload --port 8000
```

The backend will start at: **http://localhost:8000**
- API Docs: **http://localhost:8000/docs**

### Start the Frontend

In a **separate terminal**:

```bash
cd rotorbench

# Start the development server
npm start
```

The frontend will start at: **http://localhost:3000**

## Features

- **Component Selection** - Browse and select from motors, propellers, batteries, ESCs, flight controllers, frames, and receivers
- **Performance Analysis** - Calculate thrust-to-weight ratio, flight time, hover time, and power consumption
- **Battery Simulation** - Detailed discharge curves showing voltage and capacity over time
- **Compatibility Validation** - Voltage, current, size, stack-pattern, motor-mount, propeller-shaft, and power-connector checks
- **Cost Tracking** - Real-time build cost calculation
- **User Profiles** - Save and manage multiple drone configurations
- **Hardware Setup Planner** - Stage flight-controller firmware, UART, channel, safety, and ExpressLRS radio-link settings without claiming a hardware connection
- **Build Comparison** - Compare selected parts, catalog totals, physical fit, source coverage, and hardware-plan state
- **Interactive Charts** - Responsive visualizations for battery discharge and performance metrics
- **Mobile-Friendly** - Works seamlessly on desktop, tablet, and mobile devices

## Tech Stack

**Backend:** FastAPI, Pydantic, Uvicorn

**Frontend:** React, React Router, Vite, Recharts, Babylon.js, CSS3

**Frontend tooling:** Vitest, Testing Library, ESLint

## Testing

Run the frontend checks:

```bash
cd rotorbench
npm run lint
npm test
npm run build
npm audit
```

Run the backend contract suite:

```bash
cd backend
.venv/bin/python -m unittest discover -s tests -v
```


## Legal Note

Many 3D models used by RotorBench are sourced from third-party creators. RotorBench maintainers do not claim ownership of those third-party models.  
See the in-app **Legal & Disclaimer** page (`/legal`) for ownership, warranty, and liability terms.
