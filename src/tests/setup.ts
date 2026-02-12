// ============================================================
// Vitest setup file - Configure testing environment
// ============================================================

import '@testing-library/jest-dom/vitest';

// Polyfill ResizeObserver for jsdom (used by CanvasEditor zoom)
if (typeof globalThis.ResizeObserver === 'undefined') {
  globalThis.ResizeObserver = class ResizeObserver {
    private cb: ResizeObserverCallback;
    constructor(cb: ResizeObserverCallback) {
      this.cb = cb;
    }
    observe() {
      // Immediately call with a mock entry so the component gets initial size
      this.cb(
        [{ contentRect: { width: 960, height: 540 } } as unknown as ResizeObserverEntry],
        this,
      );
    }
    unobserve() {}
    disconnect() {}
  };
}
