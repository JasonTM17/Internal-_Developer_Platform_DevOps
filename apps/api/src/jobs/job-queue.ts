/**
 * Background Job Queue
 *
 * Production-ready job processing built on BullMQ patterns:
 * - Job queue abstraction with typed payloads
 * - Worker registration with concurrency control
 * - Job scheduling (cron and delayed)
 * - Dead letter queue for failed jobs
 * - Job retry with configurable backoff
 * - Job progress tracking
 * - Graceful shutdown
 */
import { Queue, Worker, Job, QueueScheduler, QueueEvents, JobsOptions } from 'bullmq';
import { Redis } from 'ioredis';

export interface JobQueueOptions {
  redis: Redis;
  queueName: string;
  concurrency?: number;
  maxRetries?: number;
  backoffType?: 'exponential' | 'fixed';
  backoffDelay?: number;
}

export interface JobDefinition<T = unknown> {
  name: string;
  data: T;
  options?: JobsOptions;
}

export interface ScheduledJob<T = unknown> {
  name: string;
  data: T;
  cron: string;
  options?: JobsOptions;
}

export type JobHandler<T = unknown, R = void> = (job: Job<T>) => Promise<R>;

export class JobQueue<T = unknown> {
  private queue: Queue<T>;
  private worker: Worker<T> | null = null;
  private scheduler: QueueScheduler;
  private events: QueueEvents;
  private handlers: Map<string, JobHandler<T>> = new Map();
  private readonly options: Required<JobQueueOptions>;

  constructor(opts: JobQueueOptions) {
    this.options = {
      redis: opts.redis,
      queueName: opts.queueName,
      concurrency: opts.concurrency ?? 5,
      maxRetries: opts.maxRetries ?? 3,
      backoffType: opts.backoffType ?? 'exponential',
      backoffDelay: opts.backoffDelay ?? 1000,
    };

    const connection = opts.redis;

    this.queue = new Queue<T>(opts.queueName, { connection });
    this.scheduler = new QueueScheduler(opts.queueName, { connection });
    this.events = new QueueEvents(opts.queueName, { connection });
  }

  /**
   * Register a handler for a specific job type.
   */
  registerHandler(jobName: string, handler: JobHandler<T>): void {
    this.handlers.set(jobName, handler);
  }

  /**
   * Start processing jobs.
   */
  startProcessing(): void {
    if (this.worker) return;

    this.worker = new Worker<T>(
      this.options.queueName,
      async (job: Job<T>) => {
        const handler = this.handlers.get(job.name);
        if (!handler) {
          throw new Error(`No handler registered for job type: ${job.name}`);
        }
        return handler(job);
      },
      {
        connection: this.options.redis,
        concurrency: this.options.concurrency,
      },
    );

    this.worker.on('failed', (job, error) => {
      console.error(JSON.stringify({
        level: 'error',
        message: 'Job failed',
        jobId: job?.id,
        jobName: job?.name,
        error: error.message,
        attemptsMade: job?.attemptsMade,
        timestamp: new Date().toISOString(),
      }));
    });

    this.worker.on('completed', (job) => {
      console.info(JSON.stringify({
        level: 'info',
        message: 'Job completed',
        jobId: job.id,
        jobName: job.name,
        duration: Date.now() - job.timestamp,
        timestamp: new Date().toISOString(),
      }));
    });
  }

  /**
   * Add a job to the queue.
   */
  async addJob(name: string, data: T, options?: JobsOptions): Promise<Job<T>> {
    return this.queue.add(name, data, {
      attempts: this.options.maxRetries,
      backoff: {
        type: this.options.backoffType,
        delay: this.options.backoffDelay,
      },
      removeOnComplete: { count: 1000 },
      removeOnFail: { count: 5000 },
      ...options,
    });
  }

  /**
   * Schedule a recurring job with cron expression.
   */
  async scheduleRecurring(name: string, data: T, cron: string, options?: JobsOptions): Promise<void> {
    await this.queue.add(name, data, {
      repeat: { cron },
      attempts: this.options.maxRetries,
      backoff: {
        type: this.options.backoffType,
        delay: this.options.backoffDelay,
      },
      ...options,
    });
  }

  /**
   * Add a delayed job (execute after specified milliseconds).
   */
  async addDelayedJob(name: string, data: T, delayMs: number, options?: JobsOptions): Promise<Job<T>> {
    return this.addJob(name, data, { delay: delayMs, ...options });
  }

  /**
   * Move a failed job to the dead letter queue.
   */
  async moveToDeadLetter(job: Job<T>): Promise<void> {
    const dlqName = `${this.options.queueName}:dlq`;
    const dlq = new Queue(dlqName, { connection: this.options.redis });
    await dlq.add(job.name, job.data as object, {
      attempts: 0,
      removeOnComplete: false,
    });
    await dlq.close();
  }

  /**
   * Get queue statistics.
   */
  async getStats() {
    const [waiting, active, completed, failed, delayed] = await Promise.all([
      this.queue.getWaitingCount(),
      this.queue.getActiveCount(),
      this.queue.getCompletedCount(),
      this.queue.getFailedCount(),
      this.queue.getDelayedCount(),
    ]);

    return { waiting, active, completed, failed, delayed };
  }

  /**
   * Retry all failed jobs.
   */
  async retryFailed(limit = 100): Promise<number> {
    const failed = await this.queue.getFailed(0, limit);
    let retried = 0;
    for (const job of failed) {
      await job.retry();
      retried++;
    }
    return retried;
  }

  /**
   * Gracefully shutdown the queue and worker.
   */
  async shutdown(): Promise<void> {
    if (this.worker) {
      await this.worker.close();
    }
    await this.scheduler.close();
    await this.events.close();
    await this.queue.close();
  }
}
