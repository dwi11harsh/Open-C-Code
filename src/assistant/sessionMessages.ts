/**
 * Session message history — the in-memory list of messages in a conversation.
 *
 * This is the canonical store for all messages in the current session.
 * The agent loop reads from and writes to this list on every turn.
 *
 * Designed as a plain class (not a React store) because the agent loop
 * runs outside React. The React state layer (AppState.tsx, built later)
 * subscribes to changes from here.
 */

import type { AssistantMessage, Message, UserMessage } from 'src/types/message';
import { logForDebugging } from 'src/utils/debug';
import { createSignal } from 'src/utils/signal';
import {
	estimateTokensFromMessages,
	getLastKnownTokenCount,
} from 'src/utils/tokens';

export class SessionMessages {
	private _messages: Message[] = [];

	/** Signal fired when a message is appended. Subscribers: UI layer. */
	readonly onAppend = createSignal<[message: Message]>();

	/** Signal fired when the entire history is replaced (e.g. after compaction). */
	readonly onReplace = createSignal<[messages: Message[]]>();

	/** Append a single message to history. Fires the onAppend signal. */
	append(message: Message): void {
		this._messages.push(message);
		this.onAppend.emit(message);
		logForDebugging(
			`[history] appended ${message.type}, total=${this._messages.length}`,
		);
	}

	/** Append a user message. Convenience wrapper. */
	appendUser(message: UserMessage): void {
		this.append(message);
	}

	/** Append an assistant message. Convenience wrapper. */
	appendAssistant(message: AssistantMessage): void {
		this.append(message);
	}

	/** Replace the entire history (used after compaction). Fires onReplace. */
	replace(messages: Message[]): void {
		this._messages = [...messages];
		this.onReplace.emit(this._messages);
	}

	/** Read all messages (returns a defensive copy). */
	getAll(): Message[] {
		return [...this._messages];
	}

	/** Get the last N messages. */
	getLast(n: number): Message[] {
		return this._messages.slice(-n);
	}

	/** Get the most recent message, or null if empty. */
	getLatest(): Message | null {
		return this._messages[this._messages.length - 1] ?? null;
	}

	/** Number of messages in history. */
	get length(): number {
		return this._messages.length;
	}

	/** Clear all messages. */
	clear(): void {
		this._messages = [];
		this.onReplace.emit([]);
	}

	/**
	 * Estimated token count from the last known API response.
	 * Used by the agent loop to decide when to compact.
	 * Returns 0 before the first API call.
	 */
	getLastKnownTokenCount(): number {
		return getLastKnownTokenCount(this._messages);
	}

	/**
	 * Rough estimated token count for ALL messages.
	 * Less accurate than getLastKnownTokenCount — use for pre-call estimates.
	 */
	getEstimatedTokenCount(): number {
		return estimateTokensFromMessages(this._messages);
	}

	/**
	 * Serialize the history for disk persistence (.jsonl format).
	 * Each message is one JSON line.
	 */
	serialize(): string {
		return this._messages.map((msg) => JSON.stringify(msg)).join('\n');
	}

	/**
	 * Deserialize messages from .jsonl format.
	 * Replaces the current history.
	 */
	deserialize(jsonl: string): void {
		const messages: Message[] = [];
		for (const line of jsonl.split('\n')) {
			const trimmed = line.trim();
			if (!trimmed) continue;
			try {
				messages.push(JSON.parse(trimmed) as Message);
			} catch {
				logForDebugging(
					'[history] Skipped invalid JSONL line:',
					trimmed.slice(0, 100),
				);
			}
		}
		this.replace(messages);
	}
}
