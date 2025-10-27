import React, { useEffect, useState } from 'react';
import type { SSHConfig, ConnectionTestResult, SSHKey } from '@shared/types';
import Modal from '../components/Modal';
import LoadingSpinner from '../components/LoadingSpinner';
import { useToast } from '../context/ToastContext';
import '../styles/Configurations.css';

const Configurations: React.FC = () => {
  const [configs, setConfigs] = useState<SSHConfig[]>([]);
  const [keys, setKeys] = useState<SSHKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showTestModal, setShowTestModal] = useState(false);
  const [selectedConfig, setSelectedConfig] = useState<SSHConfig | null>(null);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<ConnectionTestResult | null>(null);
  const { showToast } = useToast();

  // Form state
  const [formHost, setFormHost] = useState('');
  const [formHostname, setFormHostname] = useState('');
  const [formPort, setFormPort] = useState(22);
  const [formUser, setFormUser] = useState('');
  const [formIdentityFile, setFormIdentityFile] = useState('');

  useEffect(() => {
    loadConfigs();
    loadKeys();
  }, []);

  const loadConfigs = async () => {
    setLoading(true);
    try {
      const result = await window.electronAPI.parseConfig();
      if (result.success && result.data) {
        setConfigs(result.data);
      } else {
        showToast(result.error || 'Failed to load SSH configurations', 'error');
      }
    } catch (error) {
      showToast('Failed to load SSH configurations', 'error');
    } finally {
      setLoading(false);
    }
  };

  const loadKeys = async () => {
    try {
      const result = await window.electronAPI.listKeys();
      if (result.success && result.data) {
        setKeys(result.data);
      }
    } catch (error) {
      console.error('Failed to load keys:', error);
    }
  };

  const handleAddConfig = async (e: React.FormEvent) => {
    e.preventDefault();

    const newConfig: SSHConfig = {
      host: formHost,
      hostname: formHostname,
      port: formPort !== 22 ? formPort : undefined,
      user: formUser || undefined,
      identityFile: formIdentityFile || undefined
    };

    try {
      const result = await window.electronAPI.addHostConfig(newConfig);

      if (result.success) {
        showToast('SSH configuration added successfully', 'success');
        setShowAddModal(false);
        loadConfigs();
        resetForm();
      } else {
        showToast(result.error || 'Failed to add SSH configuration', 'error');
      }
    } catch (error) {
      showToast('Failed to add SSH configuration', 'error');
    }
  };

  const handleUpdateConfig = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedConfig) return;

    const updatedConfig: SSHConfig = {
      host: formHost,
      hostname: formHostname,
      port: formPort !== 22 ? formPort : undefined,
      user: formUser || undefined,
      identityFile: formIdentityFile || undefined
    };

    try {
      const result = await window.electronAPI.updateHostConfig(selectedConfig.host, updatedConfig);

      if (result.success) {
        showToast('SSH configuration updated successfully', 'success');
        setShowEditModal(false);
        loadConfigs();
        resetForm();
        setSelectedConfig(null);
      } else {
        showToast(result.error || 'Failed to update SSH configuration', 'error');
      }
    } catch (error) {
      showToast('Failed to update SSH configuration', 'error');
    }
  };

  const handleDeleteConfig = async (config: SSHConfig) => {
    if (!confirm(`Are you sure you want to delete the configuration for "${config.host}"?`)) {
      return;
    }

    try {
      const result = await window.electronAPI.deleteHostConfig(config.host);

      if (result.success) {
        showToast('SSH configuration deleted successfully', 'success');
        loadConfigs();
      } else {
        showToast(result.error || 'Failed to delete SSH configuration', 'error');
      }
    } catch (error) {
      showToast('Failed to delete SSH configuration', 'error');
    }
  };

  const handleTestConnection = async (config: SSHConfig) => {
    setSelectedConfig(config);
    setShowTestModal(true);
    setTesting(true);
    setTestResult(null);

    try {
      const result = await window.electronAPI.testConnection(config.host);

      if (result.success && result.data) {
        setTestResult(result.data);
      } else {
        showToast(result.error || 'Failed to test connection', 'error');
      }
    } catch (error) {
      showToast('Failed to test connection', 'error');
    } finally {
      setTesting(false);
    }
  };

  const openEditModal = (config: SSHConfig) => {
    setSelectedConfig(config);
    setFormHost(config.host);
    setFormHostname(config.hostname);
    setFormPort(config.port || 22);
    setFormUser(config.user || '');
    setFormIdentityFile(config.identityFile || '');
    setShowEditModal(true);
  };

  const resetForm = () => {
    setFormHost('');
    setFormHostname('');
    setFormPort(22);
    setFormUser('');
    setFormIdentityFile('');
  };

  if (loading) {
    return (
      <div className="page">
        <LoadingSpinner size="large" message="Loading SSH configurations..." />
      </div>
    );
  }

  return (
    <div className="page configurations-page">
      <div className="page-header">
        <h2>SSH Configurations</h2>
        <button className="btn-primary" onClick={() => setShowAddModal(true)}>
          + Add Configuration
        </button>
      </div>

      {configs.length === 0 ? (
        <div className="empty-state">
          <p className="empty-state-icon">⚙️</p>
          <h3>No SSH Configurations Found</h3>
          <p>Add your first SSH host configuration to get started.</p>
          <button className="btn-primary" onClick={() => setShowAddModal(true)}>
            Add Your First Configuration
          </button>
        </div>
      ) : (
        <div className="configs-table-container">
          <table className="configs-table">
            <thead>
              <tr>
                <th>Host</th>
                <th>Hostname</th>
                <th>Port</th>
                <th>User</th>
                <th>Identity File</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {configs.map((config) => (
                <tr key={config.host}>
                  <td className="config-host">{config.host}</td>
                  <td>{config.hostname}</td>
                  <td>{config.port || 22}</td>
                  <td>{config.user || '-'}</td>
                  <td className="config-identity">
                    {config.identityFile ? config.identityFile.split('/').pop() : '-'}
                  </td>
                  <td>
                    <div className="table-actions">
                      <button
                        className="btn-icon"
                        onClick={() => handleTestConnection(config)}
                        title="Test Connection"
                      >
                        🔌
                      </button>
                      <button
                        className="btn-icon"
                        onClick={() => openEditModal(config)}
                        title="Edit"
                      >
                        ✏️
                      </button>
                      <button
                        className="btn-icon btn-danger"
                        onClick={() => handleDeleteConfig(config)}
                        title="Delete"
                      >
                        🗑️
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Add Configuration Modal */}
      <Modal
        isOpen={showAddModal}
        onClose={() => {
          setShowAddModal(false);
          resetForm();
        }}
        title="Add SSH Configuration"
      >
        <form onSubmit={handleAddConfig}>
          <div className="form-group">
            <label htmlFor="host">Host Alias *</label>
            <input
              type="text"
              id="host"
              value={formHost}
              onChange={(e) => setFormHost(e.target.value)}
              placeholder="e.g., myserver"
              required
            />
            <span className="form-hint">
              The name you'll use in SSH commands (e.g., ssh myserver)
            </span>
          </div>

          <div className="form-group">
            <label htmlFor="hostname">Hostname or IP Address *</label>
            <input
              type="text"
              id="hostname"
              value={formHostname}
              onChange={(e) => setFormHostname(e.target.value)}
              placeholder="e.g., 192.168.1.100 or example.com"
              required
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="port">Port</label>
              <input
                type="number"
                id="port"
                value={formPort}
                onChange={(e) => setFormPort(parseInt(e.target.value) || 22)}
                placeholder="22"
                min="1"
                max="65535"
              />
            </div>

            <div className="form-group">
              <label htmlFor="user">User</label>
              <input
                type="text"
                id="user"
                value={formUser}
                onChange={(e) => setFormUser(e.target.value)}
                placeholder="e.g., root, admin"
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="identityFile">Identity File (SSH Key)</label>
            <select
              id="identityFile"
              value={formIdentityFile}
              onChange={(e) => setFormIdentityFile(e.target.value)}
            >
              <option value="">-- Select a key (optional) --</option>
              {keys.map((key) => (
                <option key={key.name} value={key.privateKeyPath}>
                  {key.name} ({key.type.toUpperCase()})
                </option>
              ))}
            </select>
            <span className="form-hint">
              Select an SSH key for authentication
            </span>
          </div>

          <div className="modal-footer">
            <button
              type="button"
              className="btn-secondary"
              onClick={() => {
                setShowAddModal(false);
                resetForm();
              }}
            >
              Cancel
            </button>
            <button type="submit" className="btn-primary">
              Add Configuration
            </button>
          </div>
        </form>
      </Modal>

      {/* Edit Configuration Modal */}
      <Modal
        isOpen={showEditModal}
        onClose={() => {
          setShowEditModal(false);
          resetForm();
          setSelectedConfig(null);
        }}
        title="Edit SSH Configuration"
      >
        <form onSubmit={handleUpdateConfig}>
          <div className="form-group">
            <label htmlFor="edit-host">Host Alias *</label>
            <input
              type="text"
              id="edit-host"
              value={formHost}
              onChange={(e) => setFormHost(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="edit-hostname">Hostname or IP Address *</label>
            <input
              type="text"
              id="edit-hostname"
              value={formHostname}
              onChange={(e) => setFormHostname(e.target.value)}
              required
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="edit-port">Port</label>
              <input
                type="number"
                id="edit-port"
                value={formPort}
                onChange={(e) => setFormPort(parseInt(e.target.value) || 22)}
                min="1"
                max="65535"
              />
            </div>

            <div className="form-group">
              <label htmlFor="edit-user">User</label>
              <input
                type="text"
                id="edit-user"
                value={formUser}
                onChange={(e) => setFormUser(e.target.value)}
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="edit-identityFile">Identity File (SSH Key)</label>
            <select
              id="edit-identityFile"
              value={formIdentityFile}
              onChange={(e) => setFormIdentityFile(e.target.value)}
            >
              <option value="">-- Select a key (optional) --</option>
              {keys.map((key) => (
                <option key={key.name} value={key.privateKeyPath}>
                  {key.name} ({key.type.toUpperCase()})
                </option>
              ))}
            </select>
          </div>

          <div className="modal-footer">
            <button
              type="button"
              className="btn-secondary"
              onClick={() => {
                setShowEditModal(false);
                resetForm();
                setSelectedConfig(null);
              }}
            >
              Cancel
            </button>
            <button type="submit" className="btn-primary">
              Update Configuration
            </button>
          </div>
        </form>
      </Modal>

      {/* Test Connection Modal */}
      <Modal
        isOpen={showTestModal}
        onClose={() => {
          setShowTestModal(false);
          setTestResult(null);
          setSelectedConfig(null);
        }}
        title={`Test Connection: ${selectedConfig?.host || ''}`}
      >
        <div className="test-connection-content">
          {testing ? (
            <div className="test-loading">
              <LoadingSpinner size="medium" message="Testing connection..." />
            </div>
          ) : testResult ? (
            <div className={`test-result test-result-${testResult.success ? 'success' : 'error'}`}>
              <div className="test-result-icon">
                {testResult.success ? '✓' : '✕'}
              </div>
              <h3 className="test-result-title">
                {testResult.success ? 'Connection Successful' : 'Connection Failed'}
              </h3>
              <p className="test-result-message">{testResult.message}</p>

              {testResult.connectionTime && (
                <div className="test-detail">
                  <strong>Connection Time:</strong>
                  <span>{testResult.connectionTime}ms</span>
                </div>
              )}

              {testResult.authMethod && (
                <div className="test-detail">
                  <strong>Authentication Method:</strong>
                  <span>{testResult.authMethod}</span>
                </div>
              )}

              {testResult.errorDetails && (
                <div className="test-error-details">
                  <strong>Error Details:</strong>
                  <pre>{testResult.errorDetails}</pre>
                </div>
              )}
            </div>
          ) : null}
        </div>

        <div className="modal-footer">
          <button
            className="btn-secondary"
            onClick={() => {
              setShowTestModal(false);
              setTestResult(null);
              setSelectedConfig(null);
            }}
          >
            Close
          </button>
          {testResult && !testResult.success && selectedConfig && (
            <button
              className="btn-primary"
              onClick={() => handleTestConnection(selectedConfig)}
            >
              Retry
            </button>
          )}
        </div>
      </Modal>
    </div>
  );
};

export default Configurations;
