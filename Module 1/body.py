"""
body.py — Represents a single massive body in the N-body simulation.
"""

from vec2d import Vec2D


class Body:
    """
    A point mass with position, velocity, and acceleration.

    Attributes
    ----------
    name        : human-readable label (e.g. "Earth")
    mass        : kg
    position    : Vec2D in metres
    velocity    : Vec2D in m/s
    acceleration: Vec2D in m/s²  — reset each integration step
    radius      : metres — used for collision detection later
    """

    def __init__(
        self,
        name: str,
        mass: float,
        position: Vec2D,
        velocity: Vec2D,
        radius: float = 1.0,
    ):
        if mass <= 0:
            raise ValueError(f"Body '{name}': mass must be positive, got {mass}.")
        self.name = name
        self.mass = mass
        self.position = position.copy()
        self.velocity = velocity.copy()
        self.acceleration = Vec2D(0.0, 0.0)
        self.radius = radius

    # ------------------------------------------------------------------ #
    # Physics helpers                                                       #
    # ------------------------------------------------------------------ #

    def reset_acceleration(self) -> None:
        """Zero out acceleration before recalculating forces each step."""
        self.acceleration = Vec2D(0.0, 0.0)

    def apply_force(self, force: Vec2D) -> None:
        """Accumulate a force vector: a += F / m."""
        self.acceleration = self.acceleration + force / self.mass

    def kinetic_energy(self) -> float:
        """½mv²"""
        return 0.5 * self.mass * self.velocity.magnitude_sq()

    # ------------------------------------------------------------------ #
    # Dunder helpers                                                        #
    # ------------------------------------------------------------------ #

    def __repr__(self) -> str:
        return (
            f"Body('{self.name}', mass={self.mass:.3e} kg, "
            f"pos={self.position}, vel={self.velocity})"
        )
