'use client';

import { type ReactNode, createContext, useContext, useRef } from 'react';
import { type StoreApi, useStore } from 'zustand';
import {
  type AlertDialogStore,
  createAlertDialogStore,
} from '@/stores/alert-dialog-store';

export const AlertDialogStoreContext =
  createContext<StoreApi<AlertDialogStore> | null>(null);

export type AlertDialogStoreProviderProps = {
  children: ReactNode;
};

export const AlertDialogStoreProvider = ({
  children,
}: AlertDialogStoreProviderProps) => {
  const storeRef = useRef<StoreApi<AlertDialogStore>>();
  if (!storeRef.current) {
    storeRef.current = createAlertDialogStore();
  }

  return (
    <AlertDialogStoreContext.Provider value={storeRef.current}>
      {children}
    </AlertDialogStoreContext.Provider>
  );
};

export const useAlertDialogStore = <T,>(
  selector: (store: AlertDialogStore) => T,
): T => {
  const alertDialogStoreContext = useContext(AlertDialogStoreContext);

  if (!alertDialogStoreContext) {
    throw new Error(
      `useAlertDialogStore must be use within AlertDialogStoreProvider`,
    );
  }

  return useStore(alertDialogStoreContext, selector);
};
