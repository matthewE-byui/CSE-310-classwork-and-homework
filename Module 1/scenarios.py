"""
scenarios.py — Preset simulation scenarios.

Days 10-11:
    solar_system  — Sun + 8 planets (real masses & orbital data)
    binary_stars  — Two equal stars in circular orbit
    figure_eight  — Famous 3-body figure-8 choreography
    random_cloud  — N bodies placed randomly (watch chaos)
"""

import math
import random
from body import Body
from simulation import Simulation
from vec2d import Vec2D

# ---------------------------------------------------------------------------
# Physical constants
# ---------------------------------------------------------------------------
AU = 1.496e11          # 1 astronomical unit in metres
G = 6.674e-11


def _circular_speed(central_mass: float, radius: float) -> float:
    """Orbital speed for a circular orbit: v = sqrt(G*M/r)."""
    return math.sqrt(G * central_mass / radius)


# ---------------------------------------------------------------------------
# 1. Solar System  (Sun + 8 planets)
# ---------------------------------------------------------------------------

def solar_system(dt: float = 3600.0) -> Simulation:
    """
    Sun + 8 planets using real masses and mean orbital radii.
    Planets start at their semi-major axis along the +x axis with
    circular-orbit velocities along +y.
    """
    sim = Simulation(dt=dt, softening=1e9)

    sun_mass = 1.989e30

    bodies = [
        # name       mass(kg)      semi-major(AU)   radius(m)
        ("Sun",     1.989e30,      0.0,             696_000e3),
        ("Mercury", 3.285e23,      0.387,            2_439e3),
        ("Venus",   4.867e24,      0.723,            6_052e3),
        ("Earth",   5.972e24,      1.000,            6_371e3),
        ("Mars",    6.390e23,      1.524,            3_390e3),
        ("Jupiter", 1.898e27,      5.203,           69_911e3),
        ("Saturn",  5.683e26,      9.537,           58_232e3),
        ("Uranus",  8.681e25,     19.191,           25_362e3),
        ("Neptune", 1.024e26,     30.069,           24_622e3),
    ]

    for name, mass, semi_major_au, radius in bodies:
        r = semi_major_au * AU
        if r == 0.0:
            pos = Vec2D(0.0, 0.0)
            vel = Vec2D(0.0, 0.0)
        else:
            v = _circular_speed(sun_mass, r)
            pos = Vec2D(r, 0.0)
            vel = Vec2D(0.0, v)
        sim.add_body(Body(name, mass, pos, vel, radius))

    return sim


# ---------------------------------------------------------------------------
# 2. Binary Stars
# ---------------------------------------------------------------------------

def binary_stars(dt: float = 3600.0) -> Simulation:
    """
    Two equal-mass stars in a circular orbit around their common centre.
    Separation = 1 AU.
    """
    sim = Simulation(dt=dt, softening=1e9)

    star_mass = 1.989e30   # 1 solar mass each
    separation = AU

    # Each star sits at ±separation/2 on the x-axis.
    r = separation / 2
    v = _circular_speed(star_mass, separation) / math.sqrt(2)

    star_a = Body("Star-A", star_mass, Vec2D(-r, 0), Vec2D(0, -v), 200_000e3)
    star_b = Body("Star-B", star_mass, Vec2D( r, 0), Vec2D(0,  v), 200_000e3)

    sim.add_body(star_a)
    sim.add_body(star_b)
    return sim


# ---------------------------------------------------------------------------
# 3. Figure-Eight  (Chenciner & Montgomery 2000)
# ---------------------------------------------------------------------------

def figure_eight(dt: float = 10.0) -> Simulation:
    """
    Famous stable 3-body choreography where three equal masses chase each
    other along a figure-8 curve.

    Initial conditions from: Chenciner & Montgomery (2000).
    Scaled to AU / (year/2π) units then converted to SI.
    """
    sim = Simulation(dt=dt, softening=0.0)

    # Dimensionless initial conditions (from the original paper)
    # positions (x, y)
    p1 = ( 0.97000436, -0.24308753)
    p2 = (-0.97000436,  0.24308753)
    p3 = ( 0.0,          0.0)

    # velocities (vx, vy)  — note: p3's vel is -(v1+v2)
    v3 = ( 0.93240737 / 2,  0.86473146 / 2)
    v1 = (-v3[0], -v3[1])
    v2 = (-v3[0], -v3[1])

    # Scale factor: 1 dimensionless unit → scale metres, time → scale seconds
    # Choose length scale = 1e11 m, then derive time scale from G·M/L³ = 1
    L = 1e11       # metres per dimensionless length unit
    M = 1.0e30     # kg per dimensionless mass unit
    T = math.sqrt(L ** 3 / (G * M))   # time scale in seconds

    positions = [p1, p2, p3]
    velocities = [v1, v2, v3]

    for k, (p, v) in enumerate(zip(positions, velocities)):
        pos = Vec2D(p[0] * L, p[1] * L)
        vel = Vec2D(v[0] * L / T, v[1] * L / T)
        sim.add_body(Body(f"Body-{k+1}", M, pos, vel, radius=3e9))

    return sim


# ---------------------------------------------------------------------------
# 4. Random Cloud
# ---------------------------------------------------------------------------

def random_cloud(n: int = 10, seed: int = 42, dt: float = 3600.0) -> Simulation:
    """
    N bodies placed randomly within a 10 AU square with small random
    velocities. Interesting chaos — watch merges happen.
    """
    sim = Simulation(dt=dt, softening=1e10)
    rng = random.Random(seed)

    for i in range(n):
        mass = rng.uniform(1e24, 1e29)   # moon-mass to sub-stellar
        x = rng.uniform(-5 * AU, 5 * AU)
        y = rng.uniform(-5 * AU, 5 * AU)
        vx = rng.uniform(-5000, 5000)    # m/s
        vy = rng.uniform(-5000, 5000)
        radius = (mass / 1e21) ** (1 / 3) * 1e6   # rough density scaling
        sim.add_body(Body(f"Body-{i+1}", mass, Vec2D(x, y), Vec2D(vx, vy), radius))

    return sim


# ---------------------------------------------------------------------------
# Registry
# ---------------------------------------------------------------------------

SCENARIOS: dict[str, tuple[str, callable]] = {
    "solar_system":  ("Solar System (Sun + 8 planets)",         solar_system),
    "binary_stars":  ("Binary Stars (2 equal-mass suns)",       binary_stars),
    "figure_eight":  ("Figure-8 Choreography (3 bodies)",       figure_eight),
    "random_cloud":  ("Random Cloud (10 bodies, chaotic)",      random_cloud),
}
