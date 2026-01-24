import type { Vector3Like, QuaternionLike, ColorLike } from '../interfaces/RenderingEngine';

export class Vec3 implements Vector3Like {
  constructor(
    public x: number = 0,
    public y: number = 0,
    public z: number = 0
  ) {}

  static zero(): Vec3 {
    return new Vec3(0, 0, 0);
  }

  static one(): Vec3 {
    return new Vec3(1, 1, 1);
  }

  static up(): Vec3 {
    return new Vec3(0, 1, 0);
  }

  static forward(): Vec3 {
    return new Vec3(0, 0, 1);
  }

  static right(): Vec3 {
    return new Vec3(1, 0, 0);
  }

  clone(): Vec3 {
    return new Vec3(this.x, this.y, this.z);
  }

  add(v: Vector3Like): Vec3 {
    return new Vec3(this.x + v.x, this.y + v.y, this.z + v.z);
  }

  subtract(v: Vector3Like): Vec3 {
    return new Vec3(this.x - v.x, this.y - v.y, this.z - v.z);
  }

  multiply(scalar: number): Vec3 {
    return new Vec3(this.x * scalar, this.y * scalar, this.z * scalar);
  }

  divide(scalar: number): Vec3 {
    return new Vec3(this.x / scalar, this.y / scalar, this.z / scalar);
  }

  dot(v: Vector3Like): number {
    return this.x * v.x + this.y * v.y + this.z * v.z;
  }

  cross(v: Vector3Like): Vec3 {
    return new Vec3(
      this.y * v.z - this.z * v.y,
      this.z * v.x - this.x * v.z,
      this.x * v.y - this.y * v.x
    );
  }

  length(): number {
    return Math.sqrt(this.x * this.x + this.y * this.y + this.z * this.z);
  }

  lengthSquared(): number {
    return this.x * this.x + this.y * this.y + this.z * this.z;
  }

  normalize(): Vec3 {
    const len = this.length();
    if (len === 0) return new Vec3(0, 0, 0);
    return this.divide(len);
  }

  distanceTo(v: Vector3Like): number {
    return this.subtract(v).length();
  }

  lerp(v: Vector3Like, t: number): Vec3 {
    return new Vec3(
      this.x + (v.x - this.x) * t,
      this.y + (v.y - this.y) * t,
      this.z + (v.z - this.z) * t
    );
  }

  toArray(): [number, number, number] {
    return [this.x, this.y, this.z];
  }

  static fromArray(arr: [number, number, number]): Vec3 {
    return new Vec3(arr[0], arr[1], arr[2]);
  }
}

export class Quat implements QuaternionLike {
  constructor(
    public x: number = 0,
    public y: number = 0,
    public z: number = 0,
    public w: number = 1
  ) {}

  static identity(): Quat {
    return new Quat(0, 0, 0, 1);
  }

  static fromEuler(x: number, y: number, z: number): Quat {
    const c1 = Math.cos(x / 2);
    const c2 = Math.cos(y / 2);
    const c3 = Math.cos(z / 2);
    const s1 = Math.sin(x / 2);
    const s2 = Math.sin(y / 2);
    const s3 = Math.sin(z / 2);

    return new Quat(
      s1 * c2 * c3 + c1 * s2 * s3,
      c1 * s2 * c3 - s1 * c2 * s3,
      c1 * c2 * s3 + s1 * s2 * c3,
      c1 * c2 * c3 - s1 * s2 * s3
    );
  }

  toEuler(): Vec3 {
    const sinr_cosp = 2 * (this.w * this.x + this.y * this.z);
    const cosr_cosp = 1 - 2 * (this.x * this.x + this.y * this.y);
    const roll = Math.atan2(sinr_cosp, cosr_cosp);

    const sinp = 2 * (this.w * this.y - this.z * this.x);
    let pitch: number;
    if (Math.abs(sinp) >= 1) {
      pitch = Math.sign(sinp) * Math.PI / 2;
    } else {
      pitch = Math.asin(sinp);
    }

    const siny_cosp = 2 * (this.w * this.z + this.x * this.y);
    const cosy_cosp = 1 - 2 * (this.y * this.y + this.z * this.z);
    const yaw = Math.atan2(siny_cosp, cosy_cosp);

    return new Vec3(roll, pitch, yaw);
  }

  clone(): Quat {
    return new Quat(this.x, this.y, this.z, this.w);
  }

  multiply(q: QuaternionLike): Quat {
    return new Quat(
      this.w * q.x + this.x * q.w + this.y * q.z - this.z * q.y,
      this.w * q.y - this.x * q.z + this.y * q.w + this.z * q.x,
      this.w * q.z + this.x * q.y - this.y * q.x + this.z * q.w,
      this.w * q.w - this.x * q.x - this.y * q.y - this.z * q.z
    );
  }

  normalize(): Quat {
    const len = Math.sqrt(this.x * this.x + this.y * this.y + this.z * this.z + this.w * this.w);
    if (len === 0) return Quat.identity();
    return new Quat(this.x / len, this.y / len, this.z / len, this.w / len);
  }

  slerp(q: QuaternionLike, t: number): Quat {
    let dot = this.x * q.x + this.y * q.y + this.z * q.z + this.w * q.w;
    
    const q2 = dot < 0 ? new Quat(-q.x, -q.y, -q.z, -q.w) : new Quat(q.x, q.y, q.z, q.w);
    dot = Math.abs(dot);

    if (dot > 0.9995) {
      return new Quat(
        this.x + t * (q2.x - this.x),
        this.y + t * (q2.y - this.y),
        this.z + t * (q2.z - this.z),
        this.w + t * (q2.w - this.w)
      ).normalize();
    }

    const theta0 = Math.acos(dot);
    const theta = theta0 * t;
    const sinTheta = Math.sin(theta);
    const sinTheta0 = Math.sin(theta0);
    const s0 = Math.cos(theta) - dot * sinTheta / sinTheta0;
    const s1 = sinTheta / sinTheta0;

    return new Quat(
      s0 * this.x + s1 * q2.x,
      s0 * this.y + s1 * q2.y,
      s0 * this.z + s1 * q2.z,
      s0 * this.w + s1 * q2.w
    );
  }

  toArray(): [number, number, number, number] {
    return [this.x, this.y, this.z, this.w];
  }
}

export class Color implements ColorLike {
  constructor(
    public r: number = 1,
    public g: number = 1,
    public b: number = 1,
    public a: number = 1
  ) {}

  static black(): Color {
    return new Color(0, 0, 0, 1);
  }

  static white(): Color {
    return new Color(1, 1, 1, 1);
  }

  static red(): Color {
    return new Color(1, 0, 0, 1);
  }

  static green(): Color {
    return new Color(0, 1, 0, 1);
  }

  static blue(): Color {
    return new Color(0, 0, 1, 1);
  }

  static fromHex(hex: string): Color {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    if (result) {
      return new Color(
        parseInt(result[1], 16) / 255,
        parseInt(result[2], 16) / 255,
        parseInt(result[3], 16) / 255,
        1
      );
    }
    return new Color(1, 1, 1, 1);
  }

  toHex(): string {
    const toHex = (n: number) => Math.round(n * 255).toString(16).padStart(2, '0');
    return `#${toHex(this.r)}${toHex(this.g)}${toHex(this.b)}`;
  }

  clone(): Color {
    return new Color(this.r, this.g, this.b, this.a);
  }

  lerp(c: ColorLike, t: number): Color {
    return new Color(
      this.r + (c.r - this.r) * t,
      this.g + (c.g - this.g) * t,
      this.b + (c.b - this.b) * t,
      this.a + ((c.a ?? 1) - this.a) * t
    );
  }

  toArray(): [number, number, number, number] {
    return [this.r, this.g, this.b, this.a];
  }
}

export const MathUtils = {
  degToRad(degrees: number): number {
    return degrees * (Math.PI / 180);
  },

  radToDeg(radians: number): number {
    return radians * (180 / Math.PI);
  },

  clamp(value: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, value));
  },

  lerp(start: number, end: number, t: number): number {
    return start + (end - start) * t;
  },

  smoothstep(edge0: number, edge1: number, x: number): number {
    const t = MathUtils.clamp((x - edge0) / (edge1 - edge0), 0, 1);
    return t * t * (3 - 2 * t);
  },

  randomRange(min: number, max: number): number {
    return min + Math.random() * (max - min);
  }
};
