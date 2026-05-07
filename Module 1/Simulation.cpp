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

const std::vector<Body>& Simulation::getBodies() const {
    return bodies;
}

std::vector<Body>& Simulation::getBodiesMutable() {
    return bodies;
}

double Simulation::getDt() const {
    return dt;
}

void Simulation::setDt(double dtVal) {
    dt = dtVal;
}

double Simulation::getTimeElapsed() const {
    return timeElapsed;
}

const std::vector<std::string>& Simulation::getCollisionLog() const {
    return collisionLog;
}

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
            if (merged) {
                break;
            }
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
