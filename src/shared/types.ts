// Shared TypeScript types between main and renderer processes

export type KeyType = 'rsa' | 'ed25519' | 'ecdsa' | 'dsa';

export interface SSHKey {
  name: string;
  type: KeyType;
  fingerprint: string;
  publicKeyPath: string;
  privateKeyPath: string;
  size?: number;
  comment?: string;
  hasPassphrase: boolean;
  createdAt?: Date;
  modifiedAt?: Date;
  associatedHosts: string[]; // Hosts in SSH config that use this key
  isMapped: boolean; // Whether this key is referenced in SSH config
}

export interface KeyGenOptions {
  type: KeyType;
  bits?: number; // For RSA and ECDSA
  name: string;
  passphrase?: string;
  comment?: string;
  outputPath?: string;
}

export interface SSHConfig {
  host: string;
  hostname: string;
  port?: number;
  user?: string;
  identityFile?: string;
  preferredAuthentications?: string;
  additionalOptions?: Record<string, string>;
}

export interface ConnectionTestResult {
  success: boolean;
  message: string;
  authMethod?: string;
  connectionTime?: number;
  error?: string;
  errorDetails?: string;
}

export interface PrerequisiteCheck {
  name: string;
  status: 'pass' | 'fail' | 'warning';
  message: string;
  details?: string;
  fixable?: boolean;
}

export interface PrerequisitesResult {
  opensshInstalled: PrerequisiteCheck;
  sshDirectoryExists: PrerequisiteCheck;
  sshConfigExists: PrerequisiteCheck;
  permissionsCorrect: PrerequisiteCheck;
  pathConfigured: PrerequisiteCheck;
}

export interface PermissionStatus {
  path: string;
  currentPermissions: string;
  expectedPermissions: string;
  isCorrect: boolean;
  fileType: 'directory' | 'private-key' | 'public-key' | 'config' | 'other';
}

export interface BackupMetadata {
  createdAt: string;
  username: string;
  computerName: string;
  appVersion: string;
  files: string[];
  fileCount: number;
}

export interface BackupInfo {
  path: string;
  metadata: BackupMetadata;
  size: number;
}

export interface RestoreOptions {
  backupPath: string;
  overwriteExisting: boolean;
  mergeDuplicates: boolean;
  createBackup: boolean;
}

export interface AppSettings {
  theme: 'light' | 'dark' | 'system';
  sshTimeout: number;
  autoFixPermissions: boolean;
  confirmDialogs: boolean;
  customSSHPath?: string;
  logLevel: 'info' | 'warn' | 'error' | 'debug';
  windowBounds?: {
    width: number;
    height: number;
    x?: number;
    y?: number;
  };
  lastBackupPath?: string;
}

export interface LogEntry {
  timestamp: string;
  level: 'info' | 'warn' | 'error' | 'debug';
  message: string;
  details?: string;
}

export interface APIResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}
