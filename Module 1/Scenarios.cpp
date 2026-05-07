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

    struct PlanetDef {
        const char* name;
        double mass;
        double semiMajorAu;
        double radius;
    };

    const PlanetDef defs[] = {
        {"Sun", 1.989e30, 0.0, 696000e3},
        {"Mercury", 3.285e23, 0.387, 2439e3},
        {"Venus", 4.867e24, 0.723, 6052e3},
        {"Earth", 5.972e24, 1.0, 6371e3},
        {"Mars", 6.390e23, 1.524, 3390e3},
        {"Jupiter", 1.898e27, 5.203, 69911e3},
        {"Saturn", 5.683e26, 9.537, 58232e3},
        {"Uranus", 8.681e25, 19.191, 25362e3},
        {"Neptune", 1.024e26, 30.069, 24622e3},
    };

    for (const auto& d : defs) {
        const double r = d.semiMajorAu * AU;
        Vec2D pos(0.0, 0.0);
        Vec2D vel(0.0, 0.0);

        if (r > 0.0) {
            const double v = circularSpeed(sunMass, r);
            pos = Vec2D(r, 0.0);
            vel = Vec2D(0.0, v);
        }

        sim.addBody(Body(d.name, d.mass, pos, vel, d.radius));
    }

    return sim;
}

Simulation binaryStars(double dt) {
    Simulation sim(dt, 1e9);

    const double starMass = 1.989e30;
    const double separation = AU;
    const double r = separation * 0.5;
    const double v = circularSpeed(starMass, separation) / std::sqrt(2.0);

    sim.addBody(Body("Star-A", starMass, Vec2D(-r, 0.0), Vec2D(0.0, -v), 200000e3));
    sim.addBody(Body("Star-B", starMass, Vec2D(r, 0.0), Vec2D(0.0, v), 200000e3));

    return sim;
}

Simulation figureEight(double dt) {
    Simulation sim(dt, 0.0);

    const double p[3][2] = {
        {0.97000436, -0.24308753},
        {-0.97000436, 0.24308753},
        {0.0, 0.0},
    };

    const double v3x = 0.93240737 / 2.0;
    const double v3y = 0.86473146 / 2.0;

    const double v[3][2] = {
        {-v3x, -v3y},
        {-v3x, -v3y},
        {v3x, v3y},
    };

    const double L = 1e11;
    const double M = 1e30;
    const double T = std::sqrt((L * L * L) / (Simulation::G * M));

    for (int i = 0; i < 3; ++i) {
        const Vec2D pos(p[i][0] * L, p[i][1] * L);
        const Vec2D vel(v[i][0] * L / T, v[i][1] * L / T);
        sim.addBody(Body("Body-" + std::to_string(i + 1), M, pos, vel, 3e9));
    }

    return sim;
}

Simulation randomCloud(int n, unsigned int seed, double dt) {
    Simulation sim(dt, 1e10);
    std::mt19937 rng(seed);

    std::uniform_real_distribution<double> massDist(1e24, 1e29);
    std::uniform_real_distribution<double> posDist(-5.0 * AU, 5.0 * AU);
    std::uniform_real_distribution<double> velDist(-5000.0, 5000.0);

    for (int i = 0; i < n; ++i) {
        const double mass = massDist(rng);
        const Vec2D pos(posDist(rng), posDist(rng));
        const Vec2D vel(velDist(rng), velDist(rng));
        const double radius = std::cbrt(mass / 1e21) * 1e6;

        sim.addBody(Body("Body-" + std::to_string(i + 1), mass, pos, vel, radius));
    }

    return sim;
}

const std::unordered_map<std::string, std::pair<std::string, ScenarioFactory>>& registry() {
    static const std::unordered_map<std::string, std::pair<std::string, ScenarioFactory>> map = {
        {"solar_system", {"Solar System (Sun + 8 planets)", [](double dt) { return solarSystem(dt); }}},
        {"binary_stars", {"Binary Stars (2 equal-mass suns)", [](double dt) { return binaryStars(dt); }}},
        {"figure_eight", {"Figure-8 Choreography (3 bodies)", [](double dt) { return figureEight(dt); }}},
        {"random_cloud", {"Random Cloud (10 bodies, chaotic)", [](double dt) { return randomCloud(10, 42, dt); }}},
    };

    return map;
}

}  // namespace Scenarios
