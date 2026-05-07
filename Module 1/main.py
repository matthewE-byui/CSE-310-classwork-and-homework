"""
main.py — N-body gravity simulator  (Days 1-14 complete)

Usage
-----
    python main.py                          # interactive menu
    python main.py --scenario solar_system  # run a preset directly
    python main.py --file my_scenario.json  # load a JSON config
    python main.py --steps 500 --dt 7200    # override step count / time-step
    python main.py --no-render              # headless run (energy check only)

Controls while running
----------------------
    Press Ctrl-C to stop at any time.
"""

import argparse
import sys
import time

from simulation import Simulation
from renderer import Renderer
from scenarios import SCENARIOS
from config_loader import load_scenario


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _print_menu() -> str:
    """Print the interactive scenario menu and return the user's choice."""
    print("\n╔══════════════════════════════════════╗")
    print("║      N-Body Gravity Simulator        ║")
    print("╚══════════════════════════════════════╝\n")
    print("Select a scenario:\n")
    keys = list(SCENARIOS.keys())
    for i, key in enumerate(keys, 1):
        description, _ = SCENARIOS[key]
        print(f"  {i}. {description}")
    print(f"  {len(keys)+1}. Load from JSON file")
    print()
    while True:
        raw = input(f"Enter choice [1-{len(keys)+1}]: ").strip()
        if raw.isdigit():
            choice = int(raw)
            if 1 <= choice <= len(keys) + 1:
                if choice <= len(keys):
                    return keys[choice - 1]
                return "__file__"
        print("  Invalid choice, try again.")


def _energy_report(sim: Simulation, initial_energy: float) -> None:
    """Print an energy conservation summary."""
    ke = sim.total_kinetic_energy()
    pe = sim.total_potential_energy()
    total = ke + pe
    drift = abs((total - initial_energy) / initial_energy) * 100 if initial_energy != 0 else 0.0
    print(f"\n{'─'*50}")
    print(f"  Kinetic Energy   : {ke:.6e} J")
    print(f"  Potential Energy : {pe:.6e} J")
    print(f"  Total Energy     : {total:.6e} J")
    print(f"  Initial Energy   : {initial_energy:.6e} J")
    print(f"  Energy drift     : {drift:.4f} %")
    if sim.collision_log:
        print(f"\n  Collision events ({len(sim.collision_log)}):")
        for entry in sim.collision_log:
            print(f"    {entry}")
    print(f"{'─'*50}")


# ---------------------------------------------------------------------------
# Main runner
# ---------------------------------------------------------------------------

def run(
    sim: Simulation,
    steps: int,
    render: bool,
    frame_every: int,
    frame_delay: float,
) -> None:
    """Run the simulation loop with optional ASCII rendering."""
    renderer = Renderer() if render else None

    # Prime initial accelerations and record starting energy
    from simulation import G
    sim._compute_accelerations()
    initial_energy = sim.total_energy()

    print(f"\nStarting simulation: {len(sim.bodies)} bodies, "
          f"dt={sim.dt}s, {steps} steps")
    if not render:
        print("(headless mode — no display)")

    try:
        for step in range(steps):
            sim.step()
            if render and (step % frame_every == 0):
                energy = sim.total_energy()
                renderer.render(
                    sim.bodies,
                    sim.time_elapsed,
                    energy=energy,
                    collision_log=sim.collision_log,
                )
                time.sleep(frame_delay)
                if not sim.bodies:
                    print("All bodies merged — simulation complete.")
                    break
    except KeyboardInterrupt:
        print("\n[Interrupted by user]")

    _energy_report(sim, initial_energy)


# ---------------------------------------------------------------------------
# CLI entry point
# ---------------------------------------------------------------------------

def main() -> None:
    parser = argparse.ArgumentParser(
        description="N-body gravity simulator",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=__doc__,
    )
    parser.add_argument(
        "--scenario", "-s",
        choices=list(SCENARIOS.keys()),
        help="Preset scenario to run.",
    )
    parser.add_argument(
        "--file", "-f",
        metavar="PATH",
        help="Path to a JSON scenario file.",
    )
    parser.add_argument(
        "--steps", "-n",
        type=int,
        default=2000,
        help="Number of integration steps (default: 2000).",
    )
    parser.add_argument(
        "--dt",
        type=float,
        default=None,
        help="Override the time-step in seconds.",
    )
    parser.add_argument(
        "--frame-every",
        type=int,
        default=10,
        help="Render every N steps (default: 10).",
    )
    parser.add_argument(
        "--delay",
        type=float,
        default=0.05,
        help="Seconds to pause between rendered frames (default: 0.05).",
    )
    parser.add_argument(
        "--no-render",
        action="store_true",
        help="Disable ASCII rendering (headless energy-check mode).",
    )

    args = parser.parse_args()

    # ---- Build simulation ------------------------------------------------
    sim: Simulation | None = None

    if args.file:
        try:
            sim = load_scenario(args.file)
        except (FileNotFoundError, ValueError) as exc:
            print(f"Error loading '{args.file}': {exc}", file=sys.stderr)
            sys.exit(1)

    elif args.scenario:
        _, factory = SCENARIOS[args.scenario]
        dt = args.dt if args.dt else 3600.0
        # figure_eight needs a much smaller dt
        if args.scenario == "figure_eight":
            dt = args.dt if args.dt else 10.0
        sim = factory(dt=dt)

    else:
        # Interactive menu
        choice = _print_menu()
        if choice == "__file__":
            path = input("Enter path to JSON file: ").strip()
            try:
                sim = load_scenario(path)
            except (FileNotFoundError, ValueError) as exc:
                print(f"Error: {exc}", file=sys.stderr)
                sys.exit(1)
        else:
            _, factory = SCENARIOS[choice]
            dt = args.dt if args.dt else (10.0 if choice == "figure_eight" else 3600.0)
            sim = factory(dt=dt)

    if args.dt and sim:
        sim.dt = args.dt

    # ---- Run ---------------------------------------------------------------
    run(
        sim=sim,
        steps=args.steps,
        render=not args.no_render,
        frame_every=args.frame_every,
        frame_delay=args.delay,
    )


if __name__ == "__main__":
    main()
