import type { DriftResult, Contradiction, CriticalContext } from '../../types/documentation.js';
import { CriticalContextManager } from './critical-context.js';

interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp?: Date;
}

// Keywords that indicate topic areas
const TOPIC_KEYWORDS: Record<string, string[]> = {
  authentication: ['auth', 'login', 'jwt', 'session', 'token', 'oauth', 'password'],
  database: ['database', 'db', 'sql', 'query', 'table', 'schema', 'migration'],
  api: ['api', 'endpoint', 'rest', 'graphql', 'route', 'request', 'response'],
  frontend: ['react', 'vue', 'component', 'ui', 'css', 'html', 'dom'],
  testing: ['test', 'spec', 'mock', 'assert', 'coverage', 'jest', 'vitest'],
  deployment: ['deploy', 'docker', 'kubernetes', 'ci', 'cd', 'pipeline'],
  security: ['security', 'encrypt', 'hash', 'vulnerability', 'xss', 'csrf'],
  performance: ['performance', 'optimize', 'cache', 'speed', 'memory', 'latency']
};

// Contradiction patterns (earlier statement vs later statement)
const CONTRADICTION_PATTERNS = [
  { earlier: /will use (\w+)/i, later: /use (\w+) instead/i },
  { earlier: /decided on (\w+)/i, later: /switch(?:ed|ing)? to (\w+)/i },
  { earlier: /must (\w+)/i, later: /don't need to (\w+)/i },
  { earlier: /always (\w+)/i, later: /never (\w+)/i }
];

export class DriftDetector {
  private criticalManager: CriticalContextManager;
  private conversationHistory: Message[] = [];
  private initialRequirements: string[] = [];

  constructor(criticalManager: CriticalContextManager) {
    this.criticalManager = criticalManager;
  }

  addMessage(message: Message): void {
    this.conversationHistory.push({
      ...message,
      timestamp: message.timestamp || new Date()
    });

    // Extract requirements from early user messages
    if (message.role === 'user' && this.conversationHistory.length <= 5) {
      const extracted = this.extractRequirements(message.content);
      this.initialRequirements.push(...extracted);
    }
  }

  clearHistory(): void {
    this.conversationHistory = [];
    this.initialRequirements = [];
  }

  getHistory(): Message[] {
    return [...this.conversationHistory];
  }

  detectDrift(): DriftResult {
    const criticalContext = this.criticalManager.getCriticalContext();
    const recentMessages = this.conversationHistory.slice(-10);
    const earlyMessages = this.conversationHistory.slice(0, 10);

    // Calculate drift score based on multiple factors
    const requirementAdherence = this.checkRequirementAdherence(recentMessages);
    const contradictions = this.findContradictions();
    const topicShift = this.calculateTopicShift(earlyMessages, recentMessages);

    // Weighted drift score
    const driftScore = Math.min(1, (
      (1 - requirementAdherence.score) * 0.4 +
      (contradictions.length > 0 ? Math.min(contradictions.length * 0.15, 0.3) : 0) +
      topicShift * 0.3
    ));

    // Generate suggested reminders
    const suggestedReminders = this.generateReminders(
      requirementAdherence.missing,
      criticalContext
    );

    return {
      driftScore: Math.round(driftScore * 100) / 100,
      driftDetected: driftScore >= 0.3,
      missingRequirements: requirementAdherence.missing,
      contradictions,
      suggestedReminders,
      topicShift: Math.round(topicShift * 100) / 100
    };
  }

  private extractRequirements(text: string): string[] {
    const requirements: string[] = [];
    const patterns = [
      /(?:must|should|need to|have to|required to)\s+(.+?)(?:[.!?]|$)/gi,
      /(?:make sure|ensure|always)\s+(.+?)(?:[.!?]|$)/gi,
      /(?:don't|never|avoid)\s+(.+?)(?:[.!?]|$)/gi
    ];

    for (const pattern of patterns) {
      let match;
      while ((match = pattern.exec(text)) !== null) {
        if (match[1] && match[1].length > 5 && match[1].length < 200) {
          requirements.push(match[1].trim());
        }
      }
    }

    return requirements;
  }

  private checkRequirementAdherence(recentMessages: Message[]): {
    score: number;
    missing: string[];
  } {
    if (this.initialRequirements.length === 0) {
      return { score: 1, missing: [] };
    }

    const recentText = recentMessages
      .filter(m => m.role === 'assistant')
      .map(m => m.content.toLowerCase())
      .join(' ');

    const missing: string[] = [];
    let found = 0;

    for (const req of this.initialRequirements) {
      // Check if requirement is being addressed in recent responses
      const keywords = req.toLowerCase().split(/\s+/).filter(w => w.length > 3);
      const matchCount = keywords.filter(kw => recentText.includes(kw)).length;

      if (matchCount >= keywords.length * 0.5) {
        found++;
      } else {
        missing.push(req);
      }
    }

    const score = this.initialRequirements.length > 0
      ? found / this.initialRequirements.length
      : 1;

    return { score, missing };
  }

  private findContradictions(): Contradiction[] {
    const contradictions: Contradiction[] = [];
    const messages = this.conversationHistory;

    // Compare each message with later messages
    for (let i = 0; i < messages.length - 1; i++) {
      const earlier = messages[i]!;

      for (let j = i + 1; j < messages.length; j++) {
        const later = messages[j]!;

        // Only check assistant responses for contradictions
        if (earlier.role !== 'assistant' || later.role !== 'assistant') continue;

        for (const pattern of CONTRADICTION_PATTERNS) {
          const earlierMatch = earlier.content.match(pattern.earlier);
          const laterMatch = later.content.match(pattern.later);

          if (earlierMatch && laterMatch) {
            // Check if it's talking about the same thing
            const earlierSubject = earlierMatch[1]?.toLowerCase();
            const laterSubject = laterMatch[1]?.toLowerCase();

            if (earlierSubject && laterSubject && earlierSubject !== laterSubject) {
              contradictions.push({
                earlier: earlier.content.slice(0, 100),
                later: later.content.slice(0, 100),
                severity: j - i > 10 ? 'high' : j - i > 5 ? 'medium' : 'low'
              });
            }
          }
        }
      }
    }

    // Limit to most recent contradictions
    return contradictions.slice(-5);
  }

  private calculateTopicShift(
    earlyMessages: Message[],
    recentMessages: Message[]
  ): number {
    const earlyTopics = this.extractTopics(earlyMessages);
    const recentTopics = this.extractTopics(recentMessages);

    if (earlyTopics.size === 0 || recentTopics.size === 0) {
      return 0;
    }

    // Calculate Jaccard similarity
    const intersection = new Set([...earlyTopics].filter(t => recentTopics.has(t)));
    const union = new Set([...earlyTopics, ...recentTopics]);

    const similarity = intersection.size / union.size;

    // Topic shift is inverse of similarity
    return 1 - similarity;
  }

  private extractTopics(messages: Message[]): Set<string> {
    const topics = new Set<string>();
    const text = messages.map(m => m.content.toLowerCase()).join(' ');

    for (const [topic, keywords] of Object.entries(TOPIC_KEYWORDS)) {
      for (const keyword of keywords) {
        if (text.includes(keyword)) {
          topics.add(topic);
          break;
        }
      }
    }

    return topics;
  }

  private generateReminders(
    missingRequirements: string[],
    criticalContext: CriticalContext[]
  ): string[] {
    const reminders: string[] = [];

    // Add reminders for missing requirements
    for (const req of missingRequirements.slice(0, 3)) {
      reminders.push(`Remember: ${req}`);
    }

    // Add reminders for critical context
    for (const critical of criticalContext.slice(0, 3)) {
      if (critical.type === 'decision') {
        reminders.push(`Decision: ${critical.content}`);
      } else if (critical.type === 'requirement') {
        reminders.push(`Requirement: ${critical.content}`);
      }
    }

    return reminders;
  }

  getInitialRequirements(): string[] {
    return [...this.initialRequirements];
  }

  addRequirement(requirement: string): void {
    this.initialRequirements.push(requirement);
  }
}
