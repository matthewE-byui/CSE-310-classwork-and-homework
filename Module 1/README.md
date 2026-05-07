# N-Body Gravity Simulator

Simulates planets and stars attracting each other using real gravitational physics. Watch orbits form, evolve, and bodies collide and merge in real time inside your terminal.

---

## Requirements

- Windows 10/11
- [LLVM/clang++](https://github.com/llvm/llvm-project/releases) installed at `C:\Program Files\LLVM\`
- [CMake](https://cmake.org/download/) (optional — only needed if using CMake build)

---

## Build

Open a PowerShell terminal in this folder (`Module 1`) and run:

```powershell
& "C:\Program Files\LLVM\bin\clang++.exe" -std=c++17 -O2 main.cpp Simulation.cpp Renderer.cpp Scenarios.cpp ConfigLoader.cpp -o nbody.exe
```

This produces `nbody.exe` in the same folder.

---

## Run

### Interactive menu (choose scenario yourself)
```powershell
.\nbody.exe
```

### Preset scenarios
```powershell
.\nbody.exe --scenario solar_system
.\nbody.exe --scenario binary_stars
.\nbody.exe --scenario figure_eight
.\nbody.exe --scenario random_cloud
```

### Load a custom JSON scenario
```powershell
.\nbody.exe --file example_scenario.json
```

### Headless mode (numbers only, no animation)
```powershell
.\nbody.exe --scenario solar_system --no-render
```

---

## Options

| Flag | Default | Description |
|---|---|---|
| `--scenario <name>` | — | Preset to run: `solar_system`, `binary_stars`, `figure_eight`, `random_cloud` |
| `--file <path>` | — | Path to a JSON config file |
| `--steps <n>` | `2000` | How many simulation steps to run (more = longer experiment) |
| `--dt <seconds>` | `3600` | Time-step size in seconds (`10` recommended for figure_eight) |
| `--delay <seconds>` | `0.05` | Pause between frames — lower = faster animation |
| `--frame-every <n>` | `10` | Render every N steps — lower = smoother animation |
| `--no-render` | off | Disable animation, print energy report only |

### Recommended settings

| Goal | Command |
|---|---|
| Smooth fast animation | `--steps 10000 --delay 0.01 --frame-every 5` |
| Max speed | `--steps 10000 --delay 0.0 --frame-every 1` |
| Long experiment | `--steps 50000 --delay 0.01 --frame-every 5` |
| Figure-8 orbit | `--scenario figure_eight --steps 50000 --dt 10 --delay 0.01` |
| Energy check only | `--steps 500 --no-render` |

---

## Display legend

```
'.'  small mass
'+'  medium mass
'*'  large mass
'O'  giant mass
'@'  massive (star-scale)
```

The status bar shows elapsed simulation time, number of bodies, and total mechanical energy. Energy drift near `0.0000 %` means the physics is running accurately.

---

## Custom JSON scenario

Create a `.json` file with this structure:

```json
{
    "dt": 3600.0,
    "softening": 1e8,
    "bodies": [
        {
            "name": "Star",
            "mass": 1.989e30,
            "x": 0.0,
            "y": 0.0,
            "vx": 0.0,
            "vy": 0.0,
            "radius": 696000000.0
        },
        {
            "name": "Planet",
            "mass": 5.972e24,
            "x": 1.496e11,
            "y": 0.0,
            "vx": 0.0,
            "vy": 29783.0,
            "radius": 6371000.0
        }
    ]
}
```

Then run:
```powershell
.\nbody.exe --file my_scenario.json --steps 5000
```

---

## File overview

| File | Purpose |
|---|---|
| `main.cpp` | CLI entry point, interactive menu, run loop |
| `Simulation.cpp/hpp` | Physics engine: gravity, Verlet integration, collisions |
| `Renderer.cpp/hpp` | ASCII terminal renderer |
| `Scenarios.cpp/hpp` | Preset scenarios (solar system, binary stars, figure-8, random cloud) |
| `ConfigLoader.cpp/hpp` | JSON file loader |
| `Vec2D.hpp` | 2D vector math |
| `Body.hpp` | Body struct (mass, position, velocity, radius) |
| `CMakeLists.txt` | CMake build config (alternative to manual clang++ command) |
| `example_scenario.json` | Example custom scenario file |
