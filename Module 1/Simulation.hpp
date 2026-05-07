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
