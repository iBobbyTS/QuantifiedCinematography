// Examples of how to use the bitmask system
import { USER_PERMISSIONS, UserPermissions, LIGHT_MODES, LightModes } from './bitmask';

// ===== USER PERMISSIONS EXAMPLES =====

// Example 1: Create a user with multiple permissions
function createUserWithPermissions() {
  let userPermission = 0; // Start with no permissions
  
  // Add light permission
  userPermission = UserPermissions.addPermission(userPermission, USER_PERMISSIONS.LIGHT);
  // userPermission = 1 (0000000000000000000000000001)
  
  // Add camera permission
  userPermission = UserPermissions.addPermission(userPermission, USER_PERMISSIONS.CAMERA);
  // userPermission = 3 (0000000000000000000000000011)
  
  // Add lens permission
  userPermission = UserPermissions.addPermission(userPermission, USER_PERMISSIONS.LENS);
  // userPermission = 7 (0000000000000000000000000111)
  
  return userPermission;
}

// Example 2: Check user permissions
function checkUserPermissions(userPermission: number) {
  console.log('User has light permission:', UserPermissions.hasLightPermission(userPermission));
  console.log('User has camera permission:', UserPermissions.hasCameraPermission(userPermission));
  console.log('User has lens permission:', UserPermissions.hasLensPermission(userPermission));
  
  // Get all permission names
  const permissionNames = UserPermissions.getPermissionNames(userPermission);
  console.log('User permissions:', permissionNames);
}

// Example 3: Remove a permission
function removeUserPermission(userPermission: number, permissionToRemove: number) {
  return UserPermissions.removePermission(userPermission, permissionToRemove);
}

// ===== LIGHT MODES EXAMPLES =====

// Example 1: Create a light with multiple modes
function createLightWithModes() {
  let modesAvailable = 0; // Start with no modes
  
  // Add tungsten mode
  modesAvailable = LightModes.addMode(modesAvailable, LIGHT_MODES.TUNGSTEN_MODE);
  // modesAvailable = 1 (0000000000000000000000000001)
  
  // Add daylight mode
  modesAvailable = LightModes.addMode(modesAvailable, LIGHT_MODES.DAYLIGHT_MODE);
  // modesAvailable = 3 (0000000000000000000000000011)
  
  // Add S-curve
  modesAvailable = LightModes.addMode(modesAvailable, LIGHT_MODES.S_CURVE);
  // modesAvailable = 7 (0000000000000000000000000111)
  
  // Add log curve
  modesAvailable = LightModes.addMode(modesAvailable, LIGHT_MODES.LOG_CURVE);
  // modesAvailable = 15 (0000000000000000000000001111)
  
  // Add exp curve
  modesAvailable = LightModes.addMode(modesAvailable, LIGHT_MODES.EXP_CURVE);
  // modesAvailable = 31 (0000000000000000000000011111)
  
  // Add 0.1% dimming
  modesAvailable = LightModes.addMode(modesAvailable, LIGHT_MODES.DIM_0_1);
  // modesAvailable = 63 (0000000000000000000000111111)
  
  // Add silent mode
  modesAvailable = LightModes.addMode(modesAvailable, LIGHT_MODES.SILENT_MODE);
  // modesAvailable = 127 (0000000000000000000001111111)
  
  return modesAvailable;
}

// Example 2: Check light modes
function checkLightModes(modesAvailable: number) {
  console.log('Has tungsten mode:', LightModes.hasTungstenMode(modesAvailable));
  console.log('Has daylight mode:', LightModes.hasDaylightMode(modesAvailable));
  console.log('Has S-curve:', LightModes.hasSCurve(modesAvailable));
  console.log('Has log curve:', LightModes.hasLogCurve(modesAvailable));
  console.log('Has exp curve:', LightModes.hasExpCurve(modesAvailable));
  console.log('Has 0.1% dimming:', LightModes.hasDim01(modesAvailable));
  console.log('Has silent mode:', LightModes.hasSilentMode(modesAvailable));
  
  // Get all mode names
  const modeNames = LightModes.getModeNames(modesAvailable);
  console.log('Available modes:', modeNames);
}

// Example 3: Remove a mode
function removeLightMode(modesAvailable: number, modeToRemove: number) {
  return LightModes.removeMode(modesAvailable, modeToRemove);
}

// ===== PRACTICAL USAGE EXAMPLES =====

// Example: Create a professional lighting user
function createProfessionalLightingUser() {
  let permission = 0;
  permission = UserPermissions.addPermission(permission, USER_PERMISSIONS.LIGHT);
  permission = UserPermissions.addPermission(permission, USER_PERMISSIONS.CAMERA);
  // This user can work with lights and cameras, but not lenses
  
  return permission;
}

// Example: Create a high-end LED panel
function createHighEndLEDPanel() {
  let modes = 0;
  modes = LightModes.addMode(modes, LIGHT_MODES.TUNGSTEN_MODE);
  modes = LightModes.addMode(modes, LIGHT_MODES.DAYLIGHT_MODE);
  modes = LightModes.addMode(modes, LIGHT_MODES.S_CURVE);
  modes = LightModes.addMode(modes, LIGHT_MODES.LOG_CURVE);
  modes = LightModes.addMode(modes, LIGHT_MODES.EXP_CURVE);
  modes = LightModes.addMode(modes, LIGHT_MODES.DIM_0_1);
  modes = LightModes.addMode(modes, LIGHT_MODES.SILENT_MODE);
  // This light has all available modes including silent mode
  
  return modes;
}

// Example: Create a studio LED panel (with silent mode for film sets)
function createStudioLEDPanel() {
  let modes = 0;
  modes = LightModes.addMode(modes, LIGHT_MODES.TUNGSTEN_MODE);
  modes = LightModes.addMode(modes, LIGHT_MODES.DAYLIGHT_MODE);
  modes = LightModes.addMode(modes, LIGHT_MODES.SILENT_MODE);
  // This light is optimized for film sets with silent operation
  
  return modes;
}

// Example: Create a basic LED panel
function createBasicLEDPanel() {
  let modes = 0;
  modes = LightModes.addMode(modes, LIGHT_MODES.TUNGSTEN_MODE);
  modes = LightModes.addMode(modes, LIGHT_MODES.DAYLIGHT_MODE);
  // This light only has basic tungsten and daylight modes
  
  return modes;
}

// ===== VALIDATION EXAMPLES =====

// Example: Validate user permission before action
function canUserAccessLight(userPermission: number): boolean {
  return UserPermissions.hasLightPermission(userPermission);
}

// Example: Validate light mode before operation
function canLightDoTungstenMode(modesAvailable: number): boolean {
  return LightModes.hasTungstenMode(modesAvailable);
}

// Export examples for testing
export {
  createUserWithPermissions,
  checkUserPermissions,
  removeUserPermission,
  createLightWithModes,
  checkLightModes,
  removeLightMode,
  createProfessionalLightingUser,
  createHighEndLEDPanel,
  createStudioLEDPanel,
  createBasicLEDPanel,
  canUserAccessLight,
  canLightDoTungstenMode
};
