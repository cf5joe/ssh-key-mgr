import React, { useEffect, useState } from 'react';
import type { PrerequisitesResult } from '@shared/types';
import '../styles/Dashboard.css';

const Dashboard: React.FC = () => {
  const [prerequisites, setPrerequisites] = useState<PrerequisitesResult | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPrerequisites();
  }, []);

  const loadPrerequisites = async () => {
    setLoading(true);
    try {
      const result = await window.electronAPI.checkPrerequisites();
      if (result.success && result.data) {
        setPrerequisites(result.data);
      }
    } catch (error) {
      console.error('Failed to load prerequisites:', error);
    } finally {
      setLoading(false);
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
        <h2>Dashboard</h2>
        <p>Loading system status...</p>
      </div>
    );
  }

  return (
    <div className="page dashboard">
      <div className="page-header">
        <h2>Dashboard</h2>
        <button className="btn-refresh" onClick={loadPrerequisites}>
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
            <div className="stat-value">0</div>
            <div className="stat-label">SSH Keys</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">0</div>
            <div className="stat-label">Configurations</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">0</div>
            <div className="stat-label">Backups</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
