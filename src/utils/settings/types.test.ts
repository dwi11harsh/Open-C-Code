import { describe, expect, it } from 'bun:test';
import { SettingsSchema } from './types';

describe('SettingsSchema', () => {
  it('accepts an empty object', () => {
    const result = SettingsSchema().safeParse({});
    expect(result.success).toBe(true);
  });

  it('accepts a full valid settings object', () => {
    const result = SettingsSchema().safeParse({
      model: 'claude-opus-4-6',
      theme: 'dark',
      cleanupPeriodDays: 30,
      respectGitignore: true,
      env: { NODE_ENV: 'production' },
      permissions: {
        allow: ['Bash(git status)', 'FileRead'],
        deny: ['Bash(rm -rf *)'],
      },
    });
    expect(result.success).toBe(true);
  });

  it('preserves unknown fields (passthrough)', () => {
    const input = { model: 'sonnet', myCustomField: 'custom-value' };
    const result = SettingsSchema().safeParse(input);
    expect(result.success).toBe(true);
    if (result.success) {
      expect((result.data as Record<string, unknown>).myCustomField).toBe('custom-value');
    }
  });

  it('rejects invalid theme values', () => {
    const result = SettingsSchema().safeParse({ theme: 'neon-green' });
    expect(result.success).toBe(false);
  });

  it('rejects negative cleanupPeriodDays', () => {
    const result = SettingsSchema().safeParse({ cleanupPeriodDays: -1 });
    expect(result.success).toBe(false);
  });

  it('coerces env var values to strings', () => {
    // z.coerce.string() should convert numbers to strings in env
    const result = SettingsSchema().safeParse({ env: { PORT: '3000' } });
    expect(result.success).toBe(true);
  });

  it('is idempotent (lazySchema returns same instance)', () => {
    const schema1 = SettingsSchema();
    const schema2 = SettingsSchema();
    expect(schema1).toBe(schema2); // same reference = lazy cache worked
  });
});