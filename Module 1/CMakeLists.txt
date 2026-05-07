cmake_minimum_required(VERSION 3.16)
project(nbody_simulator_cpp LANGUAGES CXX)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_CXX_EXTENSIONS OFF)

add_executable(nbody
    main.cpp
    Simulation.cpp
    Renderer.cpp
    Scenarios.cpp
    ConfigLoader.cpp
)
