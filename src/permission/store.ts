/**
 * Permission Store
 * 
 * Manages permission grants and rules
 */

import type { PermissionRequest, PermissionResponse, PermissionRuleset, PermissionType } from './types.js';

export class PermissionStore {
  private approved: Map<string, boolean> = new Map();
  private rules: PermissionRuleset = [];
  
  constructor() {
    this.load();
  }
  
  /**
   * Check if permission is already granted
   */
  check(request: PermissionRequest): boolean {
    // Check exact match first
    const exactKey = `${request.type}:${request.pattern}`;
    if (this.approved.has(exactKey)) {
      return this.approved.get(exactKey)!;
    }
    
    // Check wildcard pattern
    const wildcardKey = `${request.type}:*`;
    if (this.approved.has(wildcardKey)) {
      return this.approved.get(wildcardKey)!;
    }
    
    // Check rules
    for (const rule of this.rules) {
      if (this.matchesRule(request, rule)) {
        return rule.action === 'allow';
      }
    }
    
    return false;
  }
  
  /**
   * Grant permission
   */
  grant(request: PermissionRequest, duration: PermissionResponse): void {
    if (duration === 'always') {
      // Grant wildcard for this permission type
      const wildcardKey = `${request.type}:*`;
      this.approved.set(wildcardKey, true);
    } else if (duration === 'once') {
      // Grant for this specific pattern
      const key = `${request.type}:${request.pattern}`;
      this.approved.set(key, true);
    }
    // 'reject' doesn't grant anything
    
    this.save();
  }
  
  /**
   * Revoke permission
   */
  revoke(type: PermissionType, pattern?: string): void {
    if (pattern) {
      // Revoke specific pattern
      this.approved.delete(`${type}:${pattern}`);
    } else {
      // Revoke all patterns of this type
      for (const key of this.approved.keys()) {
        if (key.startsWith(`${type}:`)) {
          this.approved.delete(key);
        }
      }
    }
    
    this.save();
  }
  
  /**
   * Add a permission rule
   */
  addRule(rule: PermissionRuleset[0]): void {
    this.rules.push(rule);
    this.save();
  }
  
  /**
   * Get all granted permissions
   */
  list(): Array<{ type: PermissionType; pattern: string }> {
    return Array.from(this.approved.entries())
      .filter(([_, granted]) => granted)
      .map(([key, _]) => {
        const [type, pattern] = key.split(':');
        return { type: type as PermissionType, pattern };
      });
  }
  
  /**
   * Clear all permissions
   */
  clear(): void {
    this.approved.clear();
    this.rules = [];
    this.save();
  }
  
  /**
   * Load from localStorage
   */
  private load(): void {
    if (typeof localStorage === 'undefined') return;
    
    try {
      const stored = localStorage.getItem('memcode-permissions');
      if (stored) {
        const data = JSON.parse(stored);
        this.approved = new Map(data.approved);
        this.rules = data.rules || [];
      }
    } catch (error) {
      console.error('Failed to load permissions:', error);
    }
  }
  
  /**
   * Save to localStorage
   */
  private save(): void {
    if (typeof localStorage === 'undefined') return;
    
    try {
      const data = {
        approved: Array.from(this.approved.entries()),
        rules: this.rules
      };
      localStorage.setItem('memcode-permissions', JSON.stringify(data));
    } catch (error) {
      console.error('Failed to save permissions:', error);
    }
  }
  
  /**
   * Check if request matches a rule
   */
  private matchesRule(request: PermissionRequest, rule: PermissionRuleset[0]): boolean {
    if (request.type !== rule.permission) return false;
    
    // Simple wildcard matching
    const pattern = rule.pattern;
    const requestPattern = request.pattern;
    
    if (pattern === '*') return true;
    if (pattern === requestPattern) return true;
    
    // Handle * wildcards
    if (pattern.includes('*')) {
      const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
      return regex.test(requestPattern);
    }
    
    return false;
  }
}

// Singleton instance
export const permissionStore = new PermissionStore();
