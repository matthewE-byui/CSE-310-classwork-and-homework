"""
config_loader.py — Load a custom scenario from a JSON file.

Day 14: file I/O for scenario loading.

JSON schema
-----------
{
    "dt": 3600.0,
    "softening": 1e8,
    "bodies": [
        {
            "name": "Star",
            "mass": 1.989e30,
            "x": 0.0,
            "y": 0.0,
            "vx": 0.0,
            "vy": 0.0,
            "radius": 696000000.0
        },
        ...
    ]
}

All fields except "name" accept scientific-notation strings or numbers.
"""

import json
from pathlib import Path
from body import Body
from simulation import Simulation
from vec2d import Vec2D


def _parse_float(value: object, field: str) -> float:
    """Accept int, float, or scientific-notation string."""
    try:
        return float(value)
    except (TypeError, ValueError) as exc:
        raise ValueError(f"Config field '{field}' is not a valid number: {value!r}") from exc


def load_scenario(path: str | Path) -> Simulation:
    """
    Parse a JSON config file and return a fully configured Simulation.

    Raises
    ------
    FileNotFoundError  : if the file does not exist
    ValueError         : if required fields are missing or invalid
    """
    path = Path(path)
    if not path.exists():
        raise FileNotFoundError(f"Scenario file not found: {path}")

    with path.open("r", encoding="utf-8") as fh:
        data = json.load(fh)

    dt = _parse_float(data.get("dt", 3600.0), "dt")
    softening = _parse_float(data.get("softening", 1e8), "softening")

    sim = Simulation(dt=dt, softening=softening)

    raw_bodies = data.get("bodies")
    if not isinstance(raw_bodies, list) or len(raw_bodies) == 0:
        raise ValueError("Config must have a non-empty 'bodies' list.")

    for idx, entry in enumerate(raw_bodies):
        tag = f"bodies[{idx}]"
        if "name" not in entry:
            raise ValueError(f"{tag}: missing required field 'name'.")

        name = str(entry["name"])
        mass = _parse_float(entry.get("mass"), f"{tag}.mass")
        x    = _parse_float(entry.get("x",  0.0), f"{tag}.x")
        y    = _parse_float(entry.get("y",  0.0), f"{tag}.y")
        vx   = _parse_float(entry.get("vx", 0.0), f"{tag}.vx")
        vy   = _parse_float(entry.get("vy", 0.0), f"{tag}.vy")
        radius = _parse_float(entry.get("radius", 1e6), f"{tag}.radius")

        sim.add_body(Body(name, mass, Vec2D(x, y), Vec2D(vx, vy), radius))

    return sim
