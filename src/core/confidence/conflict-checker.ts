import type { Tier2Storage } from '../../storage/tier2.js';
import type { EmbeddingGenerator } from '../../indexing/embeddings.js';
import type { ConflictResult } from '../../types/documentation.js';

// Common conflict patterns - decisions that might conflict with code patterns
const CONFLICT_PATTERNS = [
  // Authentication patterns
  {
    decisionKeywords: ['jwt', 'json web token'],
    conflictingCode: /session\s*=|cookie.*auth|express-session/i,
    conflict: 'Code uses session-based auth, but decision specifies JWT'
  },
  {
    decisionKeywords: ['session', 'cookie auth'],
    conflictingCode: /jwt\.sign|jsonwebtoken/i,
    conflict: 'Code uses JWT, but decision specifies session-based auth'
  },

  // Database patterns
  {
    decisionKeywords: ['parameterized queries', 'prepared statements', 'no string concatenation'],
    conflictingCode: /\$\{.*\}.*(?:SELECT|INSERT|UPDATE|DELETE)|`.*\+.*\+.*(?:SELECT|INSERT)/i,
    conflict: 'Code uses string concatenation for SQL, but decision requires parameterized queries'
  },
  {
    decisionKeywords: ['orm', 'prisma', 'sequelize', 'typeorm'],
    conflictingCode: /db\.query\s*\(|execute\s*\(\s*['"`]SELECT/i,
    conflict: 'Code uses raw SQL, but decision specifies ORM usage'
  },

  // Error handling patterns
  {
    decisionKeywords: ['custom error classes', 'error types'],
    conflictingCode: /throw\s+new\s+Error\s*\(/i,
    conflict: 'Code throws generic Error, but decision specifies custom error classes'
  },
  {
    decisionKeywords: ['always log errors', 'error logging'],
    conflictingCode: /catch\s*\([^)]*\)\s*\{\s*\}/i,
    conflict: 'Code has empty catch block, but decision requires error logging'
  },

  // API patterns
  {
    decisionKeywords: ['rest api', 'restful'],
    conflictingCode: /graphql|gql`|ApolloServer/i,
    conflict: 'Code uses GraphQL, but decision specifies REST API'
  },
  {
    decisionKeywords: ['graphql'],
    conflictingCode: /app\.(get|post|put|delete|patch)\s*\(/i,
    conflict: 'Code uses REST endpoints, but decision specifies GraphQL'
  },

  // Testing patterns
  {
    decisionKeywords: ['jest', 'use jest'],
    conflictingCode: /import.*mocha|describe.*chai|from\s+['"]vitest/i,
    conflict: 'Code uses different testing framework, but decision specifies Jest'
  },
  {
    decisionKeywords: ['vitest'],
    conflictingCode: /import.*jest|from\s+['"]@jest/i,
    conflict: 'Code uses Jest, but decision specifies Vitest'
  },

  // State management patterns
  {
    decisionKeywords: ['redux', 'use redux'],
    conflictingCode: /useContext|createContext|zustand|mobx/i,
    conflict: 'Code uses different state management, but decision specifies Redux'
  },

  // Styling patterns
  {
    decisionKeywords: ['tailwind', 'tailwindcss'],
    conflictingCode: /styled-components|emotion|\.module\.css/i,
    conflict: 'Code uses different styling approach, but decision specifies Tailwind'
  },

  // Async patterns
  {
    decisionKeywords: ['async/await', 'always use async'],
    conflictingCode: /\.then\s*\([^)]*=>/i,
    conflict: 'Code uses promise chains, but decision specifies async/await'
  }
];

export class ConflictChecker {
  private tier2: Tier2Storage;
  private embeddingGenerator: EmbeddingGenerator;

  constructor(tier2: Tier2Storage, embeddingGenerator: EmbeddingGenerator) {
    this.tier2 = tier2;
    this.embeddingGenerator = embeddingGenerator;
  }

  async checkConflicts(code: string): Promise<ConflictResult> {
    const conflicts: ConflictResult['conflicts'] = [];

    // Get all decisions
    const decisions = this.tier2.getAllDecisions();

    if (decisions.length === 0) {
      return { hasConflicts: false, conflicts: [] };
    }

    // Check each decision for conflicts
    for (const decision of decisions) {
      const conflict = this.checkDecisionConflict(code, decision);
      if (conflict) {
        conflicts.push(conflict);
      }
    }

    // Also check using semantic similarity for decisions that might conflict
    const semanticConflicts = await this.checkSemanticConflicts(code, decisions);
    for (const conflict of semanticConflicts) {
      // Avoid duplicates
      if (!conflicts.some(c => c.decisionId === conflict.decisionId)) {
        conflicts.push(conflict);
      }
    }

    // Sort by severity
    conflicts.sort((a, b) => {
      const severityOrder = { high: 0, medium: 1, low: 2 };
      return severityOrder[a.severity] - severityOrder[b.severity];
    });

    return {
      hasConflicts: conflicts.length > 0,
      conflicts
    };
  }

  private checkDecisionConflict(
    code: string,
    decision: { id: string; title: string; description: string; createdAt: Date }
  ): ConflictResult['conflicts'][0] | null {
    const decisionText = `${decision.title} ${decision.description}`.toLowerCase();

    for (const pattern of CONFLICT_PATTERNS) {
      // Check if this decision matches the pattern keywords
      const matchesKeywords = pattern.decisionKeywords.some(keyword =>
        decisionText.includes(keyword.toLowerCase())
      );

      if (matchesKeywords && pattern.conflictingCode.test(code)) {
        return {
          decisionId: decision.id,
          decisionTitle: decision.title,
          decisionDate: decision.createdAt,
          conflictDescription: pattern.conflict,
          severity: this.determineSeverity(pattern.conflict)
        };
      }
    }

    return null;
  }

  private async checkSemanticConflicts(
    code: string,
    decisions: Array<{ id: string; title: string; description: string; createdAt: Date }>
  ): Promise<ConflictResult['conflicts']> {
    const conflicts: ConflictResult['conflicts'] = [];

    try {
      // Extract key concepts from the code
      const codeApproach = this.extractApproach(code);
      if (!codeApproach) return [];

      // Generate embedding for the code approach
      const codeEmbedding = await this.embeddingGenerator.embed(codeApproach);

      // Search for related decisions
      const relatedDecisions = this.tier2.searchDecisions(codeEmbedding, 5);

      for (const related of relatedDecisions) {
        // Check if the decision contradicts the approach
        const contradiction = this.findContradiction(codeApproach, related.description);
        if (contradiction) {
          // Avoid duplicates
          if (!conflicts.some(c => c.decisionId === related.id)) {
            conflicts.push({
              decisionId: related.id,
              decisionTitle: related.title,
              decisionDate: related.createdAt,
              conflictDescription: contradiction,
              severity: 'medium'
            });
          }
        }
      }
    } catch (error) {
      console.error('Error checking semantic conflicts:', error);
    }

    return conflicts;
  }

  private extractApproach(code: string): string | null {
    // Extract what the code is doing
    const patterns: Array<{ regex: RegExp; approach: string }> = [
      { regex: /async\s+function\s+(\w+)/, approach: 'async function' },
      { regex: /class\s+(\w+)\s+extends/, approach: 'class inheritance' },
      { regex: /interface\s+(\w+)/, approach: 'interface definition' },
      { regex: /import\s+.*from\s+['"](\w+)/, approach: 'using library' },
      { regex: /\.then\s*\(/, approach: 'promise chains' },
      { regex: /await\s+/, approach: 'async/await' },
      { regex: /db\.(query|execute)/i, approach: 'direct database queries' },
      { regex: /prisma\.\w+/, approach: 'Prisma ORM' },
      { regex: /jwt\.(sign|verify)/i, approach: 'JWT authentication' },
      { regex: /session\s*\[/i, approach: 'session-based authentication' }
    ];

    for (const { regex, approach } of patterns) {
      if (regex.test(code)) {
        return approach;
      }
    }

    return null;
  }

  private findContradiction(codeApproach: string, decisionDescription: string): string | null {
    const desc = decisionDescription.toLowerCase();
    const approach = codeApproach.toLowerCase();

    // Define contradictory pairs
    const contradictions: Array<{ approaches: string[]; keywords: string[]; message: string }> = [
      {
        approaches: ['promise chains'],
        keywords: ['async/await', 'always use async'],
        message: 'Code uses promise chains, but decision prefers async/await'
      },
      {
        approaches: ['direct database queries'],
        keywords: ['orm', 'prisma', 'typeorm'],
        message: 'Code uses direct queries, but decision specifies ORM'
      },
      {
        approaches: ['class inheritance'],
        keywords: ['composition', 'prefer composition'],
        message: 'Code uses inheritance, but decision prefers composition'
      }
    ];

    for (const { approaches, keywords, message } of contradictions) {
      if (approaches.some(a => approach.includes(a)) &&
          keywords.some(k => desc.includes(k))) {
        return message;
      }
    }

    return null;
  }

  private determineSeverity(conflictDescription: string): 'low' | 'medium' | 'high' {
    const highSeverityKeywords = ['sql', 'security', 'authentication', 'injection', 'password'];
    const mediumSeverityKeywords = ['orm', 'framework', 'testing', 'api'];

    const lower = conflictDescription.toLowerCase();

    if (highSeverityKeywords.some(k => lower.includes(k))) {
      return 'high';
    }

    if (mediumSeverityKeywords.some(k => lower.includes(k))) {
      return 'medium';
    }

    return 'low';
  }

  // Quick check without full analysis
  quickConflictCheck(code: string): boolean {
    const decisions = this.tier2.getAllDecisions();

    for (const decision of decisions) {
      if (this.checkDecisionConflict(code, decision)) {
        return true;
      }
    }

    return false;
  }
}
