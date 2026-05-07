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
