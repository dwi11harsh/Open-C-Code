/**
 * Global process-wide state singleton.
 *
 * The single source of truth for all session-level state
 * There is exactly one STATE object per process, initialized on startup.
 *
 * RULE: only add fields here if multiple unrelated modules need them
 */
import { realpathSync } from 'node:fs';
import { cwd as processCwd } from 'node:process';
import type { SessionId } from 'src/types/ids';
import { randomUUID } from 'src/utils/crypto';
import {
	SETTING_SOURCES,
	type SettingSource,
	setAllowedSettingSources,
} from 'src/utils/settings/constants';
import { resetSettingsCache } from 'src/utils/settings/settingsCache';
import { createSignal } from 'src/utils/signal';

// ── State shape ───────────────────────────────────────────────────────────────
type State = {
	// ── Identity ────────────────────────────────────────────────────
	/** The current session's unique ID. Changes on /clear or --resume. */
	sessionId: SessionId;

	/** The session ID of the session that spawned this one (if any). */
	parentSessionId: SessionId | undefined;

	// ── Paths ───────────────────────────────────────────────────────
	/**
	 * The working directory when the process started.
	 * Never changes — used for path resolution that must be stable.
	 */
	originalCwd: string;

	/**
	 * The stable project root.
	 * Set once at startup. Used for identity (session history, CLAUDE.md).
	 * NOT the same as cwd — the agent can cd into subdirectories but the
	 * project root stays fixed.
	 */
	projectRoot: string;

	/**
	 * The current working directory.
	 * Updated when the agent uses cd or switches worktrees.
	 */
	cwd: string;

	// ── Session flags ────────────────────────────────────────────────
	/** True if the CLI is running interactively (attached to a TTY). */
	isInteractive: boolean;

	/** True if the process is in bypass-permissions mode (--dangerously-skip-permissions). */
	sessionBypassPermissionsMode: boolean;

	// ── Settings ─────────────────────────────────────────────────────
	/** Which setting sources are enabled for this session. */
	allowedSettingSources: SettingSource[];

	// ── Timing & metrics ─────────────────────────────────────────────
	/** Timestamp (Date.now()) when the process started. */
	startTime: number;

	/** Timestamp of the last user interaction. */
	lastInteractionTime: number;

	// ── Session project dir (for transcript path) ──────────────────
	/**
	 * Directory containing this session's .jsonl transcript file.
	 * null means "derive from originalCwd".
	 */
	sessionProjectDir: string | null;
};

// ── Initial state ─────────────────────────────────────────────────────────────
const getInitialState = (): State => {
	// Resolve symlinks in cwd so paths are stable even when the user is in a
	// symlinked directory. The 'NFC' normalization handles macOS filesystem
	// quirks with Unicode filenames.
	let resolvedCwd = '';
	try {
		resolvedCwd = realpathSync(processCwd()).normalize('NFC');
	} catch {
		resolvedCwd = processCwd().normalize('NFC');
	}

	return {
		sessionId: randomUUID() as SessionId,
		parentSessionId: undefined,

		originalCwd: resolvedCwd,
		projectRoot: resolvedCwd,
		cwd: resolvedCwd,

		isInteractive: process.stdout.isTTY === true,
		sessionBypassPermissionsMode: false,

		allowedSettingSources: [...SETTING_SOURCES],

		startTime: Date.now(),
		lastInteractionTime: Date.now(),

		sessionProjectDir: null,
	};
};

// ── The singleton ─────────────────────────────────────────────────────────────
// This is created once when the module is first imported.
// After this point, STATE is stable for the lifetime of the process.
const STATE: State = getInitialState();

// ── Session ID ────────────────────────────────────────────────────────────────
export const getSessionId = (): SessionId => {
	return STATE.sessionId;
};

export const getParentSessionId = (): SessionId | undefined => {
	return STATE.parentSessionId;
};

/**
 * Generate a new session ID (used by /clear).
 * Optionally promotes the current session to parentSessionId first.
 */
export const regenerateSessionId = (
	options: { setCurrentAsParent?: boolean } = {},
): SessionId => {
	if (options.setCurrentAsParent) {
		STATE.parentSessionId = STATE.sessionId;
	}
	STATE.sessionId = randomUUID() as SessionId;
	STATE.sessionProjectDir = null; // new session lives in originalCwd
	return STATE.sessionId;
};

// Signal that fires when switchSession() is called.
// External modules subscribe to keep in sync with the active session ID.
const sessionSwitched = createSignal<[id: SessionId]>();

/**
 * Atomically switch to a different session.
 * Always use this instead of setting sessionId directly — it ensures
 * sessionProjectDir and sessionId change together (they must never drift).
 */
export const switchSession = (
	sessionId: SessionId,
	projectDir: string | null = null,
): void => {
	STATE.sessionId = sessionId;
	STATE.sessionProjectDir = projectDir;
	sessionSwitched.emit(sessionId);
};

/** Subscribe to session switches. Returns an unsubscribe function. */
export const onSessionSwitch = sessionSwitched.subscribe;

// ── Path accessors ────────────────────────────────────────────────────────────
export const getOriginalCwd = (): string => {
	return STATE.originalCwd;
};

export const getProjectRoot = (): string => {
	return STATE.projectRoot;
};

/** Set the project root. Only called once at startup. */
export const setProjectRoot = (path: string): void => {
	STATE.projectRoot = path;
};

export const getCwdState = (): string => {
	return STATE.cwd;
};

/** Update the current working directory (when the agent uses cd). */
export const setCwdState = (newCwd: string): void => {
	STATE.cwd = newCwd;
};

export const getSessionProjectDir = (): string | null => {
	return STATE.sessionProjectDir;
};

// ── Timing ────────────────────────────────────────────────────────────────────

export function getStartTime(): number {
	return STATE.startTime;
}

export function getLastInteractionTime(): number {
	return STATE.lastInteractionTime;
}

export function updateLastInteractionTime(): void {
	STATE.lastInteractionTime = Date.now();
}

// ── Session flags ─────────────────────────────────────────────────────────────

export function getIsInteractive(): boolean {
	return STATE.isInteractive;
}

export function setIsInteractive(value: boolean): void {
	STATE.isInteractive = value;
}

export function getSessionBypassPermissionsMode(): boolean {
	return STATE.sessionBypassPermissionsMode;
}

export function setSessionBypassPermissionsMode(enabled: boolean): void {
	STATE.sessionBypassPermissionsMode = enabled;
}

// ── Settings sources ──────────────────────────────────────────────────────────

export function getAllowedSettingSources(): SettingSource[] {
	return STATE.allowedSettingSources;
}

/**
 * Restrict which setting sources are enabled for this session.
 * Also propagates to the settings/constants module so isSettingSourceEnabled()
 * and getEnabledSettingSources() stay in sync.
 */
export const setAllowedSettingSourcesInState = (
	sources: SettingSource[],
): void => {
	STATE.allowedSettingSources = sources;
	setAllowedSettingSources(sources); // keep constants.ts in sync
	resetSettingsCache(); // old cached values may be from now-disabled sources
};

// ── Test helpers ──────────────────────────────────────────────────────────────

/**
 * Reset all mutable state back to initial values.
 * ONLY FOR USE IN TESTS. Never call this in production code.
 */
export const resetStateForTests = (): void => {
	const fresh = getInitialState();
	STATE.sessionId = fresh.sessionId;
	STATE.parentSessionId = fresh.parentSessionId;
	STATE.cwd = fresh.cwd;
	STATE.projectRoot = fresh.projectRoot;
	STATE.isInteractive = fresh.isInteractive;
	STATE.sessionBypassPermissionsMode = fresh.sessionBypassPermissionsMode;
	STATE.allowedSettingSources = fresh.allowedSettingSources;
	STATE.startTime = fresh.startTime;
	STATE.lastInteractionTime = fresh.lastInteractionTime;
	STATE.sessionProjectDir = fresh.sessionProjectDir;
	resetSettingsCache();
};
