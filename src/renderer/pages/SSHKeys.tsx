import React, { useEffect, useState } from 'react';
import type { SSHKey, KeyGenOptions } from '@shared/types';
import { KEY_TYPES } from '@shared/renderer-constants';
import Modal from '../components/Modal';
import LoadingSpinner from '../components/LoadingSpinner';
import { useToast } from '../context/ToastContext';
import '../styles/SSHKeys.css';

const SSHKeys: React.FC = () => {
  const [keys, setKeys] = useState<SSHKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showKeyDetailsModal, setShowKeyDetailsModal] = useState(false);
  const [selectedKey, setSelectedKey] = useState<SSHKey | null>(null);
  const [generating, setGenerating] = useState(false);
  const { showToast } = useToast();

  // Form state for key generation
  const [keyType, setKeyType] = useState<'ed25519' | 'rsa' | 'ecdsa' | 'dsa'>('ed25519');
  const [keyBits, setKeyBits] = useState(4096);
  const [keyName, setKeyName] = useState('id_ed25519');
  const [passphrase, setPassphrase] = useState('');
  const [comment, setComment] = useState('');

  useEffect(() => {
    loadKeys();
  }, []);

  const loadKeys = async () => {
    setLoading(true);
    try {
      const result = await window.electronAPI.listKeys();
      if (result.success && result.data) {
        setKeys(result.data);
      } else {
        showToast(result.error || 'Failed to load SSH keys', 'error');
      }
    } catch (error) {
      showToast('Failed to load SSH keys', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateKey = async (e: React.FormEvent) => {
    e.preventDefault();
    setGenerating(true);

    try {
      const options: KeyGenOptions = {
        type: keyType,
        bits: keyType === 'rsa' || keyType === 'ecdsa' ? keyBits : undefined,
        name: keyName,
        passphrase: passphrase || undefined,
        comment: comment || undefined
      };

      const result = await window.electronAPI.generateKey(options);

      if (result.success) {
        showToast('SSH key generated successfully', 'success');
        setShowGenerateModal(false);
        loadKeys();
        resetGenerateForm();
      } else {
        showToast(result.error || 'Failed to generate SSH key', 'error');
      }
    } catch (error) {
      showToast('Failed to generate SSH key', 'error');
    } finally {
      setGenerating(false);
    }
  };

  const handleDeleteKey = async (key: SSHKey) => {
    if (!confirm(`Are you sure you want to delete the key "${key.name}"? This cannot be undone.`)) {
      return;
    }

    try {
      const result = await window.electronAPI.deleteKey(key.name);

      if (result.success) {
        showToast('SSH key deleted successfully', 'success');
        loadKeys();
      } else {
        showToast(result.error || 'Failed to delete SSH key', 'error');
      }
    } catch (error) {
      showToast('Failed to delete SSH key', 'error');
    }
  };

  const handleImportKey = async () => {
    try {
      const result = await window.electronAPI.openFileDialog({
        title: 'Select SSH Private Key',
        filters: [
          { name: 'All Files', extensions: ['*'] }
        ]
      });

      if (result.success && result.data) {
        const importResult = await window.electronAPI.importKey(result.data);

        if (importResult.success) {
          showToast('SSH key imported successfully', 'success');
          setShowImportModal(false);
          loadKeys();
        } else {
          showToast(importResult.error || 'Failed to import SSH key', 'error');
        }
      }
    } catch (error) {
      showToast('Failed to import SSH key', 'error');
    }
  };

  const handleExportKey = async (key: SSHKey) => {
    try {
      const result = await window.electronAPI.saveFileDialog({
        title: 'Export SSH Key',
        defaultPath: key.name,
        filters: [
          { name: 'All Files', extensions: ['*'] }
        ]
      });

      if (result.success && result.data) {
        const exportResult = await window.electronAPI.exportKey(key.name, result.data);

        if (exportResult.success) {
          showToast('SSH key exported successfully', 'success');
        } else {
          showToast(exportResult.error || 'Failed to export SSH key', 'error');
        }
      }
    } catch (error) {
      showToast('Failed to export SSH key', 'error');
    }
  };

  const resetGenerateForm = () => {
    setKeyType('ed25519');
    setKeyBits(4096);
    setKeyName('id_ed25519');
    setPassphrase('');
    setComment('');
  };

  const handleKeyTypeChange = (type: 'ed25519' | 'rsa' | 'ecdsa' | 'dsa') => {
    setKeyType(type);
    // Update default name and bits
    if (type === 'ed25519') {
      setKeyName('id_ed25519');
      setKeyBits(256);
    } else if (type === 'rsa') {
      setKeyName('id_rsa');
      setKeyBits(4096);
    } else if (type === 'ecdsa') {
      setKeyName('id_ecdsa');
      setKeyBits(521);
    } else if (type === 'dsa') {
      setKeyName('id_dsa');
      setKeyBits(1024);
    }
  };

  const viewKeyDetails = (key: SSHKey) => {
    setSelectedKey(key);
    setShowKeyDetailsModal(true);
  };

  if (loading) {
    return (
      <div className="page">
        <LoadingSpinner size="large" message="Loading SSH keys..." />
      </div>
    );
  }

  return (
    <div className="page ssh-keys-page">
      <div className="page-header">
        <h2>SSH Keys</h2>
        <div className="header-actions">
          <button className="btn-secondary" onClick={() => setShowImportModal(true)}>
            Import Key
          </button>
          <button className="btn-primary" onClick={() => setShowGenerateModal(true)}>
            + Generate New Key
          </button>
        </div>
      </div>

      {keys.length === 0 ? (
        <div className="empty-state">
          <p className="empty-state-icon">🔑</p>
          <h3>No SSH Keys Found</h3>
          <p>Generate a new SSH key or import an existing one to get started.</p>
          <button className="btn-primary" onClick={() => setShowGenerateModal(true)}>
            Generate Your First Key
          </button>
        </div>
      ) : (
        <div className="keys-grid">
          {keys.map((key) => (
            <div key={key.name} className="key-card">
              <div className="key-card-header">
                <div className="key-type-badge">{key.type.toUpperCase()}</div>
                <div className="key-name">{key.name}</div>
              </div>

              <div className="key-card-body">
                <div className="key-info-row">
                  <span className="key-label">Fingerprint:</span>
                  <span className="key-value key-fingerprint">{key.fingerprint}</span>
                </div>

                {key.comment && (
                  <div className="key-info-row">
                    <span className="key-label">Comment:</span>
                    <span className="key-value">{key.comment}</span>
                  </div>
                )}

                <div className="key-info-row">
                  <span className="key-label">Status:</span>
                  <span className={`key-badge ${key.isMapped ? 'badge-mapped' : 'badge-unmapped'}`}>
                    {key.isMapped ? '✓ Mapped' : '○ Unmapped'}
                  </span>
                </div>

                {key.isMapped && key.associatedHosts.length > 0 && (
                  <div className="key-info-row">
                    <span className="key-label">Used by:</span>
                    <span className="key-value">{key.associatedHosts.join(', ')}</span>
                  </div>
                )}

                <div className="key-info-row">
                  <span className="key-label">Passphrase:</span>
                  <span className={`key-badge ${key.hasPassphrase ? 'badge-protected' : 'badge-none'}`}>
                    {key.hasPassphrase ? 'Protected' : 'None'}
                  </span>
                </div>

                {key.modifiedAt && (
                  <div className="key-info-row">
                    <span className="key-label">Modified:</span>
                    <span className="key-value">{new Date(key.modifiedAt).toLocaleDateString()}</span>
                  </div>
                )}
              </div>

              <div className="key-card-actions">
                <button className="btn-icon" onClick={() => viewKeyDetails(key)} title="View Details">
                  👁️
                </button>
                <button className="btn-icon" onClick={() => handleExportKey(key)} title="Export">
                  📤
                </button>
                <button className="btn-icon btn-danger" onClick={() => handleDeleteKey(key)} title="Delete">
                  🗑️
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Generate Key Modal */}
      <Modal
        isOpen={showGenerateModal}
        onClose={() => setShowGenerateModal(false)}
        title="Generate New SSH Key"
      >
        <form onSubmit={handleGenerateKey}>
          <div className="form-group">
            <label htmlFor="keyType">Key Type *</label>
            <select
              id="keyType"
              value={keyType}
              onChange={(e) => handleKeyTypeChange(e.target.value as any)}
              required
            >
              {Object.entries(KEY_TYPES).map(([type, info]) => (
                <option key={type} value={type}>
                  {info.name} - {info.description}
                </option>
              ))}
            </select>
            <span className="form-hint">
              {KEY_TYPES[keyType].recommended ? '✓ Recommended' : 'Not recommended for new keys'}
            </span>
          </div>

          {(keyType === 'rsa' || keyType === 'ecdsa') && (
            <div className="form-group">
              <label htmlFor="keyBits">Key Size (bits) *</label>
              <select
                id="keyBits"
                value={keyBits}
                onChange={(e) => setKeyBits(parseInt(e.target.value))}
                required
              >
                {KEY_TYPES[keyType].availableBits.map((bits) => (
                  <option key={bits} value={bits}>{bits}</option>
                ))}
              </select>
            </div>
          )}

          <div className="form-group">
            <label htmlFor="keyName">Key Name *</label>
            <input
              type="text"
              id="keyName"
              value={keyName}
              onChange={(e) => setKeyName(e.target.value)}
              placeholder="e.g., id_ed25519"
              required
            />
            <span className="form-hint">
              Name of the key file (will be saved in .ssh directory)
            </span>
          </div>

          <div className="form-group">
            <label htmlFor="passphrase">Passphrase (optional)</label>
            <input
              type="password"
              id="passphrase"
              value={passphrase}
              onChange={(e) => setPassphrase(e.target.value)}
              placeholder="Leave empty for no passphrase"
            />
            <span className="form-hint">
              Recommended for additional security
            </span>
          </div>

          <div className="form-group">
            <label htmlFor="comment">Comment (optional)</label>
            <input
              type="text"
              id="comment"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="e.g., your@email.com"
            />
          </div>

          <div className="modal-footer">
            <button
              type="button"
              className="btn-secondary"
              onClick={() => setShowGenerateModal(false)}
              disabled={generating}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn-primary"
              disabled={generating}
            >
              {generating ? 'Generating...' : 'Generate Key'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Import Key Modal */}
      <Modal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        title="Import SSH Key"
      >
        <div className="import-instructions">
          <p>Click the button below to select an SSH private key file to import.</p>
          <p className="warning-text">⚠️ Make sure you have the corresponding public key (.pub file) in the same directory.</p>
        </div>
        <div className="modal-footer">
          <button
            type="button"
            className="btn-secondary"
            onClick={() => setShowImportModal(false)}
          >
            Cancel
          </button>
          <button
            type="button"
            className="btn-primary"
            onClick={handleImportKey}
          >
            Select Key File
          </button>
        </div>
      </Modal>

      {/* Key Details Modal */}
      {selectedKey && (
        <Modal
          isOpen={showKeyDetailsModal}
          onClose={() => setShowKeyDetailsModal(false)}
          title={`Key Details: ${selectedKey.name}`}
        >
          <div className="key-details">
            <div className="detail-row">
              <strong>Name:</strong>
              <span>{selectedKey.name}</span>
            </div>
            <div className="detail-row">
              <strong>Type:</strong>
              <span>{selectedKey.type.toUpperCase()}</span>
            </div>
            <div className="detail-row">
              <strong>Fingerprint:</strong>
              <span className="monospace">{selectedKey.fingerprint}</span>
            </div>
            <div className="detail-row">
              <strong>Private Key Path:</strong>
              <span className="monospace">{selectedKey.privateKeyPath}</span>
            </div>
            <div className="detail-row">
              <strong>Public Key Path:</strong>
              <span className="monospace">{selectedKey.publicKeyPath}</span>
            </div>
            {selectedKey.comment && (
              <div className="detail-row">
                <strong>Comment:</strong>
                <span>{selectedKey.comment}</span>
              </div>
            )}
            <div className="detail-row">
              <strong>Passphrase Protected:</strong>
              <span>{selectedKey.hasPassphrase ? 'Yes' : 'No'}</span>
            </div>
            {selectedKey.size && (
              <div className="detail-row">
                <strong>File Size:</strong>
                <span>{(selectedKey.size / 1024).toFixed(2)} KB</span>
              </div>
            )}
            {selectedKey.createdAt && (
              <div className="detail-row">
                <strong>Created:</strong>
                <span>{new Date(selectedKey.createdAt).toLocaleString()}</span>
              </div>
            )}
            {selectedKey.modifiedAt && (
              <div className="detail-row">
                <strong>Last Modified:</strong>
                <span>{new Date(selectedKey.modifiedAt).toLocaleString()}</span>
              </div>
            )}
          </div>
          <div className="modal-footer">
            <button
              className="btn-secondary"
              onClick={() => setShowKeyDetailsModal(false)}
            >
              Close
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default SSHKeys;
