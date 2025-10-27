import React, { useState } from 'react';
import Sidebar from './components/Sidebar';
import Dashboard from './pages/Dashboard';
import SSHKeys from './pages/SSHKeys';
import Configurations from './pages/Configurations';
import Backups from './pages/Backups';
import Settings from './pages/Settings';
import Logs from './pages/Logs';
import { ThemeProvider } from './context/ThemeContext';
import { ToastProvider } from './context/ToastContext';
import './styles/App.css';

type Page = 'dashboard' | 'keys' | 'configurations' | 'backups' | 'settings' | 'logs';

const App: React.FC = () => {
  const [currentPage, setCurrentPage] = useState<Page>('dashboard');

  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return <Dashboard />;
      case 'keys':
        return <SSHKeys />;
      case 'configurations':
        return <Configurations />;
      case 'backups':
        return <Backups />;
      case 'settings':
        return <Settings />;
      case 'logs':
        return <Logs />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <ThemeProvider>
      <ToastProvider>
        <div className="app">
          <Sidebar currentPage={currentPage} onNavigate={setCurrentPage} />
          <main className="main-content">
            {renderPage()}
          </main>
        </div>
      </ToastProvider>
    </ThemeProvider>
  );
};

export default App;
