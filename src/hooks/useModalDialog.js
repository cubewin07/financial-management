import { useEffect, useId, useRef } from 'react';

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

const openDialogStack = [];

/**
 * Modal keyboard behaviour: moves focus into the dialog, keeps Tab inside it,
 * closes on Escape (only for the top-most open dialog), and returns focus to
 * the opener afterwards.
 * Attach the returned ref to the element with role="dialog" and tabIndex={-1}.
 */
export default function useModalDialog(open, onClose) {
  const dialogId = useId();
  const dialogRef = useRef(null);
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!open || typeof document === 'undefined') return undefined;

    const opener = document.activeElement;
    openDialogStack.push(dialogId);
    dialogRef.current?.focus();

    const isTopDialog = () =>
      openDialogStack.length > 0 && openDialogStack[openDialogStack.length - 1] === dialogId;

    const handleKeyDown = (event) => {
      if (!isTopDialog()) return;

      if (event.key === 'Escape') {
        event.stopPropagation();
        onCloseRef.current?.();
        return;
      }
      if (event.key !== 'Tab' || !dialogRef.current) return;

      const focusable = dialogRef.current.querySelectorAll(FOCUSABLE);
      if (focusable.length === 0) {
        event.preventDefault();
        dialogRef.current.focus();
        return;
      }
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement;
      const isInsideDialog = dialogRef.current.contains(active);
      const isInsidePortaledPopover = Boolean(active?.closest?.('[data-modal-popover="true"]'));

      if (isInsidePortaledPopover) {
        return;
      }

      if (!isInsideDialog) {
        event.preventDefault();
        (event.shiftKey ? last : first).focus();
        return;
      }

      if (event.shiftKey && (active === first || active === dialogRef.current)) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      const idx = openDialogStack.lastIndexOf(dialogId);
      if (idx !== -1) openDialogStack.splice(idx, 1);
      opener?.focus?.();
    };
  }, [open, dialogId]);

  return dialogRef;
}
