/**
 * Permission System Types
 * 
 * TypeScript definitions for the permission system
 */

export type PermissionType = 
  | 'read'      // Read files (auto-allow)
  | 'write'     // Write new files (ask)
  | 'edit'      // Edit existing files (ask)
  | 'delete'    // Delete files (ask)
  | 'bash'      // Run shell commands (ask)
  | 'task'      // Delegate to subagent (ask)
  | 'git'       // Git operations (ask)
  | 'webfetch'  // Fetch URLs (auto-allow)
  | 'websearch' // Search web (auto-allow)
  | 'glob'      // Find files (auto-allow)
  | 'grep';     // Search content (auto-allow)

export interface PermissionRequest {
  id: string;
  type: PermissionType;
  pattern: string;           // File path, command, etc.
  description: string;       // Human-readable
  metadata?: {
    filePath?: string;
    command?: string;
    diff?: string;           // For edit permissions
    preview?: string;        // Content preview
  };
}

export type PermissionResponse = 'once' | 'always' | 'reject';

export interface PermissionRule {
  permission: PermissionType;
  pattern: string;           // Can use wildcards like "src/*.ts"
  action: 'allow' | 'deny' | 'ask';
}

export type PermissionRuleset = PermissionRule[];
