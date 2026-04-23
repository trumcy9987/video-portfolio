import NavBar from '@/components/NavBar';

export default function FrontLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <NavBar />
      {children}
    </>
  );
}