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
