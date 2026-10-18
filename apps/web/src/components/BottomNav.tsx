import React from 'react';

export type TabKey = 'learn' | 'map' | 'cards' | 'rank';

interface BottomNavProps {
  currentTab: TabKey;
  onSelectTab: (tab: TabKey) => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({ currentTab, onSelectTab }) => {
  const tabs = [
    { key: 'learn' as TabKey, label: 'Belajar', icon: '🏠' },
    { key: 'map' as TabKey, label: 'Peta Level', icon: '🗺️' },
    { key: 'cards' as TabKey, label: 'Koleksi', icon: '🃏' },
    { key: 'rank' as TabKey, label: 'Peringkat', icon: '🏆' },
  ];

  return (
    <nav className="bottom-nav">
      {tabs.map((tab) => {
        const isActive = currentTab === tab.key;
        return (
          <button
            key={tab.key}
            className={`nav-item ${isActive ? 'active' : ''}`}
            onClick={() => onSelectTab(tab.key)}
            aria-label={tab.label}
          >
            <span className="nav-icon">{tab.icon}</span>
            <span>{tab.label}</span>
          </button>
        );
      })}
    </nav>
  );
};
