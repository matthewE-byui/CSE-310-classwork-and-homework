#include <chrono>
#include <csignal>
#include <exception>
#include <iomanip>
#include <iostream>
#include <optional>
#include <string>
#include <thread>
#include <vector>

#include "ConfigLoader.hpp"
#include "Renderer.hpp"
#include "Scenarios.hpp"
#include "Simulation.hpp"

struct CliOptions {
    std::optional<std::string> scenario;
    std::optional<std::string> file;
    int steps = 2000;
    std::optional<double> dt;
    int frameEvery = 10;
    double delay = 0.05;
    bool noRender = false;
};

bool g_interrupted = false;

void handleSigInt(int) {
    g_interrupted = true;
}

void printHelp() {
    std::cout
        << "N-body gravity simulator (C++)\n\n"
        << "Usage:\n"
        << "  nbody                              # interactive menu\n"
        << "  nbody --scenario solar_system\n"
        << "  nbody --file example_scenario.json\n"
        << "  nbody --steps 500 --dt 7200 --no-render\n\n"
        << "Options:\n"
        << "  --scenario <name>    Preset: solar_system | binary_stars | figure_eight | random_cloud\n"
        << "  --file <path>        Load scenario from JSON config file\n"
        << "  --steps <n>          Number of simulation steps (default: 2000)\n"
        << "  --dt <seconds>       Override time-step\n"
        << "  --frame-every <n>    Render every n steps (default: 10)\n"
        << "  --delay <seconds>    Delay between frames (default: 0.05)\n"
        << "  --no-render          Headless mode\n"
        << "  --help               Show this help\n";
}

CliOptions parseArgs(int argc, char** argv) {
    CliOptions opts;

    for (int i = 1; i < argc; ++i) {
        const std::string arg = argv[i];
        auto needValue = [&](const std::string& name) -> std::string {
            if (i + 1 >= argc) {
                throw std::runtime_error("Missing value for " + name);
            }
            return std::string(argv[++i]);
        };

        if (arg == "--help") {
            printHelp();
            std::exit(0);
        } else if (arg == "--scenario" || arg == "-s") {
            opts.scenario = needValue(arg);
        } else if (arg == "--file" || arg == "-f") {
            opts.file = needValue(arg);
        } else if (arg == "--steps" || arg == "-n") {
            opts.steps = std::stoi(needValue(arg));
        } else if (arg == "--dt") {
            opts.dt = std::stod(needValue(arg));
        } else if (arg == "--frame-every") {
            opts.frameEvery = std::stoi(needValue(arg));
        } else if (arg == "--delay") {
            opts.delay = std::stod(needValue(arg));
        } else if (arg == "--no-render") {
            opts.noRender = true;
        } else {
            throw std::runtime_error("Unknown argument: " + arg);
        }
    }

    return opts;
}

std::string interactiveScenarioChoice() {
    const auto& reg = Scenarios::registry();
    std::vector<std::string> keys;
    keys.reserve(reg.size());

    std::cout << "\nN-Body Gravity Simulator (C++)\n\n";
    std::cout << "Choose a scenario:\n";

    int idx = 1;
    for (const auto& entry : reg) {
        keys.push_back(entry.first);
        std::cout << "  " << idx++ << ". " << entry.second.first << "\n";
    }
    std::cout << "  " << idx << ". Load from JSON file\n\n";

    while (true) {
        std::cout << "Enter choice [1-" << idx << "]: ";
        int choice = 0;
        if (!(std::cin >> choice)) {
            std::cin.clear();
            std::cin.ignore(10000, '\n');
            std::cout << "Invalid choice.\n";
            continue;
        }

        if (choice >= 1 && choice <= static_cast<int>(keys.size())) {
            return keys[static_cast<std::size_t>(choice - 1)];
        }
        if (choice == idx) {
            return "__file__";
        }
        std::cout << "Invalid choice.\n";
    }
}

void printEnergyReport(const Simulation& sim, double initialEnergy) {
    const double ke = sim.totalKineticEnergy();
    const double pe = sim.totalPotentialEnergy();
    const double total = ke + pe;
    const double drift = (initialEnergy != 0.0)
        ? std::abs((total - initialEnergy) / initialEnergy) * 100.0
        : 0.0;

    std::cout << "\n--------------------------------------------------\n";
    std::cout << std::scientific << std::setprecision(6);
    std::cout << "  Kinetic Energy   : " << ke << " J\n";
    std::cout << "  Potential Energy : " << pe << " J\n";
    std::cout << "  Total Energy     : " << total << " J\n";
    std::cout << "  Initial Energy   : " << initialEnergy << " J\n";
    std::cout << std::fixed << std::setprecision(4);
    std::cout << "  Energy drift     : " << drift << " %\n";

    const auto& log = sim.getCollisionLog();
    if (!log.empty()) {
        std::cout << "\n  Collision events (" << log.size() << "):\n";
        for (const auto& entry : log) {
            std::cout << "    " << entry << "\n";
        }
    }
    std::cout << "--------------------------------------------------\n";
}

void runSimulation(Simulation& sim, int steps, bool render, int frameEvery, double delaySeconds) {
    Renderer renderer;

    sim.computeAccelerations();
    const double initialEnergy = sim.totalEnergy();

    std::cout << "\nStarting simulation: " << sim.getBodies().size()
              << " bodies, dt=" << sim.getDt() << "s, steps=" << steps << "\n";
    if (!render) {
        std::cout << "(headless mode)\n";
    }

    for (int step = 0; step < steps && !g_interrupted; ++step) {
        sim.step();

        if (render && (step % frameEvery == 0)) {
            renderer.render(sim.getBodies(), sim.getTimeElapsed(), sim.totalEnergy(), sim.getCollisionLog());
            std::this_thread::sleep_for(std::chrono::duration<double>(delaySeconds));
        }

        if (sim.getBodies().empty()) {
            std::cout << "All bodies merged.\n";
            break;
        }
    }

    if (g_interrupted) {
        std::cout << "\nInterrupted by user.\n";
    }

    printEnergyReport(sim, initialEnergy);
}

int main(int argc, char** argv) {
    std::signal(SIGINT, handleSigInt);

    try {
        const CliOptions opts = parseArgs(argc, argv);

        Simulation sim;

        if (opts.file.has_value()) {
            sim = ConfigLoader::loadScenario(*opts.file);
        } else {
            std::string scenarioName;

            if (opts.scenario.has_value()) {
                scenarioName = *opts.scenario;
            } else {
                const std::string choice = interactiveScenarioChoice();
                if (choice == "__file__") {
                    std::cout << "Path to JSON file: ";
                    std::string path;
                    std::cin >> path;
                    sim = ConfigLoader::loadScenario(path);
                } else {
                    scenarioName = choice;
                }
            }

            if (!scenarioName.empty()) {
                const auto& reg = Scenarios::registry();
                const auto it = reg.find(scenarioName);
                if (it == reg.end()) {
                    throw std::runtime_error("Unknown scenario: " + scenarioName);
                }

                double dt = opts.dt.value_or(3600.0);
                if (scenarioName == "figure_eight" && !opts.dt.has_value()) {
                    dt = 10.0;
                }
                sim = it->second.second(dt);
            }
        }

        if (opts.dt.has_value()) {
            sim.setDt(*opts.dt);
        }

        runSimulation(sim, opts.steps, !opts.noRender, opts.frameEvery, opts.delay);
        return 0;
    } catch (const std::exception& ex) {
        std::cerr << "Error: " << ex.what() << "\n";
        return 1;
    }
}
