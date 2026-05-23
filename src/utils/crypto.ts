/**
 * Crypto indirection - re-export randomUUID for node:crypto
 * This file exists so we can swap the implementation for browser builds.
 */
import { randomUUID } from 'node:crypto';

export { randomUUID };
