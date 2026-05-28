/**
 * Zod schema for ~/.openc/settings.json and .openc/settings.json.
 *
 * This file defines the accepted shape of all user settings.
 * Validation is done at load time — invalid fields are reported to the user,
 * but don't crash the process (we fall back to defaults).
 *
 * We use lazySchema() throughout to avoid circular dep issues and to defer
 * Zod's schema construction until first use (improves startup time).
 *
 * ⚠️ BACKWARD COMPATIBILITY RULE:
 *   - Always add new fields with .optional()
 *   - Never remove or rename fields
 *   - Never make optional fields required
 */

import { z } from 'zod';
import { lazySchema } from '../lazySchema';

// ── Permission rules ─────────────────────────────────────────────────────────

/**
 * A single permission rule string.
 * Format examples:
 *   "Bash"                  → matches all Bash calls
 *   "Bash(git *)"           → matches Bash calls starting with "git"
 *   "FileEdit(src/**)"      → matches FileEdit calls on files under src/
 */
export const PermissionRuleSchema = lazySchema(() =>
  z.string().min(1, 'Permission rule cannot be empty'),
);

/**
 * The permissions section of settings.json.
 * Controls which tool calls are allowed/denied/ask without prompting.
 */
export const PermissionsSchema = lazySchema(() =>
  z.object({
    allow: z.array(PermissionRuleSchema()).optional()
      .describe('Tool calls that are always allowed without prompting'),
    deny: z.array(PermissionRuleSchema()).optional()
      .describe('Tool calls that are always denied'),
    ask: z.array(PermissionRuleSchema()).optional()
      .describe('Tool calls that always prompt for confirmation'),
    defaultMode: z.enum(['default', 'plan', 'acceptEdits', 'bypassPermissions', 'dontAsk']).optional()
      .describe('Permission mode to use at startup'),
    additionalDirectories: z.array(z.string()).optional()
      .describe('Extra directories the agent may read and write'),
  }).passthrough(), // preserve unknown fields — don't break on future schema additions
);

// ── Environment variables ────────────────────────────────────────────────────

export const EnvironmentVariablesSchema = lazySchema(() =>
  z.record(z.string(), z.coerce.string()),
);

// ── Main settings schema ─────────────────────────────────────────────────────

/**
 * The complete settings.json schema.
 * Every field is optional — an empty {} is a valid settings file.
 */
export const SettingsSchema = lazySchema(() =>
  z.object({
    // Model selection
    model: z.string().optional()
      .describe('Model to use (e.g. "claude-opus-4-6", "sonnet", "haiku")'),

    // Feature flags
    theme: z.enum(['dark', 'light', 'system']).optional()
      .describe('UI color theme'),
    cleanupPeriodDays: z.number().nonnegative().int().optional()
      .describe('Days to retain chat transcripts (0 = disable persistence)'),
    respectGitignore: z.boolean().optional()
      .describe('Whether file picker respects .gitignore (default: true)'),
    includeCoAuthoredBy: z.boolean().optional()
      .describe('Include Co-Authored-By in git commits (default: true)'),
    verbose: z.boolean().optional()
      .describe('Enable verbose output'),

    // Environment variables injected into tool subprocesses
    env: EnvironmentVariablesSchema().optional()
      .describe('Environment variables set for all tool subprocesses'),

    // Permissions
    permissions: PermissionsSchema().optional()
      .describe('Tool permission rules'),

    // Hooks
    hooks: z.record(z.string(), z.unknown()).optional()
      .describe('Hook scripts called at lifecycle events'),

    // API key helper script
    apiKeyHelper: z.string().optional()
      .describe('Path to a script that outputs the API key'),

    // MCP servers (shape validated separately)
    mcpServers: z.record(z.string(), z.unknown()).optional()
      .describe('MCP server configurations'),
  }).passthrough(),
);

/**
 * The TypeScript type derived from the schema.
 * Use this everywhere instead of writing the type manually —
 * it stays in sync with the schema automatically.
 */
export type SettingsJson = z.infer<ReturnType<typeof SettingsSchema>>;