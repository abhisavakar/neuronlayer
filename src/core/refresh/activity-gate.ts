/**
 * ActivityGate - Track user activity and manage idle-time maintenance tasks
 *
 * This component enables intelligent refresh by:
 * 1. Tracking when the user was last active
 * 2. Detecting idle periods
 * 3. Executing maintenance tasks during idle time
 * 4. Ensuring only one idle task runs at a time
 */

export interface IdleTask {
  name: string;
  callback: () => void | Promise<void>;
  minIdleMs: number; // Minimum idle time before this task can run
  lastRun: number;
  intervalMs: number; // Minimum time between runs
}

export class ActivityGate {
  private lastActivity: number = Date.now();
  private idleTasks: IdleTask[] = [];
  private monitoringInterval: ReturnType<typeof setInterval> | null = null;
  private isExecutingTask: boolean = false;
  private currentTaskIndex: number = 0;

  constructor() {
    // Activity is recorded at construction time
    this.recordActivity();
  }

  /**
   * Record user activity (call this on API method invocations)
   */
  recordActivity(): void {
    this.lastActivity = Date.now();
  }

  /**
   * Get the timestamp of the last recorded activity
   */
  getLastActivity(): number {
    return this.lastActivity;
  }

  /**
   * Check if the user has been idle for at least the given threshold
   */
  isIdle(thresholdMs: number = 30_000): boolean {
    return Date.now() - this.lastActivity > thresholdMs;
  }

  /**
   * Get the duration of the current idle period in milliseconds
   */
  getIdleDuration(): number {
    return Date.now() - this.lastActivity;
  }

  /**
   * Register an idle-time task
   * Tasks are executed during idle periods, one at a time
   */
  registerIdleTask(
    name: string,
    callback: () => void | Promise<void>,
    options: {
      minIdleMs?: number;
      intervalMs?: number;
    } = {}
  ): void {
    const { minIdleMs = 30_000, intervalMs = 300_000 } = options;

    // Remove existing task with same name
    this.idleTasks = this.idleTasks.filter(t => t.name !== name);

    this.idleTasks.push({
      name,
      callback,
      minIdleMs,
      lastRun: 0,
      intervalMs
    });
  }

  /**
   * Unregister an idle-time task
   */
  unregisterIdleTask(name: string): boolean {
    const initialLength = this.idleTasks.length;
    this.idleTasks = this.idleTasks.filter(t => t.name !== name);
    return this.idleTasks.length < initialLength;
  }

  /**
   * Get all registered idle tasks
   */
  getIdleTasks(): readonly IdleTask[] {
    return this.idleTasks;
  }

  /**
   * Start monitoring for idle periods
   * Will check every checkIntervalMs and execute tasks when idle
   */
  startIdleMonitoring(checkIntervalMs: number = 10_000): void {
    if (this.monitoringInterval) {
      return; // Already monitoring
    }

    this.monitoringInterval = setInterval(() => {
      this.executeNextIdleTaskIfReady();
    }, checkIntervalMs);
  }

  /**
   * Stop idle monitoring
   */
  stopIdleMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
  }

  /**
   * Execute the next idle task if conditions are met
   * - User must be idle
   * - No other task is currently executing
   * - Task's minimum idle time must be met
   * - Task's minimum interval since last run must be met
   */
  private async executeNextIdleTaskIfReady(): Promise<void> {
    if (this.isExecutingTask) {
      return; // Already executing a task
    }

    if (this.idleTasks.length === 0) {
      return; // No tasks registered
    }

    const now = Date.now();
    const idleDuration = this.getIdleDuration();

    // Find the next task that's ready to run
    for (let i = 0; i < this.idleTasks.length; i++) {
      const taskIndex = (this.currentTaskIndex + i) % this.idleTasks.length;
      const task = this.idleTasks[taskIndex];

      // Safety check (TypeScript strictness)
      if (!task) continue;

      // Check if task is ready
      if (idleDuration < task.minIdleMs) {
        continue; // Not idle long enough
      }

      if (now - task.lastRun < task.intervalMs) {
        continue; // Too soon since last run
      }

      // Execute this task
      this.currentTaskIndex = (taskIndex + 1) % this.idleTasks.length;
      await this.executeTask(task);
      return; // Only execute one task per check
    }
  }

  /**
   * Execute a specific task
   */
  private async executeTask(task: IdleTask): Promise<void> {
    this.isExecutingTask = true;

    try {
      await Promise.resolve(task.callback());
      task.lastRun = Date.now();
    } catch (error) {
      console.error(`Idle task '${task.name}' failed:`, error);
      // Still update lastRun to prevent rapid retries
      task.lastRun = Date.now();
    } finally {
      this.isExecutingTask = false;
    }
  }

  /**
   * Manually trigger execution of all ready idle tasks
   * Useful for testing or manual refresh
   */
  async executeReadyTasks(): Promise<string[]> {
    const executed: string[] = [];
    const now = Date.now();
    const idleDuration = this.getIdleDuration();

    for (const task of this.idleTasks) {
      if (idleDuration >= task.minIdleMs && now - task.lastRun >= task.intervalMs) {
        await this.executeTask(task);
        executed.push(task.name);
      }
    }

    return executed;
  }

  /**
   * Force immediate execution of a specific task by name
   * Ignores idle and interval requirements
   */
  async forceExecuteTask(name: string): Promise<boolean> {
    const task = this.idleTasks.find(t => t.name === name);
    if (!task) {
      return false;
    }

    await this.executeTask(task);
    return true;
  }

  /**
   * Get status of all idle tasks
   */
  getStatus(): {
    isIdle: boolean;
    idleDuration: number;
    isExecutingTask: boolean;
    tasks: Array<{
      name: string;
      lastRun: number;
      timeSinceRun: number;
      readyToRun: boolean;
    }>;
  } {
    const now = Date.now();
    const idleDuration = this.getIdleDuration();

    return {
      isIdle: this.isIdle(),
      idleDuration,
      isExecutingTask: this.isExecutingTask,
      tasks: this.idleTasks.map(task => ({
        name: task.name,
        lastRun: task.lastRun,
        timeSinceRun: now - task.lastRun,
        readyToRun: idleDuration >= task.minIdleMs && now - task.lastRun >= task.intervalMs
      }))
    };
  }

  /**
   * Shutdown the activity gate
   */
  shutdown(): void {
    this.stopIdleMonitoring();
    this.idleTasks = [];
  }
}
