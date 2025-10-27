import React from 'react';
import '../styles/Sidebar.css';

type Page = 'dashboard' | 'keys' | 'configurations' | 'backups' | 'settings' | 'logs';

interface SidebarProps {
  currentPage: Page;
  onNavigate: (page: Page) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ currentPage, onNavigate }) => {
  const menuItems: { id: Page; label: string; icon: string }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: '📊' },
    { id: 'keys', label: 'SSH Keys', icon: '🔑' },
    { id: 'configurations', label: 'Configurations', icon: '⚙️' },
    { id: 'backups', label: 'Backups', icon: '💾' },
    { id: 'settings', label: 'Settings', icon: '🔧' },
    { id: 'logs', label: 'Logs', icon: '📝' }
  ];

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <h1 className="sidebar-title">SSH Key Manager</h1>
      </div>
      <nav className="sidebar-nav">
        {menuItems.map((item) => (
          <button
            key={item.id}
            className={`sidebar-nav-item ${currentPage === item.id ? 'active' : ''}`}
            onClick={() => onNavigate(item.id)}
          >
            <span className="sidebar-nav-icon">{item.icon}</span>
            <span className="sidebar-nav-label">{item.label}</span>
          </button>
        ))}
      </nav>
    </aside>
  );
};

export default Sidebar;
