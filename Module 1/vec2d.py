"""
vec2d.py — 2D vector math for the N-body simulator.
"""

import math


class Vec2D:
    """Immutable-style 2D vector supporting all physics math we need."""

    __slots__ = ("x", "y")

    def __init__(self, x: float = 0.0, y: float = 0.0):
        self.x = x
        self.y = y

    # ------------------------------------------------------------------ #
    # Arithmetic operators                                                  #
    # ------------------------------------------------------------------ #

    def __add__(self, other: "Vec2D") -> "Vec2D":
        return Vec2D(self.x + other.x, self.y + other.y)

    def __sub__(self, other: "Vec2D") -> "Vec2D":
        return Vec2D(self.x - other.x, self.y - other.y)

    def __mul__(self, scalar: float) -> "Vec2D":
        return Vec2D(self.x * scalar, self.y * scalar)

    def __rmul__(self, scalar: float) -> "Vec2D":
        return self.__mul__(scalar)

    def __truediv__(self, scalar: float) -> "Vec2D":
        return Vec2D(self.x / scalar, self.y / scalar)

    def __neg__(self) -> "Vec2D":
        return Vec2D(-self.x, -self.y)

    def __eq__(self, other: object) -> bool:
        if not isinstance(other, Vec2D):
            return NotImplemented
        return self.x == other.x and self.y == other.y

    def __repr__(self) -> str:
        return f"Vec2D({self.x:.4f}, {self.y:.4f})"

    # ------------------------------------------------------------------ #
    # Vector operations                                                     #
    # ------------------------------------------------------------------ #

    def dot(self, other: "Vec2D") -> float:
        """Dot product."""
        return self.x * other.x + self.y * other.y

    def magnitude(self) -> float:
        """Euclidean length of the vector."""
        return math.sqrt(self.x * self.x + self.y * self.y)

    def magnitude_sq(self) -> float:
        """Squared magnitude — avoids sqrt when only comparison is needed."""
        return self.x * self.x + self.y * self.y

    def normalize(self) -> "Vec2D":
        """Return a unit vector in the same direction. Raises if zero-length."""
        mag = self.magnitude()
        if mag == 0.0:
            raise ValueError("Cannot normalize a zero-length vector.")
        return self / mag

    def distance_to(self, other: "Vec2D") -> float:
        """Euclidean distance to another point-vector."""
        return (self - other).magnitude()

    def distance_sq_to(self, other: "Vec2D") -> float:
        """Squared distance — cheaper when exact distance isn't needed."""
        return (self - other).magnitude_sq()

    def copy(self) -> "Vec2D":
        return Vec2D(self.x, self.y)
