/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useRef } from "react";

export function useFocusTrap(isActive: boolean) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isActive || !containerRef.current) return;

    const container = containerRef.current;
    const focusableSelector =
      'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

    const getFocusableElements = () =>
      Array.from(container.querySelectorAll<HTMLElement>(focusableSelector));

    const focusableEls = getFocusableElements();
    const firstFocusable = focusableEls[0];
    const lastFocusable = focusableEls[focusableEls.length - 1];

    firstFocusable?.focus();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        return;
      }

      if (e.key !== "Tab") return;

      const currentFocusables = getFocusableElements();
      if (currentFocusables.length === 0) {
        e.preventDefault();
        return;
      }

      const first = currentFocusables[0];
      const last = currentFocusables[currentFocusables.length - 1];

      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault();
          last?.focus();
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    const previousActive = document.activeElement as HTMLElement;

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      previousActive?.focus?.();
    };
  }, [isActive]);

  return containerRef;
}

export function useEscapeKey(onEscape: () => void, isActive: boolean = true) {
  useEffect(() => {
    if (!isActive) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onEscape();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onEscape, isActive]);
}
