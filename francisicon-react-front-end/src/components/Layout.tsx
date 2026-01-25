import React, { useState } from 'react';
import { MainHeader } from './MainHeader';
import { SubHeader } from './SubHeader';
import { Sidebar } from './Sidebar';
import { MenuIcon } from 'lucide-react';
interface LayoutProps {
  children: React.ReactNode;
  title: string;
}
export function Layout({
  children,
  title
}: LayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  return <div className="w-full min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <MainHeader onMenuClick={() => setSidebarOpen(!sidebarOpen)} />
      <SubHeader title={title} />
      <div className="flex">
        <Sidebar isOpen={sidebarOpen} />
        <main className={`flex-1 transition-all duration-300 ${sidebarOpen ? 'ml-0' : 'ml-0'}`}>
          {children}
        </main>
      </div>
    </div>;
}