import { describe, expect, it } from 'bun:test';

describe('startupProfiler', () => {
  it('profileCheckpoint does not throw', async () => {
    const { profileCheckpoint } = await import('./startupProfiler.js');
    expect(() => profileCheckpoint('test_checkpoint')).not.toThrow();
  });

  it('getStartupReport returns empty string when detailed profiling is off', async () => {
    // Unless CLAUDE_CODE_PROFILE_STARTUP=1 is set, this should be empty
    if (!process.env.CLAUDE_CODE_PROFILE_STARTUP) {
      const { getStartupReport } = await import('./startupProfiler.js');
      expect(getStartupReport()).toBe('');
    }
  });

  it('SHOULD_PROFILE is a boolean', async () => {
    const { SHOULD_PROFILE } = await import('./startupProfiler.js');
    expect(typeof SHOULD_PROFILE).toBe('boolean');
  });
});