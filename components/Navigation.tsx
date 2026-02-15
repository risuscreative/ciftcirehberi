import React from 'react';
import { Home, PlusCircle, Sprout, CalendarCheck, Settings } from 'lucide-react';

interface NavigationProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

const Navigation: React.FC<NavigationProps> = ({ activeTab, setActiveTab }) => {
  const navItems = [
    { id: 'home', icon: Home, label: 'Ana Sayfa' },
    { id: 'fields', icon: Sprout, label: 'Tarlalarım' },
    { id: 'add', icon: PlusCircle, label: 'Ekle', isAction: true },
    { id: 'calendar', icon: CalendarCheck, label: 'Takvim' },
    { id: 'analysis', icon: Settings, label: 'Analiz' },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-stone-200 pb-safe pt-2 px-4 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] z-50">
      <div className="flex justify-between items-end pb-2">
        {navItems.map((item) => {
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`flex flex-col items-center justify-center w-full transition-all duration-200 ${
                item.isAction ? '-mt-6' : ''
              }`}
            >
              <div
                className={`flex items-center justify-center rounded-full transition-all ${
                  item.isAction
                    ? 'w-14 h-14 bg-green-600 shadow-lg shadow-green-200 text-white'
                    : isActive
                    ? 'text-green-600'
                    : 'text-stone-400'
                }`}
              >
                <item.icon size={item.isAction ? 32 : 24} strokeWidth={item.isAction ? 2 : isActive ? 2.5 : 2} />
              </div>
              <span
                className={`text-xs mt-1 font-medium ${
                  isActive ? 'text-green-700' : 'text-stone-400'
                }`}
              >
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default Navigation;