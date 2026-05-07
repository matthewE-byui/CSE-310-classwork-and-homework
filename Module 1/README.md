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

---

## Full Source Code

### Vec2D.hpp
```cpp
#pragma once

#include <cmath>
#include <stdexcept>

struct Vec2D {
    double x;
    double y;

    Vec2D(double xVal = 0.0, double yVal = 0.0) : x(xVal), y(yVal) {}

    Vec2D operator+(const Vec2D& other) const { return Vec2D(x + other.x, y + other.y); }
    Vec2D operator-(const Vec2D& other) const { return Vec2D(x - other.x, y - other.y); }
    Vec2D operator*(double scalar) const { return Vec2D(x * scalar, y * scalar); }
    Vec2D operator/(double scalar) const { return Vec2D(x / scalar, y / scalar); }
    Vec2D operator-() const { return Vec2D(-x, -y); }

    Vec2D& operator+=(const Vec2D& other) {
        x += other.x;
        y += other.y;
        return *this;
    }

    double dot(const Vec2D& other) const { return x * other.x + y * other.y; }
    double magnitude() const { return std::sqrt(x * x + y * y); }
    double magnitudeSq() const { return x * x + y * y; }

    Vec2D normalize() const {
        const double mag = magnitude();
        if (mag == 0.0) {
            throw std::runtime_error("Cannot normalize zero-length vector");
        }
        return *this / mag;
    }

    double distanceTo(const Vec2D& other) const { return (*this - other).magnitude(); }
    double distanceSqTo(const Vec2D& other) const { return (*this - other).magnitudeSq(); }
};

inline Vec2D operator*(double scalar, const Vec2D& vec) {
    return vec * scalar;
}
```

---

### Body.hpp
```cpp
#pragma once

#include <stdexcept>
#include <string>

#include "Vec2D.hpp"

struct Body {
    std::string name;
    double mass;
    Vec2D position;
    Vec2D velocity;
    Vec2D acceleration;
    double radius;

    Body(
        const std::string& nameVal,
        double massVal,
        const Vec2D& positionVal,
        const Vec2D& velocityVal,
        double radiusVal = 1.0)
        : name(nameVal),
          mass(massVal),
          position(positionVal),
          velocity(velocityVal),
          acceleration(0.0, 0.0),
          radius(radiusVal) {
        if (mass <= 0.0) {
            throw std::runtime_error("Body mass must be positive");
        }
    }

    void resetAcceleration() {
        acceleration = Vec2D(0.0, 0.0);
    }

    void applyForce(const Vec2D& force) {
        acceleration += force / mass;
    }

    double kineticEnergy() const {
        return 0.5 * mass * velocity.magnitudeSq();
    }
};
```

---

### Simulation.hpp
```cpp
#pragma once

#include <string>
#include <vector>

#include "Body.hpp"

class Simulation {
public:
    static constexpr double G = 6.674e-11;

    explicit Simulation(double dtVal = 3600.0, double softeningVal = 1e8);

    void addBody(const Body& body);
    void step();
    void run(int steps);

    double totalKineticEnergy() const;
    double totalPotentialEnergy() const;
    double totalEnergy() const;

    void computeAccelerations();

    const std::vector<Body>& getBodies() const;
    std::vector<Body>& getBodiesMutable();
    double getDt() const;
    void setDt(double dtVal);
    double getTimeElapsed() const;
    const std::vector<std::string>& getCollisionLog() const;

private:
    std::vector<Body> bodies;
    double dt;
    double softening;
    double timeElapsed;
    std::vector<std::string> collisionLog;

    void resolveCollisions();
    void mergeBodies(std::size_t i, std::size_t j);
};
```

---

### Simulation.cpp
```cpp
#include "Simulation.hpp"

#include <cmath>
#include <sstream>

Simulation::Simulation(double dtVal, double softeningVal)
    : dt(dtVal), softening(softeningVal), timeElapsed(0.0) {}

void Simulation::addBody(const Body& body) {
    bodies.push_back(body);
}

void Simulation::computeAccelerations() {
    for (auto& body : bodies) {
        body.resetAcceleration();
    }

    const std::size_t n = bodies.size();
    for (std::size_t i = 0; i < n; ++i) {
        for (std::size_t j = i + 1; j < n; ++j) {
            Body& bi = bodies[i];
            Body& bj = bodies[j];

            const Vec2D diff = bj.position - bi.position;
            const double distSq = diff.magnitudeSq() + softening * softening;
            const double dist = std::sqrt(distSq);

            const double forceMag = G * bi.mass * bj.mass / distSq;
            const Vec2D forceVec = diff * (forceMag / dist);

            bi.applyForce(forceVec);
            bj.applyForce(-forceVec);
        }
    }
}

void Simulation::step() {
    const std::size_t n = bodies.size();
    std::vector<Vec2D> oldAcc;
    oldAcc.reserve(n);

    for (const auto& body : bodies) {
        oldAcc.push_back(body.acceleration);
    }

    const double dtSq = dt * dt;
    for (std::size_t i = 0; i < n; ++i) {
        Body& body = bodies[i];
        body.position = body.position + body.velocity * dt + oldAcc[i] * (0.5 * dtSq);
    }

    computeAccelerations();

    for (std::size_t i = 0; i < n; ++i) {
        Body& body = bodies[i];
        body.velocity = body.velocity + (oldAcc[i] + body.acceleration) * (0.5 * dt);
    }

    timeElapsed += dt;
    resolveCollisions();
}

void Simulation::run(int steps) {
    computeAccelerations();
    for (int i = 0; i < steps; ++i) {
        step();
    }
}

double Simulation::totalKineticEnergy() const {
    double total = 0.0;
    for (const auto& body : bodies) {
        total += body.kineticEnergy();
    }
    return total;
}

double Simulation::totalPotentialEnergy() const {
    double pe = 0.0;
    const std::size_t n = bodies.size();
    for (std::size_t i = 0; i < n; ++i) {
        for (std::size_t j = i + 1; j < n; ++j) {
            const double r = bodies[i].position.distanceTo(bodies[j].position);
            if (r > 0.0) {
                pe -= G * bodies[i].mass * bodies[j].mass / r;
            }
        }
    }
    return pe;
}

double Simulation::totalEnergy() const {
    return totalKineticEnergy() + totalPotentialEnergy();
}

const std::vector<Body>& Simulation::getBodies() const { return bodies; }
std::vector<Body>& Simulation::getBodiesMutable() { return bodies; }
double Simulation::getDt() const { return dt; }
void Simulation::setDt(double dtVal) { dt = dtVal; }
double Simulation::getTimeElapsed() const { return timeElapsed; }
const std::vector<std::string>& Simulation::getCollisionLog() const { return collisionLog; }

void Simulation::resolveCollisions() {
    bool merged = true;
    while (merged) {
        merged = false;
        const std::size_t n = bodies.size();
        for (std::size_t i = 0; i < n; ++i) {
            for (std::size_t j = i + 1; j < n; ++j) {
                const double dist = bodies[i].position.distanceTo(bodies[j].position);
                if (dist < (bodies[i].radius + bodies[j].radius)) {
                    mergeBodies(i, j);
                    merged = true;
                    break;
                }
            }
            if (merged) break;
        }
    }
}

void Simulation::mergeBodies(std::size_t i, std::size_t j) {
    Body& bi = bodies[i];
    Body& bj = bodies[j];

    const double totalMass = bi.mass + bj.mass;
    const Vec2D newVelocity = (bi.velocity * bi.mass + bj.velocity * bj.mass) / totalMass;
    const Vec2D newPosition = (bi.position * bi.mass + bj.position * bj.mass) / totalMass;
    const double newRadius = std::cbrt(bi.radius * bi.radius * bi.radius + bj.radius * bj.radius * bj.radius);

    std::ostringstream oss;
    oss.setf(std::ios::scientific);
    oss.precision(3);
    oss << "t=" << timeElapsed << "s MERGE: '" << bi.name << "' + '" << bj.name
        << "' -> mass=" << totalMass << " kg";
    collisionLog.push_back(oss.str());

    bi.mass = totalMass;
    bi.position = newPosition;
    bi.velocity = newVelocity;
    bi.radius = newRadius;

    bodies.erase(bodies.begin() + static_cast<std::ptrdiff_t>(j));
}
```

---

### Renderer.hpp
```cpp
#pragma once

#include <vector>

#include "Body.hpp"

class Renderer {
public:
    Renderer(int widthVal = 78, int heightVal = 36);

    void render(
        const std::vector<Body>& bodies,
        double timeElapsed,
        double energy,
        const std::vector<std::string>& collisionLog) const;

private:
    int width;
    int height;

    static char glyphFor(double mass, double minLogMass, double maxLogMass);
};
```

---

### Renderer.cpp
```cpp
#include "Renderer.hpp"

#include <algorithm>
#include <cmath>
#include <iostream>
#include <string>
#include <vector>

#ifdef _WIN32
#include <cstdlib>
#endif

Renderer::Renderer(int widthVal, int heightVal) : width(widthVal), height(heightVal) {}

char Renderer::glyphFor(double mass, double minLogMass, double maxLogMass) {
    static const std::string glyphs = ".+*O@";
    if (mass <= 0.0 || std::abs(maxLogMass - minLogMass) < 1e-12) return '*';

    const double ratio = (std::log10(mass) - minLogMass) / (maxLogMass - minLogMass);
    int idx = static_cast<int>(ratio * (glyphs.size() - 1) + 0.5);
    idx = std::clamp(idx, 0, static_cast<int>(glyphs.size() - 1));
    return glyphs[static_cast<std::size_t>(idx)];
}

void Renderer::render(
    const std::vector<Body>& bodies,
    double timeElapsed,
    double energy,
    const std::vector<std::string>& collisionLog) const {
#ifdef _WIN32
    std::system("cls");
#else
    std::cout << "\x1B[2J\x1B[H";
#endif

    if (bodies.empty()) { std::cout << "(no bodies to render)\n"; return; }

    double minX = bodies[0].position.x, maxX = bodies[0].position.x;
    double minY = bodies[0].position.y, maxY = bodies[0].position.y;
    std::vector<double> logMasses;

    for (const auto& body : bodies) {
        minX = std::min(minX, body.position.x); maxX = std::max(maxX, body.position.x);
        minY = std::min(minY, body.position.y); maxY = std::max(maxY, body.position.y);
        if (body.mass > 0.0) logMasses.push_back(std::log10(body.mass));
    }

    double spanX = std::max(maxX - minX, 1.0);
    double spanY = std::max(maxY - minY, 1.0);
    minX -= spanX * 0.12; maxX += spanX * 0.12;
    minY -= spanY * 0.12; maxY += spanY * 0.12;
    spanX = maxX - minX; spanY = maxY - minY;

    const double ratio = (static_cast<double>(width) / height) * 0.5;
    if ((spanX / spanY) < ratio) {
        const double cx = (minX + maxX) * 0.5;
        spanX = spanY * ratio; minX = cx - spanX * 0.5; maxX = cx + spanX * 0.5;
    } else {
        const double cy = (minY + maxY) * 0.5;
        spanY = spanX / ratio; minY = cy - spanY * 0.5; maxY = cy + spanY * 0.5;
    }

    const double minLM = *std::min_element(logMasses.begin(), logMasses.end());
    const double maxLM = *std::max_element(logMasses.begin(), logMasses.end());

    std::vector<std::string> grid(height, std::string(width, ' '));
    for (const auto& body : bodies) {
        int col = static_cast<int>(((body.position.x - minX) / (maxX - minX)) * (width - 1));
        int row = static_cast<int>((1.0 - (body.position.y - minY) / (maxY - minY)) * (height - 1));
        col = std::clamp(col, 0, width - 1);
        row = std::clamp(row, 0, height - 1);
        grid[row][col] = glyphFor(body.mass, minLM, maxLM);
    }

    std::cout << '+' << std::string(width, '-') << "+\n";
    for (const auto& row : grid) std::cout << '|' << row << "|\n";
    std::cout << '+' << std::string(width, '-') << "+\n";

    const double days = timeElapsed / 86400.0, years = days / 365.25;
    if (years >= 1.0)      std::cout << " Time: " << years << " yr";
    else if (days >= 1.0)  std::cout << " Time: " << days  << " d";
    else                   std::cout << " Time: " << timeElapsed << " s";

    std::cout.setf(std::ios::scientific); std::cout.precision(4);
    std::cout << "  |  Bodies: " << bodies.size() << "  |  Total E: " << energy << " J\n";
    if (!collisionLog.empty()) std::cout << " Last event: " << collisionLog.back() << "\n";
    std::cout << " Legend: '.' small '+' medium '*' large 'O' giant '@' massive\n";
}
```

---

### Scenarios.hpp
```cpp
#pragma once

#include <functional>
#include <string>
#include <unordered_map>

#include "Simulation.hpp"

namespace Scenarios {

constexpr double AU = 1.496e11;

Simulation solarSystem(double dt = 3600.0);
Simulation binaryStars(double dt = 3600.0);
Simulation figureEight(double dt = 10.0);
Simulation randomCloud(int n = 10, unsigned int seed = 42, double dt = 3600.0);

double circularSpeed(double centralMass, double radius);

using ScenarioFactory = std::function<Simulation(double)>;

const std::unordered_map<std::string, std::pair<std::string, ScenarioFactory>>& registry();

}  // namespace Scenarios
```

---

### Scenarios.cpp
```cpp
#include "Scenarios.hpp"

#include <cmath>
#include <random>

namespace Scenarios {

double circularSpeed(double centralMass, double radius) {
    return std::sqrt(Simulation::G * centralMass / radius);
}

Simulation solarSystem(double dt) {
    Simulation sim(dt, 1e9);
    const double sunMass = 1.989e30;

    struct PlanetDef { const char* name; double mass, semiMajorAu, radius; };
    const PlanetDef defs[] = {
        {"Sun",     1.989e30, 0.0,    696000e3},
        {"Mercury", 3.285e23, 0.387,    2439e3},
        {"Venus",   4.867e24, 0.723,    6052e3},
        {"Earth",   5.972e24, 1.0,      6371e3},
        {"Mars",    6.390e23, 1.524,    3390e3},
        {"Jupiter", 1.898e27, 5.203,   69911e3},
        {"Saturn",  5.683e26, 9.537,   58232e3},
        {"Uranus",  8.681e25, 19.191,  25362e3},
        {"Neptune", 1.024e26, 30.069,  24622e3},
    };

    for (const auto& d : defs) {
        const double r = d.semiMajorAu * AU;
        Vec2D pos(0, 0), vel(0, 0);
        if (r > 0.0) { vel = Vec2D(0, circularSpeed(sunMass, r)); pos = Vec2D(r, 0); }
        sim.addBody(Body(d.name, d.mass, pos, vel, d.radius));
    }
    return sim;
}

Simulation binaryStars(double dt) {
    Simulation sim(dt, 1e9);
    const double starMass = 1.989e30, r = AU * 0.5;
    const double v = circularSpeed(starMass, AU) / std::sqrt(2.0);
    sim.addBody(Body("Star-A", starMass, Vec2D(-r, 0), Vec2D(0, -v), 200000e3));
    sim.addBody(Body("Star-B", starMass, Vec2D( r, 0), Vec2D(0,  v), 200000e3));
    return sim;
}

Simulation figureEight(double dt) {
    Simulation sim(dt, 0.0);
    const double p[3][2] = {{0.97000436,-0.24308753},{-0.97000436,0.24308753},{0,0}};
    const double v3x = 0.93240737/2, v3y = 0.86473146/2;
    const double v[3][2] = {{-v3x,-v3y},{-v3x,-v3y},{v3x,v3y}};
    const double L = 1e11, M = 1e30, T = std::sqrt(L*L*L / (Simulation::G * M));
    for (int i = 0; i < 3; ++i)
        sim.addBody(Body("Body-" + std::to_string(i+1), M,
            Vec2D(p[i][0]*L, p[i][1]*L), Vec2D(v[i][0]*L/T, v[i][1]*L/T), 3e9));
    return sim;
}

Simulation randomCloud(int n, unsigned int seed, double dt) {
    Simulation sim(dt, 1e10);
    std::mt19937 rng(seed);
    std::uniform_real_distribution<double> mass(1e24,1e29), pos(-5*AU,5*AU), vel(-5000,5000);
    for (int i = 0; i < n; ++i) {
        const double m = mass(rng);
        sim.addBody(Body("Body-"+std::to_string(i+1), m,
            Vec2D(pos(rng),pos(rng)), Vec2D(vel(rng),vel(rng)),
            std::cbrt(m/1e21)*1e6));
    }
    return sim;
}

const std::unordered_map<std::string, std::pair<std::string, ScenarioFactory>>& registry() {
    static const std::unordered_map<std::string, std::pair<std::string, ScenarioFactory>> map = {
        {"solar_system", {"Solar System (Sun + 8 planets)",    [](double dt){ return solarSystem(dt); }}},
        {"binary_stars", {"Binary Stars (2 equal-mass suns)",  [](double dt){ return binaryStars(dt); }}},
        {"figure_eight", {"Figure-8 Choreography (3 bodies)",  [](double dt){ return figureEight(dt); }}},
        {"random_cloud", {"Random Cloud (10 bodies, chaotic)", [](double dt){ return randomCloud(10,42,dt); }}},
    };
    return map;
}

}  // namespace Scenarios
```

---

### ConfigLoader.hpp
```cpp
#pragma once

#include <string>

#include "Simulation.hpp"

namespace ConfigLoader {

Simulation loadScenario(const std::string& path);

}  // namespace ConfigLoader
```

---

### ConfigLoader.cpp
```cpp
#include "ConfigLoader.hpp"

#include <fstream>
#include <regex>
#include <sstream>
#include <stdexcept>

namespace {

std::string readAll(const std::string& path) {
    std::ifstream in(path);
    if (!in) throw std::runtime_error("Scenario file not found: " + path);
    std::ostringstream ss; ss << in.rdbuf(); return ss.str();
}

std::string extractBodiesArray(const std::string& text) {
    const std::size_t bodiesPos = text.find("\"bodies\"");
    if (bodiesPos == std::string::npos) throw std::runtime_error("Config missing 'bodies' field");
    const std::size_t arrStart = text.find('[', bodiesPos);
    if (arrStart == std::string::npos) throw std::runtime_error("Config 'bodies' must be an array");
    int depth = 0;
    for (std::size_t i = arrStart; i < text.size(); ++i) {
        if (text[i] == '[') ++depth;
        else if (text[i] == ']') { --depth; if (depth == 0) return text.substr(arrStart+1, i-arrStart-1); }
    }
    throw std::runtime_error("Unbalanced brackets in 'bodies' array");
}

std::vector<std::string> splitObjects(const std::string& arr) {
    std::vector<std::string> out; int depth = 0; std::size_t start = std::string::npos;
    for (std::size_t i = 0; i < arr.size(); ++i) {
        if (arr[i] == '{') { if (!depth) start = i; ++depth; }
        else if (arr[i] == '}') { --depth; if (!depth && start != std::string::npos) { out.push_back(arr.substr(start, i-start+1)); start = std::string::npos; } }
    }
    return out;
}

double extractNumber(const std::string& obj, const std::string& key, double def, bool req = false) {
    const std::regex re("\\\""+key+"\\\"\\s*:\\s*(\\\"[^\\\"]+\\\"|[-+]?\\d*\\.?\\d+(?:[eE][-+]?\\d+)?)");
    std::smatch m;
    if (!std::regex_search(obj, m, re)) { if (req) throw std::runtime_error("Missing field: "+key); return def; }
    std::string t = m[1].str();
    if (!t.empty() && t.front()=='"') t = t.substr(1, t.size()-2);
    return std::stod(t);
}

std::string extractString(const std::string& obj, const std::string& key, bool req = false) {
    const std::regex re("\\\""+key+"\\\"\\s*:\\s*\\\"([^\\\"]*)\\\"");
    std::smatch m;
    if (!std::regex_search(obj, m, re)) { if (req) throw std::runtime_error("Missing field: "+key); return ""; }
    return m[1].str();
}

}  // namespace

namespace ConfigLoader {

Simulation loadScenario(const std::string& path) {
    const std::string text = readAll(path);
    Simulation sim(extractNumber(text,"dt",3600), extractNumber(text,"softening",1e8));
    const auto objects = splitObjects(extractBodiesArray(text));
    if (objects.empty()) throw std::runtime_error("Config must contain at least one body");
    for (const auto& obj : objects) {
        sim.addBody(Body(
            extractString(obj,"name",true),
            extractNumber(obj,"mass",0,true),
            Vec2D(extractNumber(obj,"x",0), extractNumber(obj,"y",0)),
            Vec2D(extractNumber(obj,"vx",0), extractNumber(obj,"vy",0)),
            extractNumber(obj,"radius",1e6)));
    }
    return sim;
}

}  // namespace ConfigLoader
```

---

### main.cpp
```cpp
#include <chrono>
#include <csignal>
#include <exception>
#include <iomanip>
#include <iostream>
#include <optional>
#include <string>
#include <thread>
#include <vector>

#include "ConfigLoader.hpp"
#include "Renderer.hpp"
#include "Scenarios.hpp"
#include "Simulation.hpp"

struct CliOptions {
    std::optional<std::string> scenario;
    std::optional<std::string> file;
    int steps = 2000;
    std::optional<double> dt;
    int frameEvery = 10;
    double delay = 0.05;
    bool noRender = false;
};

bool g_interrupted = false;
void handleSigInt(int) { g_interrupted = true; }

CliOptions parseArgs(int argc, char** argv) {
    CliOptions opts;
    for (int i = 1; i < argc; ++i) {
        const std::string arg = argv[i];
        auto val = [&]() -> std::string {
            if (i+1 >= argc) throw std::runtime_error("Missing value for " + arg);
            return std::string(argv[++i]);
        };
        if      (arg=="--scenario"||arg=="-s")  opts.scenario   = val();
        else if (arg=="--file"||arg=="-f")       opts.file       = val();
        else if (arg=="--steps"||arg=="-n")      opts.steps      = std::stoi(val());
        else if (arg=="--dt")                    opts.dt         = std::stod(val());
        else if (arg=="--frame-every")           opts.frameEvery = std::stoi(val());
        else if (arg=="--delay")                 opts.delay      = std::stod(val());
        else if (arg=="--no-render")             opts.noRender   = true;
        else if (arg=="--help") {
            std::cout << "Usage: nbody [--scenario NAME] [--file PATH] [--steps N]\n"
                      << "             [--dt SECS] [--frame-every N] [--delay SECS] [--no-render]\n";
            std::exit(0);
        } else throw std::runtime_error("Unknown argument: " + arg);
    }
    return opts;
}

void printEnergyReport(const Simulation& sim, double initialEnergy) {
    const double ke = sim.totalKineticEnergy(), pe = sim.totalPotentialEnergy(), total = ke + pe;
    const double drift = initialEnergy != 0.0 ? std::abs((total-initialEnergy)/initialEnergy)*100.0 : 0.0;
    std::cout << "\n--------------------------------------------------\n"
              << std::scientific << std::setprecision(6)
              << "  Kinetic Energy   : " << ke    << " J\n"
              << "  Potential Energy : " << pe    << " J\n"
              << "  Total Energy     : " << total << " J\n"
              << "  Initial Energy   : " << initialEnergy << " J\n"
              << std::fixed << std::setprecision(4)
              << "  Energy drift     : " << drift << " %\n";
    for (const auto& e : sim.getCollisionLog()) std::cout << "    " << e << "\n";
    std::cout << "--------------------------------------------------\n";
}

void runSimulation(Simulation& sim, int steps, bool render, int frameEvery, double delaySecs) {
    Renderer renderer;
    sim.computeAccelerations();
    const double initialEnergy = sim.totalEnergy();
    std::cout << "\nStarting simulation: " << sim.getBodies().size()
              << " bodies, dt=" << sim.getDt() << "s, steps=" << steps << "\n";
    if (!render) std::cout << "(headless mode)\n";

    for (int step = 0; step < steps && !g_interrupted; ++step) {
        sim.step();
        if (render && step % frameEvery == 0) {
            renderer.render(sim.getBodies(), sim.getTimeElapsed(), sim.totalEnergy(), sim.getCollisionLog());
            std::this_thread::sleep_for(std::chrono::duration<double>(delaySecs));
        }
        if (sim.getBodies().empty()) { std::cout << "All bodies merged.\n"; break; }
    }
    if (g_interrupted) std::cout << "\nInterrupted.\n";
    printEnergyReport(sim, initialEnergy);
}

int main(int argc, char** argv) {
    std::signal(SIGINT, handleSigInt);
    try {
        const CliOptions opts = parseArgs(argc, argv);
        Simulation sim;

        if (opts.file.has_value()) {
            sim = ConfigLoader::loadScenario(*opts.file);
        } else {
            std::string name;
            if (opts.scenario.has_value()) {
                name = *opts.scenario;
            } else {
                const auto& reg = Scenarios::registry();
                std::vector<std::string> keys;
                std::cout << "\nN-Body Gravity Simulator\n\nChoose a scenario:\n";
                int idx = 1;
                for (const auto& e : reg) { keys.push_back(e.first); std::cout << "  " << idx++ << ". " << e.second.first << "\n"; }
                std::cout << "  " << idx << ". Load from JSON file\n\nEnter choice: ";
                int choice = 0; std::cin >> choice;
                if (choice == idx) {
                    std::cout << "Path to JSON file: "; std::string path; std::cin >> path;
                    sim = ConfigLoader::loadScenario(path);
                } else if (choice >= 1 && choice <= (int)keys.size()) {
                    name = keys[choice - 1];
                }
            }
            if (!name.empty()) {
                const auto& reg = Scenarios::registry();
                const auto it = reg.find(name);
                if (it == reg.end()) throw std::runtime_error("Unknown scenario: " + name);
                double dt = opts.dt.value_or(name == "figure_eight" ? 10.0 : 3600.0);
                sim = it->second.second(dt);
            }
        }

        if (opts.dt.has_value()) sim.setDt(*opts.dt);
        runSimulation(sim, opts.steps, !opts.noRender, opts.frameEvery, opts.delay);
        return 0;
    } catch (const std::exception& ex) {
        std::cerr << "Error: " << ex.what() << "\n"; return 1;
    }
}
```
