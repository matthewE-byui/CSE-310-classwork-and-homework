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
    if (mass <= 0.0 || std::abs(maxLogMass - minLogMass) < 1e-12) {
        return '*';
    }

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

    if (bodies.empty()) {
        std::cout << "(no bodies to render)\n";
        return;
    }

    double minX = bodies[0].position.x;
    double maxX = bodies[0].position.x;
    double minY = bodies[0].position.y;
    double maxY = bodies[0].position.y;

    std::vector<double> logMasses;
    logMasses.reserve(bodies.size());

    for (const auto& body : bodies) {
        minX = std::min(minX, body.position.x);
        maxX = std::max(maxX, body.position.x);
        minY = std::min(minY, body.position.y);
        maxY = std::max(maxY, body.position.y);
        if (body.mass > 0.0) {
            logMasses.push_back(std::log10(body.mass));
        }
    }

    double spanX = std::max(maxX - minX, 1.0);
    double spanY = std::max(maxY - minY, 1.0);

    minX -= spanX * 0.12;
    maxX += spanX * 0.12;
    minY -= spanY * 0.12;
    maxY += spanY * 0.12;

    spanX = maxX - minX;
    spanY = maxY - minY;

    const double desiredRatio = (static_cast<double>(width) / static_cast<double>(height)) * 0.5;
    if ((spanX / spanY) < desiredRatio) {
        const double cx = (minX + maxX) * 0.5;
        spanX = spanY * desiredRatio;
        minX = cx - spanX * 0.5;
        maxX = cx + spanX * 0.5;
    } else {
        const double cy = (minY + maxY) * 0.5;
        spanY = spanX / desiredRatio;
        minY = cy - spanY * 0.5;
        maxY = cy + spanY * 0.5;
    }

    const double minLogMass = *std::min_element(logMasses.begin(), logMasses.end());
    const double maxLogMass = *std::max_element(logMasses.begin(), logMasses.end());

    std::vector<std::string> grid(static_cast<std::size_t>(height), std::string(static_cast<std::size_t>(width), ' '));

    for (const auto& body : bodies) {
        int col = static_cast<int>(((body.position.x - minX) / (maxX - minX)) * (width - 1));
        int row = static_cast<int>((1.0 - (body.position.y - minY) / (maxY - minY)) * (height - 1));

        col = std::clamp(col, 0, width - 1);
        row = std::clamp(row, 0, height - 1);

        grid[static_cast<std::size_t>(row)][static_cast<std::size_t>(col)] = glyphFor(body.mass, minLogMass, maxLogMass);
    }

    std::cout << '+' << std::string(static_cast<std::size_t>(width), '-') << "+\n";
    for (const auto& row : grid) {
        std::cout << '|' << row << "|\n";
    }
    std::cout << '+' << std::string(static_cast<std::size_t>(width), '-') << "+\n";

    const double days = timeElapsed / 86400.0;
    const double years = days / 365.25;

    std::cout.setf(std::ios::scientific);
    std::cout.precision(4);

    if (years >= 1.0) {
        std::cout.unsetf(std::ios::scientific);
        std::cout << " Time: " << years << " yr";
    } else if (days >= 1.0) {
        std::cout.unsetf(std::ios::scientific);
        std::cout << " Time: " << days << " d";
    } else {
        std::cout.unsetf(std::ios::scientific);
        std::cout << " Time: " << timeElapsed << " s";
    }

    std::cout.setf(std::ios::scientific);
    std::cout << "  |  Bodies: " << bodies.size() << "  |  Total E: " << energy << " J\n";

    if (!collisionLog.empty()) {
        std::cout << " Last event: " << collisionLog.back() << "\n";
    }
    std::cout << " Legend: '.' small '+' medium '*' large 'O' giant '@' massive\n";
}
