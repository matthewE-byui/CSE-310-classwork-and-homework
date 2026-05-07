"""
renderer.py — ASCII terminal renderer for the N-body simulation.

Days 8-9: maps body positions onto a character grid, clears the terminal
          and prints one frame per simulation snapshot.
"""

import os
import math
from body import Body


# Glyph scale by relative mass (log scale): tiny → massive
_GLYPHS = [".", "+", "*", "O", "@"]


def _glyph_for(body: Body, max_log_mass: float, min_log_mass: float) -> str:
    """Pick a display character based on the body's relative log-mass."""
    span = max_log_mass - min_log_mass
    if span == 0 or body.mass <= 0:
        return "*"
    ratio = (math.log10(body.mass) - min_log_mass) / span
    idx = int(ratio * (len(_GLYPHS) - 1) + 0.5)
    idx = max(0, min(idx, len(_GLYPHS) - 1))
    return _GLYPHS[idx]


class Renderer:
    """
    Renders one simulation frame on a fixed-size ASCII grid.

    The viewport auto-scales every frame so all bodies stay visible.
    Terminal character cells are roughly twice as tall as wide, so the
    grid is kept at a 2:1 width-to-height ratio to appear square.
    """

    def __init__(self, width: int = 78, height: int = 36):
        self.width = width
        self.height = height

    # ------------------------------------------------------------------ #
    # Viewport helpers                                                      #
    # ------------------------------------------------------------------ #

    def _bounds(
        self, bodies: list[Body]
    ) -> tuple[float, float, float, float]:
        """Return (min_x, max_x, min_y, max_y) with a 10 % margin, kept square."""
        xs = [b.position.x for b in bodies]
        ys = [b.position.y for b in bodies]
        min_x, max_x = min(xs), max(xs)
        min_y, max_y = min(ys), max(ys)

        span_x = max(max_x - min_x, 1.0)
        span_y = max(max_y - min_y, 1.0)

        min_x -= span_x * 0.12
        max_x += span_x * 0.12
        min_y -= span_y * 0.12
        max_y += span_y * 0.12

        span_x = max_x - min_x
        span_y = max_y - min_y

        # Correct for the ~2:1 char aspect ratio
        desired_ratio = (self.width / self.height) * 0.5
        if span_x / span_y < desired_ratio:
            cx = (min_x + max_x) / 2
            span_x = span_y * desired_ratio
            min_x, max_x = cx - span_x / 2, cx + span_x / 2
        else:
            cy = (min_y + max_y) / 2
            span_y = span_x / desired_ratio
            min_y, max_y = cy - span_y / 2, cy + span_y / 2

        return min_x, max_x, min_y, max_y

    # ------------------------------------------------------------------ #
    # Public render                                                         #
    # ------------------------------------------------------------------ #

    def render(
        self,
        bodies: list[Body],
        time_elapsed: float,
        energy: float | None = None,
        collision_log: list[str] | None = None,
    ) -> None:
        """Clear the terminal and draw one frame."""
        os.system("cls" if os.name == "nt" else "clear")

        if not bodies:
            print("(no bodies to render)")
            return

        min_x, max_x, min_y, max_y = self._bounds(bodies)
        span_x = max_x - min_x
        span_y = max_y - min_y

        # Pre-compute glyph scaling
        log_masses = [math.log10(b.mass) for b in bodies if b.mass > 0]
        max_lm = max(log_masses)
        min_lm = min(log_masses)

        # Build empty grid (background = space)
        grid: list[list[str]] = [[" " for _ in range(self.width)] for _ in range(self.height)]

        # Plot bodies — later bodies overwrite earlier if they overlap
        for body in bodies:
            col = int((body.position.x - min_x) / span_x * (self.width - 1))
            row = int((1.0 - (body.position.y - min_y) / span_y) * (self.height - 1))
            col = max(0, min(col, self.width - 1))
            row = max(0, min(row, self.height - 1))
            grid[row][col] = _glyph_for(body, max_lm, min_lm)

        # Print with border
        border = "+" + "-" * self.width + "+"
        print(border)
        for row in grid:
            print("|" + "".join(row) + "|")
        print(border)

        # Status bar
        days = time_elapsed / 86400.0
        years = days / 365.25
        if years >= 1.0:
            time_str = f"{years:.2f} yr"
        elif days >= 1.0:
            time_str = f"{days:.1f} d"
        else:
            time_str = f"{time_elapsed:.1f} s"

        status = f" Time: {time_str}  |  Bodies: {len(bodies)}"
        if energy is not None:
            status += f"  |  Total E: {energy:.4e} J"
        print(status)

        # Show last collision if any
        if collision_log:
            print(f" Last event: {collision_log[-1]}")

        # Legend
        print(f" Legend: '.' small  '+' medium  '*' large  'O' giant  '@' massive")
