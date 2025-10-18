import * as THREE from "three";

export interface SpatialObject {
    id: string;
    position: THREE.Vector3;
    radius: number;
    type: string;

    [key: string]: any;
}

/**
 * Spatial Grid for efficient collision detection
 * Divides space into cells and only checks nearby objects
 */
export class SpatialGrid<T extends SpatialObject> {
    private grid: Map<string, T[]> = new Map();
    private cellSize: number;
    private objectCells: Map<string, string> = new Map(); // Track which cell each object is in

    constructor(cellSize: number = 10) {
        this.cellSize = cellSize;
    }

    /**
     * Get cell key for a position
     */
    private getCellKey(x: number, z: number): string {
        const cellX = Math.floor(x / this.cellSize);
        const cellZ = Math.floor(z / this.cellSize);
        return `${cellX},${cellZ}`;
    }

    /**
     * Insert object into spatial grid
     */
    insert(obj: T): void {
        const key = this.getCellKey(obj.position.x, obj.position.z);

        // Remove from old cell if it exists
        this.remove(obj.id);

        // Add to new cell
        if (!this.grid.has(key)) {
            this.grid.set(key, []);
        }
        this.grid.get(key)!.push(obj);
        this.objectCells.set(obj.id, key);
    }

    /**
     * Remove object from spatial grid
     */
    remove(id: string): void {
        const oldKey = this.objectCells.get(id);
        if (oldKey) {
            const cell = this.grid.get(oldKey);
            if (cell) {
                const index = cell.findIndex(obj => obj.id === id);
                if (index !== -1) {
                    cell.splice(index, 1);
                }
                if (cell.length === 0) {
                    this.grid.delete(oldKey);
                }
            }
            this.objectCells.delete(id);
        }
    }

    /**
     * Get objects near a position within a radius
     */
    getNearby(position: THREE.Vector3, radius: number): T[] {
        const nearby: T[] = [];
        const cellRadius = Math.ceil(radius / this.cellSize);

        const centerX = Math.floor(position.x / this.cellSize);
        const centerZ = Math.floor(position.z / this.cellSize);

        // Check surrounding cells
        for (let dx = -cellRadius; dx <= cellRadius; dx++) {
            for (let dz = -cellRadius; dz <= cellRadius; dz++) {
                const key = `${centerX + dx},${centerZ + dz}`;
                const cell = this.grid.get(key);
                if (cell) {
                    nearby.push(...cell);
                }
            }
        }

        return nearby;
    }

    /**
     * Find nearest collision with a sphere
     */
    findNearestCollision(
        position: THREE.Vector3,
        playerRadius: number,
        maxDistance: number = Infinity
    ): T | null {
        const nearby = this.getNearby(position, playerRadius + maxDistance);

        let nearestObj: T | null = null;
        let nearestDistance = Infinity;

        for (const obj of nearby) {
            const distance = position.distanceTo(obj.position);
            const collisionDistance = playerRadius + obj.radius;

            if (distance < collisionDistance && distance < nearestDistance) {
                nearestObj = obj;
                nearestDistance = distance;
            }
        }

        return nearestObj;
    }

    /**
     * Check if position collides with any object
     */
    checkCollision(position: THREE.Vector3, playerRadius: number): T | null {
        const nearby = this.getNearby(position, playerRadius + 10); // Check within reasonable range

        for (const obj of nearby) {
            const distance = position.distanceTo(obj.position);
            const collisionDistance = playerRadius + obj.radius;

            if (distance < collisionDistance) {
                return obj;
            }
        }

        return null;
    }

    /**
     * Get all objects of a specific type
     */
    getByType(type: string): T[] {
        const results: T[] = [];
        for (const cell of this.grid.values()) {
            results.push(...cell.filter(obj => obj.type === type));
        }
        return results;
    }

    /**
     * Clear all objects
     */
    clear(): void {
        this.grid.clear();
        this.objectCells.clear();
    }

    /**
     * Get total object count
     */
    size(): number {
        return this.objectCells.size;
    }
}
