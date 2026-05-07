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
