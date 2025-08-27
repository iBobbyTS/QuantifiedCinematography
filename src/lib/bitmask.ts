// Generic bitmask utility functions
export class Bitmask {
  /**
   * Check if a specific bit is set
   * @param value The bitmask value
   * @param bit The bit position (0-based)
   * @returns true if the bit is set, false otherwise
   */
  static hasBit(value: number, bit: number): boolean {
    return (value & (1 << bit)) !== 0;
  }

  /**
   * Set a specific bit
   * @param value The current bitmask value
   * @param bit The bit position (0-based)
   * @returns The new bitmask value with the bit set
   */
  static setBit(value: number, bit: number): number {
    return value | (1 << bit);
  }

  /**
   * Clear a specific bit
   * @param value The current bitmask value
   * @param bit The bit position (0-based)
   * @returns The new bitmask value with the bit cleared
   */
  static clearBit(value: number, bit: number): number {
    return value & ~(1 << bit);
  }

  /**
   * Toggle a specific bit
   * @param value The current bitmask value
   * @param bit The bit position (0-based)
   * @returns The new bitmask value with the bit toggled
   */
  static toggleBit(value: number, bit: number): number {
    return value ^ (1 << bit);
  }

  /**
   * Get all set bits as an array of positions
   * @param value The bitmask value
   * @returns Array of bit positions that are set
   */
  static getSetBits(value: number): number[] {
    const setBits: number[] = [];
    for (let i = 0; i < 32; i++) {
      if (this.hasBit(value, i)) {
        setBits.push(i);
      }
    }
    return setBits;
  }

  /**
   * Count the number of set bits
   * @param value The bitmask value
   * @returns The count of set bits
   */
  static countBits(value: number): number {
    let count = 0;
    for (let i = 0; i < 32; i++) {
      if (this.hasBit(value, i)) {
        count++;
      }
    }
    return count;
  }
}

// User permission bitmask constants
export const USER_PERMISSIONS = {
  LIGHT: 1 << 0,      // 0000000000000000000000000001 (bit 0)
  CAMERA: 1 << 1,     // 0000000000000000000000000010 (bit 1)
  LENS: 1 << 2,       // 0000000000000000000000000100 (bit 2)
} as const;

export type UserPermission = typeof USER_PERMISSIONS[keyof typeof USER_PERMISSIONS];

// User permission utility functions
export class UserPermissions {
  /**
   * Check if user has a specific permission
   */
  static hasPermission(userPermission: number, permission: UserPermission): boolean {
    return Bitmask.hasBit(userPermission, Math.log2(permission));
  }

  /**
   * Check if user has light permission
   */
  static hasLightPermission(userPermission: number): boolean {
    return this.hasPermission(userPermission, USER_PERMISSIONS.LIGHT);
  }

  /**
   * Check if user has camera permission
   */
  static hasCameraPermission(userPermission: number): boolean {
    return this.hasPermission(userPermission, USER_PERMISSIONS.CAMERA);
  }

  /**
   * Check if user has lens permission
   */
  static hasLensPermission(userPermission: number): boolean {
    return this.hasPermission(userPermission, USER_PERMISSIONS.LENS);
  }

  /**
   * Add a permission to user
   */
  static addPermission(userPermission: number, permission: UserPermission): number {
    return Bitmask.setBit(userPermission, Math.log2(permission));
  }

  /**
   * Remove a permission from user
   */
  static removePermission(userPermission: number, permission: UserPermission): number {
    return Bitmask.clearBit(userPermission, Math.log2(permission));
  }

  /**
   * Get all permissions as an array
   */
  static getPermissions(userPermission: number): UserPermission[] {
    const setBits = Bitmask.getSetBits(userPermission);
    return setBits
      .map(bit => 1 << bit)
      .filter(permission => Object.values(USER_PERMISSIONS).includes(permission as UserPermission)) as UserPermission[];
  }

  /**
   * Get permission names as an array
   */
  static getPermissionNames(userPermission: number): string[] {
    const permissions = this.getPermissions(userPermission);
    const permissionNames: string[] = [];
    
    if (this.hasLightPermission(userPermission)) permissionNames.push('Light');
    if (this.hasCameraPermission(userPermission)) permissionNames.push('Camera');
    if (this.hasLensPermission(userPermission)) permissionNames.push('Lens');
    
    return permissionNames;
  }
}

// Product light modes bitmask constants
export const LIGHT_MODES = {
  TUNGSTEN_MODE: 1 << 0,    // 0000000000000000000000000001 (bit 0)
  DAYLIGHT_MODE: 1 << 1,    // 0000000000000000000000000010 (bit 1)
  S_CURVE: 1 << 2,          // 0000000000000000000000000100 (bit 2)
  LOG_CURVE: 1 << 3,        // 0000000000000000000000001000 (bit 3)
  EXP_CURVE: 1 << 4,        // 0000000000000000000000010000 (bit 4)
  DIM_0_1: 1 << 5,          // 0000000000000000000000100000 (bit 5)
  SILENT_MODE: 1 << 6,      // 0000000000000000000001000000 (bit 6)
} as const;

export type LightMode = typeof LIGHT_MODES[keyof typeof LIGHT_MODES];

// Product light modes utility functions
export class LightModes {
  /**
   * Check if a specific mode is available
   */
  static hasMode(modesAvailable: number, mode: LightMode): boolean {
    return Bitmask.hasBit(modesAvailable, Math.log2(mode));
  }

  /**
   * Check if tungsten mode is available
   */
  static hasTungstenMode(modesAvailable: number): boolean {
    return this.hasMode(modesAvailable, LIGHT_MODES.TUNGSTEN_MODE);
  }

  /**
   * Check if daylight mode is available
   */
  static hasDaylightMode(modesAvailable: number): boolean {
    return this.hasMode(modesAvailable, LIGHT_MODES.DAYLIGHT_MODE);
  }

  /**
   * Check if S-curve is available
   */
  static hasSCurve(modesAvailable: number): boolean {
    return this.hasMode(modesAvailable, LIGHT_MODES.S_CURVE);
  }

  /**
   * Check if log curve is available
   */
  static hasLogCurve(modesAvailable: number): boolean {
    return this.hasMode(modesAvailable, LIGHT_MODES.LOG_CURVE);
  }

  /**
   * Check if exp curve is available
   */
  static hasExpCurve(modesAvailable: number): boolean {
    return this.hasMode(modesAvailable, LIGHT_MODES.EXP_CURVE);
  }

  /**
   * Check if 0.1% dimming is available
   */
  static hasDim01(modesAvailable: number): boolean {
    return this.hasMode(modesAvailable, LIGHT_MODES.DIM_0_1);
  }

  /**
   * Check if silent mode is available
   */
  static hasSilentMode(modesAvailable: number): boolean {
    return this.hasMode(modesAvailable, LIGHT_MODES.SILENT_MODE);
  }

  /**
   * Add a mode to available modes
   */
  static addMode(modesAvailable: number, mode: LightMode): number {
    return Bitmask.setBit(modesAvailable, Math.log2(mode));
  }

  /**
   * Remove a mode from available modes
   */
  static removeMode(modesAvailable: number, mode: LightMode): number {
    return Bitmask.clearBit(modesAvailable, Math.log2(mode));
  }

  /**
   * Get all available modes as an array
   */
  static getModes(modesAvailable: number): LightMode[] {
    const setBits = Bitmask.getSetBits(modesAvailable);
    return setBits
      .map(bit => 1 << bit)
      .filter(mode => Object.values(LIGHT_MODES).includes(mode as LightMode)) as LightMode[];
  }

  /**
   * Get mode names as an array
   */
  static getModeNames(modesAvailable: number): string[] {
    const modes = this.getModes(modesAvailable);
    const modeNames: string[] = [];
    
    if (this.hasTungstenMode(modesAvailable)) modeNames.push('Tungsten Mode');
    if (this.hasDaylightMode(modesAvailable)) modeNames.push('Daylight Mode');
    if (this.hasSCurve(modesAvailable)) modeNames.push('S-Curve');
    if (this.hasLogCurve(modesAvailable)) modeNames.push('Log Curve');
    if (this.hasExpCurve(modesAvailable)) modeNames.push('Exp Curve');
    if (this.hasDim01(modesAvailable)) modeNames.push('0.1% Dimming');
    if (this.hasSilentMode(modesAvailable)) modeNames.push('Silent Mode');
    
    return modeNames;
  }
}
