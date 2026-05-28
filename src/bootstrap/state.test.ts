import { beforeEach, describe, expect, it } from 'bun:test';
import { asSessionId } from 'src/types/ids';
import {
  getAllowedSettingSources,
  getCwdState,
  getIsInteractive,
  getLastInteractionTime,
  getOriginalCwd,
  getParentSessionId,
  getProjectRoot,
  getSessionBypassPermissionsMode,
  getSessionId,
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

beforeEach(() => {
  resetStateForTests();
});

describe('session ID', () => {
  it('starts with a non-empty string', () => {
    const id = getSessionId();
    expect(typeof id).toBe('string');
    expect(id.length).toBeGreaterThan(0);
  });

  it('regenerateSessionId produces a new ID', () => {
    const first = getSessionId();
    const second = regenerateSessionId();
    expect(second).not.toBe(first);
    expect(getSessionId()).toBe(second);
  });

  it('regenerateSessionId with setCurrentAsParent saves old ID', () => {
    const first = getSessionId();
    regenerateSessionId({ setCurrentAsParent: true });
    expect(getParentSessionId()).toBe(first);
  });

  it('switchSession fires the onSessionSwitch signal', () => {
    const received: string[] = [];
    const unsub = onSessionSwitch((id) => received.push(id));

    const newId = asSessionId('session-xyz');
    switchSession(newId);

    expect(received).toContain(newId);
    expect(getSessionId()).toBe(newId);
    unsub();
  });
});

describe('path state', () => {
  it('originalCwd is set and never changes', () => {
    const orig = getOriginalCwd();
    expect(orig.length).toBeGreaterThan(0);

    setCwdState('/tmp/something');
    expect(getOriginalCwd()).toBe(orig); // must not change
  });

  it('setCwdState updates cwd only', () => {
    const orig = getOriginalCwd();
    setCwdState('/tmp/test');
    expect(getCwdState()).toBe('/tmp/test');
    expect(getOriginalCwd()).toBe(orig);
  });

  it('setProjectRoot updates project root', () => {
    setProjectRoot('/my/project');
    expect(getProjectRoot()).toBe('/my/project');
  });
});

describe('session flags', () => {
  it('setIsInteractive toggles correctly', () => {
    setIsInteractive(false);
    expect(getIsInteractive()).toBe(false);
    setIsInteractive(true);
    expect(getIsInteractive()).toBe(true);
  });

  it('setSessionBypassPermissionsMode defaults false', () => {
    expect(getSessionBypassPermissionsMode()).toBe(false);
    setSessionBypassPermissionsMode(true);
    expect(getSessionBypassPermissionsMode()).toBe(true);
  });
});

describe('timing', () => {
  it('startTime is a recent timestamp', () => {
    const now = Date.now();
    expect(getStartTime()).toBeLessThanOrEqual(now);
    expect(getStartTime()).toBeGreaterThan(now - 5000); // within 5 seconds
  });

  it('updateLastInteractionTime moves the timestamp forward', async () => {
    const before = getLastInteractionTime();
    await new Promise((r) => setTimeout(r, 10));
    updateLastInteractionTime();
    expect(getLastInteractionTime()).toBeGreaterThan(before);
  });
});

describe('allowed setting sources', () => {
  it('starts with all sources enabled', () => {
    expect(getAllowedSettingSources()).toHaveLength(5);
  });

  it('setAllowedSettingSourcesInState restricts sources', () => {
    setAllowedSettingSourcesInState(['userSettings', 'projectSettings']);
    expect(getAllowedSettingSources()).toHaveLength(2);
    expect(getAllowedSettingSources()).toContain('userSettings');
    expect(getAllowedSettingSources()).not.toContain('policySettings');
  });
});

describe('resetStateForTests', () => {
  it('clears all mutated state', () => {
    // Mutate everything
    setCwdState('/tmp');
    setProjectRoot('/tmp/project');
    setIsInteractive(false);
    setSessionBypassPermissionsMode(true);
    setAllowedSettingSourcesInState(['userSettings']);

    // Reset
    resetStateForTests();

    // Everything should be back to defaults
    expect(getSessionBypassPermissionsMode()).toBe(false);
    expect(getAllowedSettingSources()).toHaveLength(5);
    expect(getIsInteractive()).toBe(process.stdout.isTTY === true);
  });
});