import { Outlet } from 'react-router-dom';
import { Navbar } from '@/components/layout/navbar';

export function AppLayout() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />
      <Outlet />
    </div>
  );
}
