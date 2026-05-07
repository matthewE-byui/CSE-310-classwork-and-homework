#include "ConfigLoader.hpp"

#include <fstream>
#include <regex>
#include <sstream>
#include <stdexcept>

namespace {

std::string readAll(const std::string& path) {
    std::ifstream in(path);
    if (!in) {
        throw std::runtime_error("Scenario file not found: " + path);
    }
    std::ostringstream ss;
    ss << in.rdbuf();
    return ss.str();
}

std::string extractBodiesArray(const std::string& text) {
    const std::size_t bodiesPos = text.find("\"bodies\"");
    if (bodiesPos == std::string::npos) {
        throw std::runtime_error("Config missing 'bodies' field");
    }

    const std::size_t arrStart = text.find('[', bodiesPos);
    if (arrStart == std::string::npos) {
        throw std::runtime_error("Config 'bodies' must be an array");
    }

    int depth = 0;
    for (std::size_t i = arrStart; i < text.size(); ++i) {
        if (text[i] == '[') {
            ++depth;
        } else if (text[i] == ']') {
            --depth;
            if (depth == 0) {
                return text.substr(arrStart + 1, i - arrStart - 1);
            }
        }
    }

    throw std::runtime_error("Unbalanced brackets in 'bodies' array");
}

std::vector<std::string> splitObjects(const std::string& arrayText) {
    std::vector<std::string> out;
    int depth = 0;
    std::size_t start = std::string::npos;

    for (std::size_t i = 0; i < arrayText.size(); ++i) {
        if (arrayText[i] == '{') {
            if (depth == 0) {
                start = i;
            }
            ++depth;
        } else if (arrayText[i] == '}') {
            --depth;
            if (depth == 0 && start != std::string::npos) {
                out.push_back(arrayText.substr(start, i - start + 1));
                start = std::string::npos;
            }
        }
    }

    return out;
}

double parseNumberLiteral(std::string token) {
    if (!token.empty() && token.front() == '"' && token.back() == '"') {
        token = token.substr(1, token.size() - 2);
    }
    return std::stod(token);
}

double extractNumber(const std::string& obj, const std::string& key, double defaultValue, bool required = false) {
    const std::regex re("\\\"" + key + "\\\"\\s*:\\s*(\\\"[^\\\"]+\\\"|[-+]?\\d*\\.?\\d+(?:[eE][-+]?\\d+)?)");
    std::smatch match;
    if (!std::regex_search(obj, match, re)) {
        if (required) {
            throw std::runtime_error("Missing required numeric field: " + key);
        }
        return defaultValue;
    }
    return parseNumberLiteral(match[1].str());
}

std::string extractString(const std::string& obj, const std::string& key, bool required = false, const std::string& fallback = "") {
    const std::regex re("\\\"" + key + "\\\"\\s*:\\s*\\\"([^\\\"]*)\\\"");
    std::smatch match;
    if (!std::regex_search(obj, match, re)) {
        if (required) {
            throw std::runtime_error("Missing required string field: " + key);
        }
        return fallback;
    }
    return match[1].str();
}

}  // namespace

namespace ConfigLoader {

Simulation loadScenario(const std::string& path) {
    const std::string text = readAll(path);

    const double dt = extractNumber(text, "dt", 3600.0);
    const double softening = extractNumber(text, "softening", 1e8);

    Simulation sim(dt, softening);

    const std::string bodiesArray = extractBodiesArray(text);
    const auto objects = splitObjects(bodiesArray);
    if (objects.empty()) {
        throw std::runtime_error("Config must contain at least one body");
    }

    for (const auto& obj : objects) {
        const std::string name = extractString(obj, "name", true);
        const double mass = extractNumber(obj, "mass", 0.0, true);
        const double x = extractNumber(obj, "x", 0.0);
        const double y = extractNumber(obj, "y", 0.0);
        const double vx = extractNumber(obj, "vx", 0.0);
        const double vy = extractNumber(obj, "vy", 0.0);
        const double radius = extractNumber(obj, "radius", 1e6);

        sim.addBody(Body(name, mass, Vec2D(x, y), Vec2D(vx, vy), radius));
    }

    return sim;
}

}  // namespace ConfigLoader
