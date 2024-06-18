import { MultiplePlayProvider } from '@/providers/multiple-play-provider';

export default function MultiplePlayLayout({
  children, // will be a page or nested layout
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <MultiplePlayProvider>{children}</MultiplePlayProvider>
    </>
  );
}
