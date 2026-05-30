## Files

```
src/ink/layout/
├── geometry.ts     # Point, Size, Rectangle, Edges + helpers (pure math, no deps)
├── node.ts         # LayoutNode interface — the contract every adapter must fulfill
├── yoga.ts         # YogaLayoutNode class — wraps the Yoga WASM/TS engine
└── engine.ts       # createLayoutNode() factory — returns a YogaLayoutNode
```