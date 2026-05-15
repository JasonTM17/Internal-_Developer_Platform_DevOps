import { useEffect, useRef, useCallback } from 'react';

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

interface ShortcutDefinition {
  /** Human-readable description shown in the help dialog */
  description: string;
  /** Handler invoked when the shortcut is triggered */
  handler: () => void;
}

type ShortcutMap = Record<string, ShortcutDefinition>;

// -----------------------------------------------------------------------------
// Default shortcuts
// -----------------------------------------------------------------------------

function getDefaultShortcuts(navigate?: (path: string) => void): ShortcutMap {
  return {
    'ctrl+k': {
      description: 'Open search',
      handler: () => {
        console.log('[Shortcut] Open search (Ctrl+K)');
      },
    },
    'ctrl+/': {
      description: 'Show keyboard shortcuts help',
      handler: () => {
        console.log('[Shortcut] Show shortcuts help (Ctrl+/)');
        console.table(
          Object.entries(getDefaultShortcuts()).map(([key, def]) => ({
            shortcut: key,
            description: def.description,
          })),
        );
      },
    },
    'g>d': {
      description: 'Go to Dashboard',
      handler: () => {
        console.log('[Shortcut] Navigate to Dashboard (G then D)');
        navigate?.('/');
      },
    },
    'g>c': {
      description: 'Go to Catalog',
      handler: () => {
        console.log('[Shortcut] Navigate to Catalog (G then C)');
        navigate?.('/catalog');
      },
    },
    'g>e': {
      description: 'Go to Environments',
      handler: () => {
        console.log('[Shortcut] Navigate to Environments (G then E)');
        navigate?.('/environments');
      },
    },
  };
}

// -----------------------------------------------------------------------------
// Hook
// -----------------------------------------------------------------------------

/**
 * Global keyboard shortcuts hook.
 *
 * Supports:
 * - Modifier combos: ctrl+k, ctrl+/
 * - Sequential keys: g>d (press G then D within 1 second)
 *
 * @param navigate - Optional navigation function (e.g. from react-router)
 * @param overrides - Optional map to override or extend default shortcuts
 */
export function useKeyboardShortcuts(
  navigate?: (path: string) => void,
  overrides?: Partial<ShortcutMap>,
) {
  const sequenceBuffer = useRef<string>('');
  const sequenceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const shortcuts: ShortcutMap = {
    ...getDefaultShortcuts(navigate),
    ...(overrides as ShortcutMap),
  };

  const resetSequence = useCallback(() => {
    sequenceBuffer.current = '';
    if (sequenceTimer.current) {
      clearTimeout(sequenceTimer.current);
      sequenceTimer.current = null;
    }
  }, []);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      // Ignore events from input elements
      const target = event.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.tagName === 'SELECT' ||
        target.isContentEditable
      ) {
        return;
      }

      // Build the key combo string
      const parts: string[] = [];
      if (event.ctrlKey || event.metaKey) parts.push('ctrl');
      if (event.altKey) parts.push('alt');
      if (event.shiftKey) parts.push('shift');

      const key = event.key.toLowerCase();

      // Check modifier-based shortcuts
      if (parts.length > 0) {
        parts.push(key);
        const combo = parts.join('+');
        const shortcut = shortcuts[combo];
        if (shortcut) {
          event.preventDefault();
          resetSequence();
          shortcut.handler();
          return;
        }
      }

      // Handle sequential shortcuts (e.g., g>d)
      if (!event.ctrlKey && !event.metaKey && !event.altKey && key.length === 1) {
        sequenceBuffer.current += key;

        // Reset timer on each keypress
        if (sequenceTimer.current) {
          clearTimeout(sequenceTimer.current);
        }
        sequenceTimer.current = setTimeout(resetSequence, 1000);

        // Check if current buffer matches any sequence shortcut
        for (const [pattern, shortcut] of Object.entries(shortcuts)) {
          if (pattern.includes('>')) {
            const sequenceKeys = pattern.split('>').join('');
            if (sequenceBuffer.current === sequenceKeys) {
              event.preventDefault();
              resetSequence();
              shortcut.handler();
              return;
            }
          }
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      if (sequenceTimer.current) {
        clearTimeout(sequenceTimer.current);
      }
    };
  });
}

export default useKeyboardShortcuts;
