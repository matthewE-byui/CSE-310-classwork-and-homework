"""
simulation.py — N-body simulation engine.

Days 3-4 : gravitational force calculation between all pairs  (O(n²))
Days 5-6 : velocity-Verlet integration
Day  7   : energy tracking (KE + PE) for conservation check
Days 12-13: collision detection and inelastic body merging
"""

import math
from body import Body
from vec2d import Vec2D

G = 6.674e-11        # gravitational constant  (m³ kg⁻¹ s⁻²)
_DEFAULT_SOFTENING = 1e8   # softening length (m) — prevents singularity at r→0


class Simulation:
    """
    Drives the time-stepping loop for an N-body system.

    Integration method: velocity-Verlet (symplectic, conserves energy well).

    Force model:
        F = G·m₁·m₂ / (r² + ε²)   with softening length ε.

    Collisions:
        Inelastic merge — momentum conserved, bodies combined.
    """

    def __init__(self, dt: float = 3600.0, softening: float = _DEFAULT_SOFTENING):
        """
        Parameters
        ----------
        dt        : time-step in seconds (default = 1 hour)
        softening : softening length in metres to avoid divide-by-zero
        """
        self.bodies: list[Body] = []
        self.dt = dt
        self.softening = softening
        self.time_elapsed: float = 0.0
        self.collision_log: list[str] = []

    # ------------------------------------------------------------------ #
    # Body management                                                       #
    # ------------------------------------------------------------------ #

    def add_body(self, body: Body) -> None:
        self.bodies.append(body)

    # ------------------------------------------------------------------ #
    # Forces  (Days 3-4)                                                    #
    # ------------------------------------------------------------------ #

    def _compute_accelerations(self) -> None:
        """O(n²) pairwise gravitational force with softening."""
        for b in self.bodies:
            b.reset_acceleration()

        n = len(self.bodies)
        for i in range(n):
            for j in range(i + 1, n):
                bi = self.bodies[i]
                bj = self.bodies[j]

                diff = bj.position - bi.position          # vector i → j
                dist_sq = diff.magnitude_sq() + self.softening ** 2
                dist = math.sqrt(dist_sq)

                # |F| = G * m_i * m_j / dist_sq
                force_mag = G * bi.mass * bj.mass / dist_sq

                # Scale diff to unit vector × force magnitude
                force_vec = diff * (force_mag / dist)

                bi.apply_force(force_vec)
                bj.apply_force(-force_vec)     # Newton's third law

    # ------------------------------------------------------------------ #
    # Integration  (Days 5-6)  —  velocity-Verlet                          #
    # ------------------------------------------------------------------ #

    def step(self) -> None:
        """Advance the simulation by one time-step dt."""
        dt = self.dt

        # 1. Snapshot current accelerations
        old_acc = [b.acceleration.copy() for b in self.bodies]

        # 2. x(t+dt) = x(t) + v(t)·dt + ½·a(t)·dt²
        for i, b in enumerate(self.bodies):
            b.position = (
                b.position
                + b.velocity * dt
                + old_acc[i] * (0.5 * dt * dt)
            )

        # 3. Recompute accelerations at new positions
        self._compute_accelerations()

        # 4. v(t+dt) = v(t) + ½·(a_old + a_new)·dt
        for i, b in enumerate(self.bodies):
            b.velocity = b.velocity + (old_acc[i] + b.acceleration) * (0.5 * dt)

        self.time_elapsed += dt

        # 5. Collision detection / merging  (Days 12-13)
        self._resolve_collisions()

    def run(self, steps: int) -> None:
        """Run the simulation for a fixed number of steps."""
        self._compute_accelerations()   # prime initial accelerations
        for _ in range(steps):
            self.step()

    # ------------------------------------------------------------------ #
    # Energy  (Day 7)                                                       #
    # ------------------------------------------------------------------ #

    def total_kinetic_energy(self) -> float:
        """Sum of ½mv² for all bodies."""
        return sum(b.kinetic_energy() for b in self.bodies)

    def total_potential_energy(self) -> float:
        """Gravitational PE = Σ -G·m_i·m_j / r  (unique pairs)."""
        pe = 0.0
        n = len(self.bodies)
        for i in range(n):
            for j in range(i + 1, n):
                r = self.bodies[i].position.distance_to(self.bodies[j].position)
                if r > 0:
                    pe -= G * self.bodies[i].mass * self.bodies[j].mass / r
        return pe

    def total_energy(self) -> float:
        """Total mechanical energy (KE + PE). Should be approximately conserved."""
        return self.total_kinetic_energy() + self.total_potential_energy()

    # ------------------------------------------------------------------ #
    # Collision detection + merging  (Days 12-13)                          #
    # ------------------------------------------------------------------ #

    def _resolve_collisions(self) -> None:
        """
        Repeatedly scan pairs until no collisions remain this step.
        Bodies collide when their distance < sum of radii.
        The smaller body is absorbed into the larger.
        """
        merged = True
        while merged:
            merged = False
            n = len(self.bodies)
            for i in range(n):
                for j in range(i + 1, n):
                    bi = self.bodies[i]
                    bj = self.bodies[j]
                    dist = bi.position.distance_to(bj.position)
                    if dist < (bi.radius + bj.radius):
                        self._merge(i, j)
                        merged = True
                        break
                if merged:
                    break

    def _merge(self, i: int, j: int) -> None:
        """Merge body j into body i (inelastic); conserves momentum."""
        bi = self.bodies[i]
        bj = self.bodies[j]

        total_mass = bi.mass + bj.mass

        # Conservation of momentum
        new_velocity = (
            bi.velocity * bi.mass + bj.velocity * bj.mass
        ) / total_mass

        # Centre-of-mass position
        new_position = (
            bi.position * bi.mass + bj.position * bj.mass
        ) / total_mass

        # Volume-conserving radius:  r = (r_i³ + r_j³)^(1/3)
        new_radius = (bi.radius ** 3 + bj.radius ** 3) ** (1.0 / 3.0)

        self.collision_log.append(
            f"t={self.time_elapsed:.3e}s  MERGE: '{bj.name}' + '{bi.name}'"
            f" → mass={total_mass:.3e} kg"
        )

        # Larger body survives; ensure bi is the heavier one
        if bj.mass > bi.mass:
            bi, bj = bj, bi
            self.bodies[i], self.bodies[j] = self.bodies[j], self.bodies[i]

        bi.mass = total_mass
        bi.position = new_position
        bi.velocity = new_velocity
        bi.radius = new_radius

        self.bodies.pop(j)

    # ------------------------------------------------------------------ #
    # Repr                                                                  #
    # ------------------------------------------------------------------ #

    def __repr__(self) -> str:
        return (
            f"Simulation(bodies={len(self.bodies)}, dt={self.dt}s, "
            f"elapsed={self.time_elapsed:.3e}s)"
        )
