import { ReactNode } from 'react';
import AlertDialogModal from '../modals/alert-dialog-modal';

type MainLayoutProps = {
  children: ReactNode;
};

const MainLayout = ({ children }: MainLayoutProps) => {
  return (
    <main className="flex h-full flex-col">
      <AlertDialogModal />
      {children}
    </main>
  );
};

export default MainLayout;
