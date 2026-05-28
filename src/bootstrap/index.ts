/**
 * Barrel export for bootstrap module.
 * Import from "src/bootstrap" everywhere — never drill into state.ts directly.
 */

export {
  getSessionId,
  getParentSessionId,
  regenerateSessionId,
  switchSession,
  onSessionSwitch,
  getOriginalCwd,
  getProjectRoot,
  setProjectRoot,
  getCwdState,
  setCwdState,
  getSessionProjectDir,
  getStartTime,
  getLastInteractionTime,
  updateLastInteractionTime,
  getIsInteractive,
  setIsInteractive,
  getSessionBypassPermissionsMode,
  setSessionBypassPermissionsMode,
  getAllowedSettingSources,
  setAllowedSettingSourcesInState,
  resetStateForTests,
} from './state';