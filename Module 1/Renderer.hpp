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
