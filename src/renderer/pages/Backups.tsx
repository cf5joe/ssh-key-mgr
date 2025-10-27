import React, { useEffect, useState } from 'react';
import type { BackupInfo, RestoreOptions } from '@shared/types';
import Modal from '../components/Modal';
import LoadingSpinner from '../components/LoadingSpinner';
import { useToast } from '../context/ToastContext';
import '../styles/Backups.css';

const Backups: React.FC = () => {
  const [backups, setBackups] = useState<BackupInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [showRestoreModal, setShowRestoreModal] = useState(false);
  const [selectedBackup, setSelectedBackup] = useState<BackupInfo | null>(null);
  const [backupDirectory, setBackupDirectory] = useState('');
  const { showToast } = useToast();

  // Restore options
  const [overwriteExisting, setOverwriteExisting] = useState(false);
  const [mergeDuplicates, setMergeDuplicates] = useState(true);
  const [createPreBackup, setCreatePreBackup] = useState(true);

  useEffect(() => {
    // Load backups from default directory (user's documents or downloads)
    const defaultBackupDir = `${process.env.USERPROFILE}\\Documents\\SSHBackups`;
    setBackupDirectory(defaultBackupDir);
    loadBackups(defaultBackupDir);
  }, []);

  const loadBackups = async (directory: string) => {
    if (!directory) return;

    setLoading(true);
    try {
      const result = await window.electronAPI.listBackups(directory);
      if (result.success && result.data) {
        setBackups(result.data);
      } else {
        // Directory might not exist yet, that's okay
        setBackups([]);
      }
    } catch (error) {
      console.error('Failed to load backups:', error);
      setBackups([]);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateBackup = async () => {
    setCreating(true);

    try {
      // Ask user for backup directory
      const result = await window.electronAPI.openDirectoryDialog({
        title: 'Select Backup Location',
        defaultPath: backupDirectory
      });

      if (result.success && result.data) {
        const backupResult = await window.electronAPI.createBackup(result.data);

        if (backupResult.success) {
          showToast('Backup created successfully', 'success');
          setBackupDirectory(result.data);
          loadBackups(result.data);
        } else {
          showToast(backupResult.error || 'Failed to create backup', 'error');
        }
      }
    } catch (error) {
      showToast('Failed to create backup', 'error');
    } finally {
      setCreating(false);
    }
  };

  const handleRestoreBackup = async () => {
    if (!selectedBackup) return;

    setRestoring(true);

    try {
      const options: RestoreOptions = {
        backupPath: selectedBackup.path,
        overwriteExisting,
        mergeDuplicates,
        createBackup: createPreBackup
      };

      const result = await window.electronAPI.restoreBackup(options);

      if (result.success) {
        showToast('Backup restored successfully', 'success');
        setShowRestoreModal(false);
        setSelectedBackup(null);
        // Reload backups if pre-backup was created
        if (createPreBackup) {
          loadBackups(backupDirectory);
        }
      } else {
        showToast(result.error || 'Failed to restore backup', 'error');
      }
    } catch (error) {
      showToast('Failed to restore backup', 'error');
    } finally {
      setRestoring(false);
    }
  };

  const openRestoreModal = (backup: BackupInfo) => {
    setSelectedBackup(backup);
    setShowRestoreModal(true);
  };

  const handleChangeDirectory = async () => {
    try {
      const result = await window.electronAPI.openDirectoryDialog({
        title: 'Select Backup Directory',
        defaultPath: backupDirectory
      });

      if (result.success && result.data) {
        setBackupDirectory(result.data);
        loadBackups(result.data);
      }
    } catch (error) {
      showToast('Failed to change directory', 'error');
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  return (
    <div className="page backups-page">
      <div className="page-header">
        <h2>Backups</h2>
        <button
          className="btn-primary"
          onClick={handleCreateBackup}
          disabled={creating}
        >
          {creating ? 'Creating...' : 'Create Backup'}
        </button>
      </div>

      <div className="backup-directory">
        <div className="directory-info">
          <label>Backup Directory:</label>
          <span className="directory-path">{backupDirectory || 'Not set'}</span>
        </div>
        <button className="btn-secondary" onClick={handleChangeDirectory}>
          Change Directory
        </button>
      </div>

      {loading ? (
        <LoadingSpinner size="large" message="Loading backups..." />
      ) : backups.length === 0 ? (
        <div className="empty-state">
          <p className="empty-state-icon">💾</p>
          <h3>No Backups Found</h3>
          <p>Create your first backup to protect your SSH keys and configurations.</p>
          <button className="btn-primary" onClick={handleCreateBackup} disabled={creating}>
            {creating ? 'Creating...' : 'Create Your First Backup'}
          </button>
        </div>
      ) : (
        <div className="backups-list">
          {backups.map((backup, index) => (
            <div key={index} className="backup-card">
              <div className="backup-card-header">
                <div className="backup-icon">💾</div>
                <div className="backup-info">
                  <div className="backup-date">
                    {new Date(backup.metadata.createdAt).toLocaleString()}
                  </div>
                  <div className="backup-size">{formatFileSize(backup.size)}</div>
                </div>
              </div>

              <div className="backup-card-body">
                <div className="backup-detail">
                  <span className="backup-label">Username:</span>
                  <span className="backup-value">{backup.metadata.username}</span>
                </div>
                <div className="backup-detail">
                  <span className="backup-label">Computer:</span>
                  <span className="backup-value">{backup.metadata.computerName}</span>
                </div>
                <div className="backup-detail">
                  <span className="backup-label">Files:</span>
                  <span className="backup-value">{backup.metadata.fileCount} files</span>
                </div>
                <div className="backup-detail">
                  <span className="backup-label">Path:</span>
                  <span className="backup-value backup-path">{backup.path}</span>
                </div>
              </div>

              <div className="backup-card-actions">
                <button
                  className="btn-primary"
                  onClick={() => openRestoreModal(backup)}
                >
                  Restore
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Restore Modal */}
      <Modal
        isOpen={showRestoreModal}
        onClose={() => {
          setShowRestoreModal(false);
          setSelectedBackup(null);
        }}
        title="Restore Backup"
        maxWidth="700px"
      >
        {selectedBackup && (
          <div className="restore-modal-content">
            <div className="restore-warning">
              <div className="warning-icon">⚠️</div>
              <p>
                This will restore files from the backup. Make sure you understand the restore options below.
              </p>
            </div>

            <div className="restore-backup-info">
              <h4>Backup Information</h4>
              <div className="restore-detail">
                <strong>Created:</strong>
                <span>{new Date(selectedBackup.metadata.createdAt).toLocaleString()}</span>
              </div>
              <div className="restore-detail">
                <strong>From:</strong>
                <span>{selectedBackup.metadata.username}@{selectedBackup.metadata.computerName}</span>
              </div>
              <div className="restore-detail">
                <strong>Files:</strong>
                <span>{selectedBackup.metadata.fileCount} files</span>
              </div>
              <div className="restore-detail">
                <strong>Size:</strong>
                <span>{formatFileSize(selectedBackup.size)}</span>
              </div>
            </div>

            <div className="restore-options">
              <h4>Restore Options</h4>

              <div className="checkbox-group">
                <input
                  type="checkbox"
                  id="createPreBackup"
                  checked={createPreBackup}
                  onChange={(e) => setCreatePreBackup(e.target.checked)}
                />
                <label htmlFor="createPreBackup">
                  Create backup of current state before restoring (recommended)
                </label>
              </div>

              <div className="checkbox-group">
                <input
                  type="checkbox"
                  id="overwriteExisting"
                  checked={overwriteExisting}
                  onChange={(e) => {
                    setOverwriteExisting(e.target.checked);
                    if (e.target.checked) {
                      setMergeDuplicates(false);
                    }
                  }}
                />
                <label htmlFor="overwriteExisting">
                  Overwrite existing files
                </label>
              </div>

              <div className="checkbox-group">
                <input
                  type="checkbox"
                  id="mergeDuplicates"
                  checked={mergeDuplicates}
                  onChange={(e) => {
                    setMergeDuplicates(e.target.checked);
                    if (e.target.checked) {
                      setOverwriteExisting(false);
                    }
                  }}
                  disabled={overwriteExisting}
                />
                <label htmlFor="mergeDuplicates">
                  Keep both files if duplicates exist (merge)
                </label>
              </div>

              {!overwriteExisting && !mergeDuplicates && (
                <p className="restore-hint">
                  Files that already exist will be skipped.
                </p>
              )}
            </div>

            <div className="modal-footer">
              <button
                type="button"
                className="btn-secondary"
                onClick={() => {
                  setShowRestoreModal(false);
                  setSelectedBackup(null);
                }}
                disabled={restoring}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn-primary"
                onClick={handleRestoreBackup}
                disabled={restoring}
              >
                {restoring ? 'Restoring...' : 'Restore Backup'}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default Backups;
