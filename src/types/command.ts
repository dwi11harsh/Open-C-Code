/**
 * Slash command types.
 * /clear, /help, /compact, /model, maybe more in future
 */

export type CommandResult =
	| { kind: 'success'; message?: string }
	| { kind: 'error'; message: string }
	| { kind: 'exit' };

export type SlashCommand = {
	name: string;
	aliases?: string[];
	description: string;
	handler: (args: string) => Promise<CommandResult> | CommandResult;
	hidden?: boolean;
};
