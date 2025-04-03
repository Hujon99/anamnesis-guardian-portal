
/**
 * This utility provides functions for handling keyboard shortcuts
 * and accessibility features throughout the application.
 */

// Keyboard shortcut map
interface ShortcutMap {
  [key: string]: {
    description: string;
    action: () => void;
  };
}

/**
 * Registers keyboard shortcuts in the application
 * @param shortcuts Object containing key combinations and their actions
 * @returns A cleanup function to remove event listeners
 */
export const registerKeyboardShortcuts = (shortcuts: ShortcutMap): () => void => {
  const handleKeyDown = (e: KeyboardEvent) => {
    // Don't process shortcuts if in an input, textarea, or select
    if (
      e.target instanceof HTMLInputElement ||
      e.target instanceof HTMLTextAreaElement ||
      e.target instanceof HTMLSelectElement
    ) {
      return;
    }

    // Create a key string based on modifiers and key
    const keyString = [
      e.ctrlKey ? 'Ctrl+' : '',
      e.altKey ? 'Alt+' : '',
      e.shiftKey ? 'Shift+' : '',
      e.key
    ].join('');

    // Check if this key combination is registered
    if (shortcuts[keyString]) {
      e.preventDefault();
      shortcuts[keyString].action();
    }
  };

  window.addEventListener('keydown', handleKeyDown);
  
  // Return a cleanup function
  return () => {
    window.removeEventListener('keydown', handleKeyDown);
  };
};

/**
 * Focuses the first error element in a form
 */
export const focusFirstError = (): void => {
  const firstErrorEl = document.querySelector('[aria-invalid="true"]');
  if (firstErrorEl) {
    (firstErrorEl as HTMLElement).focus();
  }
};

/**
 * Announces a message to screen readers using ARIA live regions
 * @param message The message to announce
 * @param level The importance level ('polite' or 'assertive')
 */
export const announceToScreenReader = (
  message: string, 
  level: 'polite' | 'assertive' = 'polite'
): void => {
  // Look for existing live region or create one
  let announcer = document.getElementById('screen-reader-announcer');
  
  if (!announcer) {
    announcer = document.createElement('div');
    announcer.id = 'screen-reader-announcer';
    announcer.className = 'sr-only';
    announcer.setAttribute('aria-live', level);
    announcer.setAttribute('aria-atomic', 'true');
    document.body.appendChild(announcer);
  }
  
  // Set the aria-live attribute to the appropriate level
  announcer.setAttribute('aria-live', level);
  
  // Clear previous content and set new content
  announcer.textContent = '';
  
  // Use setTimeout to ensure screen readers register the change
  setTimeout(() => {
    announcer.textContent = message;
  }, 100);
};

/**
 * Creates a "Skip to content" link for keyboard users
 * @param contentId The ID of the main content element
 */
export const createSkipLink = (contentId: string): HTMLElement => {
  const skipLink = document.createElement('a');
  skipLink.href = `#${contentId}`;
  skipLink.className = 'sr-only focus:not-sr-only focus:absolute focus:z-50 focus:top-4 focus:left-4 focus:p-4 focus:bg-background focus:text-foreground focus:outline-none focus:ring-2 focus:ring-ring';
  skipLink.textContent = 'Hoppa till innehåll';
  
  return skipLink;
};
