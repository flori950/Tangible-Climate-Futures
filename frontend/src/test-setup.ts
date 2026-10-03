/**
 * Global Vitest setup (registered via `setupFiles` in angular.json).
 * jsdom lacks a few browser APIs used by the app; minimal stand-ins are
 * installed here so components can be created in tests.
 */

// Used by DownloadService to create downloadable blobs.
if (!URL.createObjectURL) {
  URL.createObjectURL = () => 'blob:mock';
}
if (!URL.revokeObjectURL) {
  URL.revokeObjectURL = () => undefined;
}

// OpenLayers observes the size of the map element.
if (!('ResizeObserver' in globalThis)) {
  (globalThis as unknown as { ResizeObserver: unknown }).ResizeObserver = class {
    observe(): void {
      // no-op: jsdom does no layout
    }
    unobserve(): void {
      // no-op
    }
    disconnect(): void {
      // no-op
    }
  };
}

// jsdom has no canvas implementation and logs "Not implemented" on every call.
HTMLCanvasElement.prototype.getContext = (() => null) as typeof HTMLCanvasElement.prototype.getContext;
