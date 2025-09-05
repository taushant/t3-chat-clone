'use client';

import { ReactNode } from 'react';
import { ToastContainer, useToast } from '@/components/ui/toast';

interface ToastProviderProps {
  children: ReactNode;
}

export function ToastProvider({ children }: ToastProviderProps) {
  const { toasts, removeToast } = useToast();

  return (
    <>
      {children}
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </>
  );
}

// Export the hook for use in components
export { useToast } from '@/components/ui/toast';
