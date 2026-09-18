import { createContext, useContext, useState, useRef, useCallback } from 'react';
import ConfirmationModal from '../components/ui/ConfirmationModal';

const ConfirmationContext = createContext(null);

export function ConfirmationProvider({ children }) {
  const [modalState, setModalState] = useState({
    isOpen: false,
    title: 'Please Confirm',
    message: '',
    description: null,
    confirmText: 'Confirm',
    cancelText: 'Cancel',
    variant: 'danger',
    icon: null,
    isLoading: false,
  });

  const resolverRef = useRef(null);

  const confirm = useCallback((options = {}) => {
    return new Promise((resolve) => {
      if (resolverRef.current) {
        resolverRef.current(false);
      }
      resolverRef.current = resolve;

      if (typeof options === 'string') {
        setModalState({
          isOpen: true,
          title: 'Please Confirm',
          message: options,
          description: null,
          confirmText: 'Confirm',
          cancelText: 'Cancel',
          variant: 'danger',
          icon: null,
          isLoading: false,
        });
        return;
      }

      setModalState({
        isOpen: true,
        title: options.title || 'Please Confirm',
        message: options.message || '',
        description: options.description || null,
        confirmText: options.confirmText || 'Confirm',
        cancelText: options.cancelText || 'Cancel',
        variant: options.variant || 'danger',
        icon: options.icon || null,
        isLoading: false,
      });
    });
  }, []);

  const handleConfirm = useCallback(() => {
    setModalState((prev) => ({ ...prev, isOpen: false }));
    if (resolverRef.current) {
      resolverRef.current(true);
      resolverRef.current = null;
    }
  }, []);

  const handleCancel = useCallback(() => {
    setModalState((prev) => ({ ...prev, isOpen: false }));
    if (resolverRef.current) {
      resolverRef.current(false);
      resolverRef.current = null;
    }
  }, []);

  return (
    <ConfirmationContext.Provider value={{ confirm }}>
      {children}
      <ConfirmationModal
        isOpen={modalState.isOpen}
        onClose={handleCancel}
        onConfirm={handleConfirm}
        title={modalState.title}
        message={modalState.message}
        description={modalState.description}
        confirmText={modalState.confirmText}
        cancelText={modalState.cancelText}
        variant={modalState.variant}
        icon={modalState.icon}
        isLoading={modalState.isLoading}
      />
    </ConfirmationContext.Provider>
  );
}

export const useConfirm = () => {
  const context = useContext(ConfirmationContext);
  if (!context) {
    throw new Error('useConfirm must be used within a ConfirmationProvider');
  }
  return context.confirm;
};

export default ConfirmationContext;
