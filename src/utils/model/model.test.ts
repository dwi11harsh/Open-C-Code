import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetSettingsCache } from '../settings/settingsCache';
import {
	getDefaultMainLoopModel,
	getMainLoopModel,
	isModelAlias,
	resolveModelAlias,
	resolveModelSetting,
} from './model';
import { getAvailableModelIds, resetModelStrings } from './modelStrings';
import {
	getAPIProvider,
	isAnthropicProvider,
	isOllamaProvider,
} from './providers';

beforeEach(() => {
	resetModelStrings();
	resetSettingsCache();
	delete process.env.ANTHROPIC_MODEL;
	delete process.env.OLLAMA_DEFAULT_MODEL;
	delete process.env.OLLAMA_AVAILABLE_MODELS;
	delete process.env.OPENC_CODE_USE_BEDROCK;
	delete process.env.OPENC_CODE_USE_VERTEX;
	delete process.env.OPENC_CODE_USE_ANTHROPIC;
});

afterEach(() => {
	resetModelStrings();
	resetSettingsCache();
	delete process.env.ANTHROPIC_MODEL;
	delete process.env.OLLAMA_DEFAULT_MODEL;
	delete process.env.OLLAMA_AVAILABLE_MODELS;
	delete process.env.OPENC_CODE_USE_ANTHROPIC;
});

// ── Provider detection ────────────────────────────────────────────────────────

describe('getAPIProvider', () => {
	it('defaults to ollama when no env vars are set', () => {
		expect(getAPIProvider()).toBe('ollama');
	});

	it('returns anthropic when OPENC_CODE_USE_ANTHROPIC=1', () => {
		process.env.OPENC_CODE_USE_ANTHROPIC = '1';
		expect(getAPIProvider()).toBe('anthropic');
	});

	it('returns bedrock when OPENC_CODE_USE_BEDROCK=1', () => {
		process.env.OPENC_CODE_USE_BEDROCK = '1';
		expect(getAPIProvider()).toBe('bedrock');
	});

	it('returns vertex when OPENC_CODE_USE_VERTEX=1', () => {
		process.env.OPENC_CODE_USE_VERTEX = '1';
		expect(getAPIProvider()).toBe('vertex');
	});

	it('bedrock takes priority over anthropic and vertex', () => {
		process.env.OPENC_CODE_USE_BEDROCK = '1';
		process.env.OPENC_CODE_USE_VERTEX = '1';
		process.env.OPENC_CODE_USE_ANTHROPIC = '1';
		expect(getAPIProvider()).toBe('bedrock');
	});

	it('vertex takes priority over anthropic', () => {
		process.env.OPENC_CODE_USE_VERTEX = '1';
		process.env.OPENC_CODE_USE_ANTHROPIC = '1';
		expect(getAPIProvider()).toBe('vertex');
	});
});

describe('isOllamaProvider', () => {
	it('returns true by default', () => {
		expect(isOllamaProvider()).toBe(true);
	});

	it('returns false when another provider is active', () => {
		process.env.OPENC_CODE_USE_ANTHROPIC = '1';
		expect(isOllamaProvider()).toBe(false);
	});
});

describe('isAnthropicProvider', () => {
	it('returns false by default', () => {
		expect(isAnthropicProvider()).toBe(false);
	});

	it('returns true when OPENC_CODE_USE_ANTHROPIC=1', () => {
		process.env.OPENC_CODE_USE_ANTHROPIC = '1';
		expect(isAnthropicProvider()).toBe(true);
	});
});

// ── Alias resolution ─────────────────────────────────────────────────────────

describe('isModelAlias', () => {
	it('recognizes valid aliases', () => {
		expect(isModelAlias('sonnet')).toBe(true);
		expect(isModelAlias('opus')).toBe(true);
		expect(isModelAlias('haiku')).toBe(true);
		expect(isModelAlias('best')).toBe(true);
	});

	it('rejects non-aliases', () => {
		expect(isModelAlias('claude-opus-4-6')).toBe(false);
		expect(isModelAlias('')).toBe(false);
		expect(isModelAlias('random')).toBe(false);
	});
});

describe('resolveModelAlias (anthropic provider)', () => {
	beforeEach(() => {
		process.env.OPENC_CODE_USE_ANTHROPIC = '1';
		resetModelStrings();
	});

	it('resolves sonnet to claude-sonnet-4-6', () => {
		expect(resolveModelAlias('sonnet')).toBe('claude-sonnet-4-6');
	});

	it('resolves opus to claude-opus-4-6', () => {
		expect(resolveModelAlias('opus')).toBe('claude-opus-4-6');
	});

	it('resolves best to claude-opus-4-6', () => {
		expect(resolveModelAlias('best')).toBe('claude-opus-4-6');
	});

	it('resolves haiku to claude-haiku-4-5', () => {
		expect(resolveModelAlias('haiku')).toBe('claude-haiku-4-5');
	});
});

describe('resolveModelAlias (ollama provider)', () => {
	it('all aliases resolve to the ollama default model', () => {
		resetModelStrings();
		// default ollama model is deepseek-r1:7b (from MODEL_CONFIGS fallback)
		const expected = process.env.OLLAMA_DEFAULT_MODEL ?? 'deepseek-r1:7b';
		expect(resolveModelAlias('sonnet')).toBe(expected);
		expect(resolveModelAlias('opus')).toBe(expected);
		expect(resolveModelAlias('haiku')).toBe(expected);
		expect(resolveModelAlias('best')).toBe(expected);
	});

	it('uses OLLAMA_DEFAULT_MODEL when set', () => {
		process.env.OLLAMA_DEFAULT_MODEL = 'llama3:8b';
		resetModelStrings();
		expect(resolveModelAlias('sonnet')).toBe('llama3:8b');
	});
});

// ── Model setting resolution ─────────────────────────────────────────────────

describe('resolveModelSetting', () => {
	it('passes through a full model ID unchanged', () => {
		expect(resolveModelSetting('claude-opus-4-6')).toBe('claude-opus-4-6');
	});

	it('resolves an alias (anthropic provider)', () => {
		process.env.OPENC_CODE_USE_ANTHROPIC = '1';
		resetModelStrings();
		expect(resolveModelSetting('sonnet')).toBe('claude-sonnet-4-6');
	});

	it('returns default for null', () => {
		const result = resolveModelSetting(null);
		expect(typeof result).toBe('string');
		expect(result.length).toBeGreaterThan(0);
	});
});

// ── Main loop model ──────────────────────────────────────────────────────────

describe('getMainLoopModel', () => {
	it('returns a non-empty string by default', () => {
		const model = getMainLoopModel();
		expect(typeof model).toBe('string');
		expect(model.length).toBeGreaterThan(0);
	});

	it('respects ANTHROPIC_MODEL env var', () => {
		process.env.ANTHROPIC_MODEL = 'claude-haiku-4-5';
		expect(getMainLoopModel()).toBe('claude-haiku-4-5');
	});

	it('resolves alias from ANTHROPIC_MODEL (anthropic provider)', () => {
		process.env.OPENC_CODE_USE_ANTHROPIC = '1';
		resetModelStrings();
		process.env.ANTHROPIC_MODEL = 'haiku';
		expect(getMainLoopModel()).toBe('claude-haiku-4-5');
	});

	it('uses Ollama default model when provider is ollama', () => {
		resetModelStrings();
		process.env.OLLAMA_DEFAULT_MODEL = 'deepseek-r1:7b';
		const model = getDefaultMainLoopModel();
		expect(model).toBe('deepseek-r1:7b');
	});
});

// ── Model strings & available IDs ────────────────────────────────────────────

describe('modelStrings', () => {
	it('all model keys have values for default provider', async () => {
		const { getModelStrings } = await import('./modelStrings.js');
		const strings = getModelStrings();
		const keys: (keyof typeof strings)[] = [
			'opus46',
			'opus45',
			'sonnet46',
			'sonnet45',
			'haiku45',
		];
		for (const key of keys) {
			expect(typeof strings[key]).toBe('string');
			expect(strings[key].length).toBeGreaterThan(0);
		}
	});
});

describe('getAvailableModelIds', () => {
	it('parses OLLAMA_AVAILABLE_MODELS when on ollama provider', () => {
		process.env.OLLAMA_AVAILABLE_MODELS = 'deepseek-r1:7b, llama3:8b, qwen2:7b';
		resetModelStrings();
		const ids = getAvailableModelIds();
		expect(ids).toEqual(['deepseek-r1:7b', 'llama3:8b', 'qwen2:7b']);
	});

	it('falls back to default model when OLLAMA_AVAILABLE_MODELS is unset', () => {
		resetModelStrings();
		const ids = getAvailableModelIds();
		expect(ids.length).toBe(1);
		expect(ids[0].length).toBeGreaterThan(0);
	});

	it('returns deduped model IDs for anthropic provider', () => {
		process.env.OPENC_CODE_USE_ANTHROPIC = '1';
		resetModelStrings();
		const ids = getAvailableModelIds();
		expect(ids.length).toBeGreaterThan(0);
		// all should be unique
		expect(ids.length).toBe(new Set(ids).size);
		// should include claude model IDs
		expect(ids.some((id) => id.startsWith('claude-'))).toBe(true);
	});
});
