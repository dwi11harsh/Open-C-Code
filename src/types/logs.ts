/**
 * Log entry types for the in-memory error log and diagnostics.
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export type LogEntry = {
	level: LogLevel;
	message: string;
	timestamp: string;
	context?: Record<string, unknown>;
};
