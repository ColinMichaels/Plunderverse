import {create} from "zustand";
import * as THREE from "three";
import {useLandedState} from "@/lib/stores";

/** Easing for smooth speed curves */
const easeInOutCubic = (t: number): number => {
    return t < 0.5
        ? 4 * t * t * t
        : 1 - Math.pow(-2 * t + 2, 3) / 2;
};

/** Autopilot modes */
enum AutopilotMode {
    IDLE = "idle",
    CINEMATIC = "cinematic",
    // (You can add APPROACH, ORBIT, etc. later)
}

/** The simple plan for cinematic path + speed profile */
interface CinematicPlan {
    path: THREE.Vector3[];
    speedProfile: number[];   // normalized: 0 → 1 → 0
    totalLength: number;
}

/** Ship / environment / input types (adapt as needed) */
interface ShipState {
    position: THREE.Vector3;
    velocity: THREE.Vector3;
    orientation: THREE.Quaternion;
    angularVelocity: THREE.Vector3;
}

interface EnvironmentState {
    getGravityAt: (pos: THREE.Vector3) => THREE.Vector3;
}

interface PlayerInput {
    thrustInput: number;         // e.g. 0 .. 1 or -1 .. 1
    torqueInput: THREE.Vector3;  // directional control input (if override)
}

interface AutopilotState {
    isActive: boolean;
    mode: AutopilotMode;
    target: THREE.Vector3 | null;

    cinematicPlan: CinematicPlan | null;
    traveledDistance: number;

    activateCinematic: (target: THREE.Vector3) => void;
    deactivate: () => void;
    tick: (
        dt: number,
        ship: ShipState,
        env: EnvironmentState,
        playerInput: PlayerInput
    ) => void;

    makeCinematicPlan: (
        start: THREE.Vector3,
        target: THREE.Vector3
    ) => CinematicPlan;
}

export const useAutopilot = create<AutopilotState>((set, get) => ({
    isActive: false,
    mode: AutopilotMode.IDLE,
    target: null,
    cinematicPlan: null,
    traveledDistance: 0,

    activateCinematic: (target) => {
        const landed = useLandedState.getState();
        if (landed.isLanded) {
            console.warn("Cannot activate autopilot while landed");
            return;
        }
        set({
            isActive: true,
            mode: AutopilotMode.CINEMATIC,
            target: target.clone(),
            cinematicPlan: null,
            traveledDistance: 0,
        });
        console.log("Autopilot: entering cinematic mode");
    },

    deactivate: () => {
        set({
            isActive: false,
            mode: AutopilotMode.IDLE,
            target: null,
            cinematicPlan: null,
            traveledDistance: 0,
        });
        console.log("Autopilot deactivated");
    },

    makeCinematicPlan: (start, target) => {
        const numSegments = 50;
        const path: THREE.Vector3[] = [];
        for (let i = 0; i <= numSegments; i++) {
            const t = i / numSegments;
            const p = new THREE.Vector3().lerpVectors(start, target, t);
            path.push(p);
        }
        // compute total length
        let total = 0;
        for (let i = 1; i < path.length; i++) {
            total += path[i].distanceTo(path[i - 1]);
        }
        const speedProfile: number[] = [];
        for (let i = 0; i <= numSegments; i++) {
            const t = i / numSegments;
            speedProfile.push(easeInOutCubic(t));
        }
        return {path, speedProfile, totalLength: total};
    },

    tick: (dt, ship, env, playerInput) => {
        const state = get();

        if (
            !state.isActive ||
            state.mode !== AutopilotMode.CINEMATIC ||
            !state.target
        ) {
            return;
        }

        let plan = state.cinematicPlan;
        if (!plan) {
            plan = get().makeCinematicPlan(ship.position, state.target);
            set({cinematicPlan: plan});
        }

        const {desiredDir, desiredSpeedNorm} = sampleCinematic(
            plan,
            state.traveledDistance
        );

        const maxSpeed = 10; // tune per your ship
        const desiredSpeed = desiredSpeedNorm * maxSpeed;

        const velErr = desiredDir
            .clone()
            .multiplyScalar(desiredSpeed)
            .sub(ship.velocity);

        // Thrust command (proportional)
        const Kp_thrust = 1.0;
        const thrustCmd = velErr.length() * Kp_thrust;

        // Orientation: face direction
        const desiredOri = orientationFromDirection(desiredDir);
        const torqueCmd = computeRotationTorque(
            ship.orientation,
            ship.angularVelocity,
            desiredOri
        );

        // Apply torque & thrust (hook into your physics / ship system)
        applyTorqueToShip(torqueCmd);
        applyThrustToShip(thrustCmd);

        // Advance traveled distance
        const deltaDist = ship.velocity.length() * dt;
        const newTraveled = state.traveledDistance + deltaDist;
        set({traveledDistance: newTraveled});

        // Check for arrival
        if (newTraveled >= plan.totalLength) {
            console.log("Autopilot: reached destination");
            get().deactivate();
        }
    },
}));

// Lazy subscription setup to avoid circular dependency
let landingSubscriptionInitialized = false;
function initializeLandingSubscription() {
  if (landingSubscriptionInitialized) return;
  landingSubscriptionInitialized = true;
  
  // Subscribe to landing state changes to automatically deactivate autopilot when landing
  useLandedState.subscribe((state, prevState) => {
    // If we just landed, deactivate autopilot
    if (state.isLanded && !prevState?.isLanded) {
      const autopilotState = useAutopilot.getState();
      if (autopilotState.isActive) {
        console.log('[AUTOPILOT] Auto-deactivating due to landing on', state.landedPlanet);
        autopilotState.deactivate();
      }
    }
  });
}

// Initialize subscription after a brief delay to ensure all stores are loaded
if (typeof window !== 'undefined') {
  setTimeout(initializeLandingSubscription, 100);
}

/** Sample the cinematic plan at a given traveled distance */
function sampleCinematic(
    plan: CinematicPlan,
    traveled: number
): { desiredDir: THREE.Vector3; desiredSpeedNorm: number } {
    const pts = plan.path;
    const prof = plan.speedProfile;

    let accum = 0;
    let segIndex = 0;
    for (let i = 1; i < pts.length; i++) {
        const d = pts[i].distanceTo(pts[i - 1]);
        if (accum + d >= traveled) {
            segIndex = i - 1;
            break;
        }
        accum += d;
    }

    const start = pts[segIndex];
    const end = pts[segIndex + 1];
    const segLen = start.distanceTo(end);
    const rem = traveled - accum;
    const t = segLen > 0 ? rem / segLen : 0;

    const dir = end.clone().sub(start).normalize();
    const speedNorm = THREE.MathUtils.lerp(
        prof[segIndex],
        prof[segIndex + 1],
        t
    );

    return {desiredDir: dir, desiredSpeedNorm: speedNorm};
}

/** Compute orientation quaternion from a direction vector */
function orientationFromDirection(dir: THREE.Vector3): THREE.Quaternion {
    const q = new THREE.Quaternion();
    const forward = new THREE.Vector3(0, 0, 1);
    if (dir.lengthSq() < 1e-6) {
        return q.identity();
    }
    q.setFromUnitVectors(forward, dir.clone().normalize());
    return q;
}

/** PD torque to rotate from current orientation toward desired orientation */
function computeRotationTorque(
    currentOri: THREE.Quaternion,
    angularVel: THREE.Vector3,
    desiredOri: THREE.Quaternion
): THREE.Vector3 {
    // Quaternion error → axis-angle
    const qErr = desiredOri.clone().multiply(currentOri.clone().invert());
    let angle = 2 * Math.acos(
        THREE.MathUtils.clamp(qErr.w, -1, 1)
    );
    const axis = new THREE.Vector3(qErr.x, qErr.y, qErr.z);
    if (axis.lengthSq() < 1e-6) {
        return new THREE.Vector3(0, 0, 0);
    }
    axis.normalize();

    if (angle > Math.PI) {
        angle = 2 * Math.PI - angle;
        axis.negate();
    }

    const Kp_rot = 10;
    const Kd_rot = 5;

    const torqueP = axis.clone().multiplyScalar(Kp_rot * angle);
    const torqueD = angularVel.clone().multiplyScalar(-Kd_rot);
    return torqueP.add(torqueD);
}

/** Hook these into your ship / physics system below */

function applyTorqueToShip(torque: THREE.Vector3) {
    // TODO: integrate with your physics / ship control interface
}

function applyThrustToShip(thrust: number) {
    // TODO: integrate with your engine's thrust control / force application
}
