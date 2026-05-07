#pragma once

#include <string>

#include "Simulation.hpp"

namespace ConfigLoader {

Simulation loadScenario(const std::string& path);

}  // namespace ConfigLoader
