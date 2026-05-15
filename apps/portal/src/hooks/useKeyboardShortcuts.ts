import { useEffect, useRef, useCallback, useMemo } from 'react';

interface ShortcutDefinition {
  description: string;
  handler: () => void;
}

type ShortcutMap = Record<string, ShortcutDefinition>;

function getDefaultShortcuts(navigate?: (path: string) => void): ShortcutMap {
  return {
    'ctrl+k': {
      description: 'Open search',
      handler: () => {
        // TODO: open search dialog
      },
    },
    'ctrl+/': {
      description: 'Show keyboard shortcuts help',
      handler: () => {
        // TODO: open shortcuts help dialog
      },
    },
    'g>d': {
      description: 'Go to Dashboard',
      handler: () => {
        navigate?.('/');
      },
    },
    'g>c': {
      description: 'Go to Catalog',
      handler: () => {
        navigate?.('/catalog');
      },
    },
    'g>e': {
      description: 'Go to Environments',
      handler: () => {
        navigate?.('/environments');
      },
    },
  };
}

export function useKeyboardShortcuts(
  navigate?: (path: string) => void,
  overrides?: Partial<ShortcutMap>,
) {
  const sequenceBuffer = useRef<string>('');
  const sequenceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const shortcuts = useMemo<ShortcutMap>(
    () => ({
      ...getDefaultShortcuts(navigate),
      ...(overrides as ShortcutMap),
    }),
    [navigate, overrides],
  );

  const resetSequence = useCallback(() => {
    sequenceBuffer.current = '';
    if (sequenceTimer.current) {
      clearTimeout(sequenceTimer.current);
      sequenceTimer.current = null;
    }
  }, []);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      const target = event.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.tagName === 'SELECT' ||
        target.isContentEditable
      ) {
        return;
      }

      const parts: string[] = [];
      if (event.ctrlKey || event.metaKey) parts.push('ctrl');
      if (event.altKey) parts.push('alt');
      if (event.shiftKey) parts.push('shift');

      const key = event.key.toLowerCase();

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

      if (!event.ctrlKey && !event.metaKey && !event.altKey && key.length === 1) {
        sequenceBuffer.current += key;

        if (sequenceTimer.current) {
          clearTimeout(sequenceTimer.current);
        }
        sequenceTimer.current = setTimeout(resetSequence, 1000);

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
  }, [shortcuts, resetSequence]);
}

export default useKeyboardShortcuts;
