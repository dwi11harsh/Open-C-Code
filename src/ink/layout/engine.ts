/**
 * Yoga layout node factory.
 *
 * Lazy-initializes Yoga so the WASM startup cost is only paid when the
 * reconciler first creates a node (not on --version or pipe-mode startup).
 */

import { LayoutNode } from './node';

// biome-ignore lint/suspicious/noExplicitAny: yoga-layout types
let _yoga: { Node: { create(): any } } | null = null;

function getYoga() {
	if (!_yoga) {
		// biome-ignore lint/suspicious/noExplicitAny: yoga-layout types
		const yoga = require('yoga-layout') as { Node: { create(): any } };
		_yoga = yoga;
		return yoga;
	}
	return _yoga;
}

/**
 * Create a new LayoutNode backed by a Yoga node.
 * Called synchronously from dom.createNode() during React reconciliation.
 */
export const createLayoutNode = (): LayoutNode => {
	return new LayoutNode(getYoga().Node.create());
};
