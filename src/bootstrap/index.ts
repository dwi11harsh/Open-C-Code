/**
 * Barrel export for bootstrap module.
 * Import from "src/bootstrap" everywhere — never drill into state.ts directly.
 */

export {
	getAllowedSettingSources,
	getCwdState,
	getIsInteractive,
	getLastInteractionTime,
	getOriginalCwd,
	getParentSessionId,
	getProjectRoot,
	getSessionBypassPermissionsMode,
	getSessionId,
	getSessionProjectDir,
	getStartTime,
	onSessionSwitch,
	regenerateSessionId,
	resetStateForTests,
	setAllowedSettingSourcesInState,
	setCwdState,
	setIsInteractive,
	setProjectRoot,
	setSessionBypassPermissionsMode,
	switchSession,
	updateLastInteractionTime,
} from './state';
