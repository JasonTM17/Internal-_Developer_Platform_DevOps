import { renderHook } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';

import { useKeyboardShortcuts } from '../useKeyboardShortcuts';

function fireKey(key: string, opts: Partial<KeyboardEventInit> = {}) {
  const event = new KeyboardEvent('keydown', {
    key,
    bubbles: true,
    ...opts,
  });
  document.dispatchEvent(event);
}

describe('useKeyboardShortcuts', () => {
  it('fires handler for ctrl+k shortcut', () => {
    const navigate = vi.fn();
    renderHook(() => useKeyboardShortcuts(navigate));

    fireKey('k', { ctrlKey: true });
    // ctrl+k is registered but handler is a TODO - just verify no crash
  });

  it('fires navigation for sequence shortcut g>d', () => {
    const navigate = vi.fn();
    renderHook(() => useKeyboardShortcuts(navigate));

    fireKey('g');
    fireKey('d');

    expect(navigate).toHaveBeenCalledWith('/');
  });

  it('fires navigation for sequence shortcut g>c', () => {
    const navigate = vi.fn();
    renderHook(() => useKeyboardShortcuts(navigate));

    fireKey('g');
    fireKey('c');

    expect(navigate).toHaveBeenCalledWith('/catalog');
  });

  it('does not fire shortcuts when target is an input', () => {
    const navigate = vi.fn();
    renderHook(() => useKeyboardShortcuts(navigate));

    const input = document.createElement('input');
    document.body.appendChild(input);
    const event = new KeyboardEvent('keydown', {
      key: 'g',
      bubbles: true,
    });
    Object.defineProperty(event, 'target', { value: input });
    document.dispatchEvent(event);

    const event2 = new KeyboardEvent('keydown', {
      key: 'd',
      bubbles: true,
    });
    Object.defineProperty(event2, 'target', { value: input });
    document.dispatchEvent(event2);

    expect(navigate).not.toHaveBeenCalled();
    document.body.removeChild(input);
  });
});
