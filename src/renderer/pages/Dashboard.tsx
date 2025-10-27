import React, { useEffect, useState } from 'react';
import type { PrerequisitesResult } from '@shared/types';
import LoadingSpinner from '../components/LoadingSpinner';
import '../styles/Dashboard.css';

const Dashboard: React.FC = () => {
  const [prerequisites, setPrerequisites] = useState<PrerequisitesResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [keysCount, setKeysCount] = useState(0);
  const [configsCount, setConfigsCount] = useState(0);

  useEffect(() => {
    loadAll();
  }, []);

  const loadAll = async () => {
    setLoading(true);
    await Promise.all([
      loadPrerequisites(),
      loadStats()
    ]);
    setLoading(false);
  };

  const loadPrerequisites = async () => {
    try {
      const result = await window.electronAPI.checkPrerequisites();
      if (result.success && result.data) {
        setPrerequisites(result.data);
      }
    } catch (error) {
      console.error('Failed to load prerequisites:', error);
    }
  };

  const loadStats = async () => {
    try {
      // Load SSH keys count
      const keysResult = await window.electronAPI.listKeys();
      if (keysResult.success && keysResult.data) {
        setKeysCount(keysResult.data.length);
      }

      // Load configurations count
      const configsResult = await window.electronAPI.parseConfig();
      if (configsResult.success && configsResult.data) {
        setConfigsCount(configsResult.data.length);
      }
    } catch (error) {
      console.error('Failed to load stats:', error);
    }
  };

  const getStatusIcon = (status: 'pass' | 'fail' | 'warning') => {
    switch (status) {
      case 'pass':
        return '✅';
      case 'fail':
        return '❌';
      case 'warning':
        return '⚠️';
    }
  };

  if (loading) {
    return (
      <div className="page dashboard">
        <LoadingSpinner size="large" message="Loading dashboard..." />
      </div>
    );
  }

  return (
    <div className="page dashboard">
      <div className="page-header">
        <h2>Dashboard</h2>
        <button className="btn-refresh" onClick={loadAll}>
          🔄 Refresh
        </button>
      </div>

      <div className="dashboard-section">
        <h3>System Status</h3>
        {prerequisites && (
          <div className="status-grid">
            {Object.entries(prerequisites).map(([key, check]) => (
              <div key={key} className={`status-card status-${check.status}`}>
                <div className="status-card-header">
                  <span className="status-icon">{getStatusIcon(check.status)}</span>
                  <h4>{check.name}</h4>
                </div>
                <p className="status-message">{check.message}</p>
                {check.details && (
                  <p className="status-details">{check.details}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="dashboard-section">
        <h3>Quick Stats</h3>
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-value">{keysCount}</div>
            <div className="stat-label">SSH Keys</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{configsCount}</div>
            <div className="stat-label">Configurations</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">
              {prerequisites?.opensshInstalled.status === 'pass' ? '✓' : '✕'}
            </div>
            <div className="stat-label">OpenSSH</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
