/**
 * Permission system types.
 *
 * Every tool call is checked against allow/deny rules.
 * Rules come from multiple sources with defined priority.
 * If no rule matches → ask the user.
 */

// ── Modes ──
export const PERMISSION_MODES = [
	'default',
	'plan',
	'acceptEdits',
	'bypassPermissions',
	'dontAsk',
] as const;
export type PermissionMode = (typeof PERMISSION_MODES)[number];

// ── Behaviors ──
export type PermissionBehaviour = 'allow' | 'deny' | 'ask';

// ── Rule sources (ordered by priority) ──
export type PermissionRuleSource =
	| 'userSettings' // settings.json
	| 'projectSettings' // settings.json
	| 'localSettings' // settings.local.json (gitignored)
	| 'flagSettings' // CLI --allowedTools / --disallowedTools
	| 'policySettings' // enterprise policy
	| 'cliArg' // inline CLI argument
	| 'command' // from a slash command
	| 'session'; // session-only (not persisted)

// ── Rule value ──
export type PermissionRuleValue = {
	toolName: string;
	/** Optional glob pattern */
	ruleContent?: string;
};

// ── Rule ──
export type PermissionRule = {
	source: PermissionRuleSource;
	ruleBehaviour: PermissionBehaviour;
	ruleValue: PermissionRuleValue;
};

// ── Permission updates (for settings mutation) ──
export type PermissionUpdateDestination =
	| 'userSettings'
	| 'projectSettings'
	| 'localSettings'
	| 'session'
	| 'cliArg';

export type PermissionUpdate =
	| {
			type: 'addRules';
			destination: PermissionUpdateDestination;
			rules: PermissionRuleValue[];
			behaviour: PermissionBehaviour;
	  }
	| {
			type: 'replaceRules';
			destination: PermissionUpdateDestination;
			rules: PermissionRuleValue[];
			behaviour: PermissionBehaviour;
	  }
	| {
			type: 'removeRules';
			destination: PermissionUpdateDestination;
			rules: PermissionRuleValue[];
			behaviour: PermissionBehaviour;
	  }
	| {
			type: 'setMode';
			destination: PermissionUpdateDestination;
			rules: PermissionRuleValue[];
			behaviour: PermissionBehaviour;
	  };

// ── Decision results ──
export type PermissionDecisionReason =
	| {
			type: 'rule';
			rule: PermissionRule;
	  }
	| {
			type: 'mode';
			mode: PermissionMode;
	  }
	| {
			type: 'hook';
			hookName: string;
			reason?: string;
	  }
	| {
			type: 'other';
			reason: string;
	  };

export type PermissionAllowDecision = {
	behavior: 'allow';
	decisionReason?: PermissionDecisionReason;
};

export type PermissionAskDecision = {
	behaviour: 'ask';
	message: string;
	decisionReason?: PermissionDecisionReason;
	suggestions?: PermissionUpdate[];
};

export type PermissionDenyDecision = {
	behavior: 'deny';
	message: string;
	decisionReason: PermissionDecisionReason;
};

export type PermissionDecision =
	| PermissionAllowDecision
	| PermissionAskDecision
	| PermissionDenyDecision;

// ── Tool permission context (readonly, passed to permission checkers) ──
export type ToolPermissionRulesBySource = {
	[T in PermissionRuleSource]?: string[];
};

export type ToolPermissionContext = {
	readonly mode: PermissionMode;
	readonly alwaysAllowRules: ToolPermissionRulesBySource;
	readonly alwaysDenyRules: ToolPermissionRulesBySource;
};
