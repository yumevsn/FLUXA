import { useRef } from 'react';

/**
 * Tap + long-press handlers for list rows. A long press (500ms without
 * moving) calls `onLongPress` and suppresses the following click.
 */
export const useLongPress = (onLongPress: () => void, onClick: () => void, ms = 500) => {
  const timer = useRef<number>();
  const fired = useRef(false);
  const origin = useRef<{ x: number; y: number } | null>(null);

  const cancel = () => {
    window.clearTimeout(timer.current);
    origin.current = null;
  };

  return {
    onPointerDown: (e: React.PointerEvent) => {
      fired.current = false;
      origin.current = { x: e.clientX, y: e.clientY };
      timer.current = window.setTimeout(() => {
        fired.current = true;
        onLongPress();
      }, ms);
    },
    onPointerMove: (e: React.PointerEvent) => {
      const o = origin.current;
      if (o && Math.hypot(e.clientX - o.x, e.clientY - o.y) > 10) cancel();
    },
    onPointerUp: cancel,
    onPointerLeave: cancel,
    onPointerCancel: cancel,
    onContextMenu: (e: React.MouseEvent) => {
      // Right-click on desktop behaves like a long press
      e.preventDefault();
      cancel();
      fired.current = true;
      onLongPress();
    },
    onClick: () => {
      if (fired.current) {
        fired.current = false;
        return;
      }
      onClick();
    },
  };
};
