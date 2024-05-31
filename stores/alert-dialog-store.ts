import { createStore } from 'zustand/vanilla';

export type AlertDialogState = {
  title: string;
  description: string;
  isOpen: boolean;
  isConfirmed: boolean;
};

export type AlertDialogActions = {
  onOpen: ({
    title,
    description,
  }: {
    title: string;
    description: string;
  }) => void;
  onClose: () => void;
  onConfirm: () => void;
  onReset: () => void;
};

export type AlertDialogStore = AlertDialogState & AlertDialogActions;

export const defaultInitState: AlertDialogState = {
  title: '',
  description: '',
  isOpen: false,
  isConfirmed: false,
};

export const createAlertDialogStore = (
  initState: AlertDialogState = defaultInitState,
) => {
  return createStore<AlertDialogStore>()(set => ({
    ...initState,
    onOpen: ({ title, description }) =>
      set(() => ({ title, description, isOpen: true })),
    onClose: () => set(() => ({ isOpen: false })),
    onConfirm: () => set(() => ({ isOpen: false, isConfirmed: true })),
    onReset: () => set(() => defaultInitState),
  }));
};
