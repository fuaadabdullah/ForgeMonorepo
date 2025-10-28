import '@testing-library/jest-dom/vitest';
import * as React from 'react';

// Expose React to tests under a unique global name to avoid colliding with
// existing ambient `React` declarations. Tests that used `globalThis.React`
// can be updated to read `globalThis.__REACT_GLOBAL__` or this shim can be
// adjusted later. We avoid `as any` by using a safe typed assertion.
(globalThis as unknown as { __REACT_GLOBAL__?: typeof React }).__REACT_GLOBAL__ = React;
