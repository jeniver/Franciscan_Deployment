import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { HomeIcon, ReceiptIcon, DoorOpenIcon, BedIcon, FileTextIcon, PenToolIcon } from 'lucide-react';

interface MenuItem {
  label: string;
  path: string;
  icon: React.ReactNode;
}

interface SidebarProps {
  isOpen: boolean;
}

export function Sidebar({
  isOpen
}: SidebarProps) {
  const navigate = useNavigate();
  const location = useLocation();
  
  const menuItems: MenuItem[] = [
    {
      label: 'Niche',
      path: '/niche',
      icon: <HomeIcon className="w-5 h-5" />
    },
      {
      label: 'Inscriptions',
      path: '/inscriptions',
      icon: <PenToolIcon className="w-5 h-5" />
    },
      {
      label: 'Gates of Life',
      path: '/gates-of-life',
      icon: <DoorOpenIcon className="w-5 h-5" />
    },
    {
      label: 'Wake Room',
      path: '/wake-room',
      icon: <BedIcon className="w-5 h-5" />
    },
    {
      label: 'Receipts & Invoices',
      path: '/receipt',
      icon: <ReceiptIcon className="w-5 h-5" />
    },
    {
      label: 'Reports',
      path: '/reports',
      icon: <FileTextIcon className="w-5 h-5" />
    },
  ];

  const handleMenuClick = (path: string) => {
    // Navigate to the path - this will trigger the route to load
    // Each route component should handle showing the View Application/View All Items view
    navigate(path);
    
    // For niche route, we need to ensure it shows table view
    // This will be handled by the App component's useEffect that watches location changes
  };

  return (
    <aside className={`${isOpen ? 'w-72' : 'w-0'} bg-gradient-to-b from-gray-900 via-gray-800 to-gray-900 min-h-screen shadow-2xl transition-all duration-300 overflow-hidden sticky top-[73px] h-[calc(100vh-73px)]`}>
      <div className={`${isOpen ? 'p-6' : 'p-0'} transition-all duration-300`}>
        <nav className="space-y-2">
          {menuItems.map(item => {
            const isActive = location.pathname.startsWith(item.path);
            return (
              <button 
                key={item.path} 
                onClick={() => handleMenuClick(item.path)} 
                className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all duration-200 ${
                  isActive 
                    ? 'bg-gradient-to-r from-[#8b2828] to-[#7d1f1f] text-white shadow-lg transform scale-105' 
                    : 'text-gray-300 hover:bg-gray-700/60 hover:text-white hover:translate-x-1'
                }`}
              >
                <div className={`${isActive ? 'text-white' : 'text-gray-400'} transition-colors`}>
                  {item.icon}
                </div>
                <span className="font-medium text-sm whitespace-nowrap">
                  {item.label}
                </span>
              </button>
            );
          })}
        </nav>
      </div>
    </aside>
  );
}