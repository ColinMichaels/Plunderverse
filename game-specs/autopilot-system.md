# Autopilot & Flight System Design Document

## Overview

This document describes the architecture, behavior, and guidelines for the Autopilot + Flight System in our space game.
Its purpose is to serve as a design reference and roadmap for implementation and future improvements.

### Vision / Goals

- Deliver a flight experience that feels **alive, responsive, and expressive** (not rigid or “on rails”).
- Autopilot should reduce tedious navigation, while preserving player agency and allowing override at any time.
- Smooth transitions between manual control and autopilot, and between autopilot modes.
- Safe, robust behavior: avoid collisions, handle edge cases, and degrade gracefully.
- Modular design so new features (e.g. advanced maneuvers, complex pathfinding, dynamic obstacles) can plug in.

### Constraints & Trade-offs

- Must run efficiently (real-time) — guidance / planning should not be too heavy.
- Depending on design style, approximations (e.g. simplified gravity, damped inertia) may be acceptable over full
  physical realism.
- Autopilot should be predictable and transparent, not opaque or “magical.”
- Must handle edge cases (low fuel, sudden obstacles, rapidly changing environment).

---

## System Architecture & Modules

Each module has a distinct responsibility. Together they form the autopilot + flight system.

| Module                                     | Responsibility                                                                                                                                                           | Key Inputs                                                             | Key Outputs / Actions                                                                |
|--------------------------------------------|--------------------------------------------------------------------------------------------------------------------------------------------------------------------------|------------------------------------------------------------------------|--------------------------------------------------------------------------------------|
| **Input Processor**                        | Map raw player input (keyboard, mouse, gamepad) into normalized control intents (thrust vector, rotation intent) with response curves, dead zones, scaling               | Raw input, tuning parameters                                           | Desired control intents (e.g. a rotational “steer vector,” thrust magnitude request) |
| **Attitude / Rotation Controller**         | Drive the ship’s orientation (turning, pointing) toward a desired orientation / direction using torque or thruster activation, with damping assistance                   | Current orientation, angular velocity, desired orientation / direction | Torque / thruster commands for rotation                                              |
| **Thrust / Propulsion Controller**         | Decide how much thrust (forward, reverse, lateral) to apply to track a desired velocity profile, compensating for gravity or drag                                        | Current velocity, desired velocity vector, external forces             | Thrust commands / vector (magnitude + direction)                                     |
| **Guidance / Path Planner**                | Compute a trajectory (or set of waypoints / path) from current position to target, considering constraints (gravity, obstacles), and produce a speed / velocity schedule | Current position / velocity, target, environment (gravity, obstacles)  | Trajectory plan (path + speed profile + optional burn points)                        |
| **Autopilot State Machine / Mode Manager** | Manage autopilot modes (e.g. transit, approach, orbit insertion) and transitions between them                                                                            | Commands (activate, cancel), current state, environment conditions     | Active mode, triggers for transitions, mode initialization                           |
| **Collision / Obstacle Avoider**           | Monitor the planned path and ship’s surroundings; detect potential collisions or unsafe segments and adjust guidance or halt autopilot                                   | Environment geometry, planned path, ship bounding volume               | Adjusted guidance, safe-stop commands, path replan triggers                          |
| **Override / Blend Manager**               | Blend or override autopilot outputs based on player input (steering, braking) — allow “nudge” or full take-over                                                          | Autopilot output commands, player input, override thresholds           | Final control commands (thrust, torque)                                              |
| **Feedback / UI / Visualization**          | Render path previews, target markers, warnings, autopilot state indicators; trigger audio / camera cues                                                                  | Autopilot internal state, path plan, proximity / error metrics         | UI overlays, alerts, camera effects, audio cues                                      |

---

## Autopilot Modes / Phases

Autopilot operates in discrete modes (or phases) for different flight contexts. Transitions happen when appropriate
conditions are met, with smoothing and continuity.

**Suggested Modes / Phases:**

1. **IDLE / Standby**
    - Autopilot inactive or waiting.
    - Manual control only.

2. **Transit / Cruise Mode**
    - For long-distance travel in relatively empty space.
    - Autopilot handles coarse trajectory, possibly with coasting segments.

3. **Approach Mode**
    - As the ship nears the target (planet, station, ship).
    - Braking, velocity matching, cautious maneuvers.

4. **Orbit Insertion / Capture**
    - Special mode when entering orbit around a celestial body.
    - Includes planned burns (injection, adjustment, circularization) and transitions.

5. **Orbit Hold / Stationkeeping**
    - Maintain orbit, with small corrections to counter drift or perturbations.

6. **Landing / Docking Assistance**
    - Near-surface or docking maneuvers: fine control, alignment, slope / terrain compensation.

7. **Emergency / Safe Stop**
    - Abort autopilot, slow to safe velocity, or hold position.
    - Triggered by low fuel, collision threat, or manual override.

Transitions should be guarded and smoothed (e.g. fade control, don’t snap).

---

## Control Loop & Data Flow (Per Frame / Tick)

Here is a high-level sketch of how components interact in each update:

1. **State Sampling**
    - Read ship state: position, velocity, orientation, angular velocity
    - Read environment: gravity vectors, obstacles

2. **Mode Logic / State Machine**
    - Decide whether to remain in or switch autopilot mode
    - On mode entry, initialize state (e.g. reset progress, compute plan)

3. **Guidance / Path Planning**
    - If in autopilot, compute or update a path / trajectory plan
    - Replan if needed (obstacles change)
    - Sample plan to produce desired instantaneous velocity vector & direction

4. **Orientation Targeting**
    - Determine a desired orientation (e.g. face along path, or face target) from the sampled direction

5. **Rotation / Attitude Control**
    - Compute torque / rotational commands to align orientation, with damping or stabilization

6. **Thrust / Propulsion Control**
    - Compute thrust magnitude and direction to follow desired velocity, compensating for gravity or external forces

7. **Override / Input Blending**
    - Detect player input that should override or nudge autopilot
    - Blend autopilot vs player commands smoothly, rather than snapping

8. **Apply Commands**
    - Send final torque & thrust commands to the ship’s physics or movement system

9. **Feedback / UI**
    - Update visualization: path previews, markers, status
    - Trigger audio / camera cues (autopilot on/off, approaching target, braking start)

10. **Progress / Monitoring**
    - Update progress within the current mode
    - Check abort conditions (fuel, collision, override)
    - Log or collect metrics (overshoot, tracking error) for tuning

---

## Behavioral Guidelines & Tuning Principles

To maintain good “feel” and robustness:

- **Use easing & interpolation**  
  When transitioning thrust, control, modes, or blending input, use smoothing (e.g. cubic, ease-in/out) to avoid abrupt
  jumps.

- **Anticipatory braking**  
  Compute stopping distance and plan to begin deceleration early so as not to overshoot.

- **Gravity / external force compensation**  
  In gravitational fields, adjust thrust to counter those forces or exploit coast arcs where beneficial.

- **Collision / obstacle safety**  
  Always evaluate the planned path (with margin) for collisions; replan or abort early if needed.

- **Player override & nudge**  
  Player inputs should always be able to override or tweak autopilot behavior (full take-over or gentle adjustments).

- **State continuity & smoothness**  
  Preserve continuity in velocity and orientation when switching modes — avoid snapping.

- **Transparency & feedback**  
  Visualize planned paths, braking points, velocity vectors, and autopilot mode names. Provide alerts / cues so the
  player understands what the autopilot is doing.

- **Fail-safes & fallback**  
  If autopilot fails (no safe path, insufficient resources), fall back to safe-stop mode and hand control to the player
  with clear notification.

- **Adjustable assist vs realism**  
  Decide on how much autopilot helps (auto-stabilization, damping, correction), and optionally expose modes (e.g.
  “assist mode” / “manual mode”) to tune for different player preferences.

- **Resource awareness**  
  Autopilot should consider available resources (fuel, energy) and avoid unsafe maneuvers when resources are
  constrained.

- **Performance & cost control**  
  Guidance, path planning, and replan triggers should be efficient, incremental, and avoid heavy computation each frame.
  Use thresholds, look-ahead windows, and caching.

---

## Example Scenario: Orbit Insertion Walkthrough

Here’s how modules might cooperate when executing an orbit insertion:

1. **Activate Autopilot**  
   Player sets target to a planet. The system determines it's within approach threshold and enters `APPROACH` mode.

2. **Approach Phase**  
   Guidance planner computes approach vector, deceleration burn point, and path.  
   Rotation controller begins orienting the ship toward the approach direction; thrust controller performs braking while
   compensating for gravity.

3. **Switch to Orbit Insertion**  
   Within defined thresholds (distance / speed), system transitions to `ORBIT_INSERT`.  
   A new plan is generated for injection and circularization burns (tangential burns, altitude adjustments).

4. **Execute Burns & Adjustments**  
   Follow plan, monitor orbital parameters, make fine corrections. Use easing to ramp thrust/rotation transitions.

5. **Achieve Orbit**  
   Once orbital criteria are satisfied (velocity, altitude, stability), switch to `ORBIT_HOLD`.  
   In `ORBIT_HOLD` mode, apply small corrections for stationkeeping.

6. **Override / Exit**  
   Player can at any time cancel autopilot or take control. The system transitions smoothly, handing control back to
   player.

---

## Metrics & Testing Targets

To ensure good tuning and feel, measure & test these:

- **Overshoot**: how far past the target before braking ends
- **Time-to-target**: actual vs ideal travel duration
- **Tracking / path error**: deviation between actual and planned path
- **Smoothness / jerk**: limit abrupt changes in acceleration or torque
- **Responsiveness**: speed with which player override affects control
- **Abort / failure rate**: how often autopilot must abort or enters failure mode
- **Edge case robustness**: test under high speeds, dense obstacles, strong gravity, low fuel, sudden environmental
  changes

Use scenario-based tests (straight-line, curved approach, obstacle-laden paths, gravity assist) and iterate tuning based
on observed metrics.

---

## References & Influences

- **Star Citizen – IFCS (Intelligent Flight Control System)**: adapts pilot input into thruster operations and uses
  feedback control logic.
- **Community discussions on spaceship control & autopilot**: techniques combining quaternions, thruster distribution,
  and predictive control.
- **Design tradeoffs in space simulators**: many games choose to abstract or assist orbital and drift mechanics for
  usability.

---

*End of Document*  
