import React, { useEffect, useState } from 'react';
import type { LogEntry } from '@shared/types';

const Logs: React.FC = () => {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadLogs();
  }, []);

  const loadLogs = async () => {
    setLoading(true);
    try {
      const result = await window.electronAPI.getLogs(100);
      if (result.success && result.data) {
        setLogs(result.data);
      }
    } catch (error) {
      console.error('Failed to load logs:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleClearLogs = async () => {
    if (confirm('Are you sure you want to clear all logs?')) {
      await window.electronAPI.clearLogs();
      loadLogs();
    }
  };

  return (
    <div className="page">
      <div className="page-header">
        <h2>Application Logs</h2>
        <div>
          <button className="btn-secondary" onClick={loadLogs}>🔄 Refresh</button>
          <button className="btn-danger" onClick={handleClearLogs}>Clear Logs</button>
        </div>
      </div>

      {loading ? (
        <p>Loading logs...</p>
      ) : (
        <div className="logs-container">
          {logs.length === 0 ? (
            <p>No logs available.</p>
          ) : (
            <table className="logs-table">
              <thead>
                <tr>
                  <th>Timestamp</th>
                  <th>Level</th>
                  <th>Message</th>
                  <th>Details</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log, index) => (
                  <tr key={index} className={`log-level-${log.level}`}>
                    <td>{new Date(log.timestamp).toLocaleString()}</td>
                    <td>{log.level.toUpperCase()}</td>
                    <td>{log.message}</td>
                    <td>{log.details || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
};

export default Logs;
