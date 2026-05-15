import { Queue, Worker, Job, QueueEvents, JobsOptions } from 'bullmq';
import { Redis } from 'ioredis';

import { logger } from '../lib/logger';

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
  private queue: Queue;
  private worker: Worker<T> | null = null;
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

    this.queue = new Queue(opts.queueName, { connection });
    this.events = new QueueEvents(opts.queueName, { connection });
  }

  registerHandler(jobName: string, handler: JobHandler<T>): void {
    this.handlers.set(jobName, handler);
  }

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

    this.worker.on('failed', (job: Job<T> | undefined, error: Error) => {
      logger.error(
        {
          jobId: job?.id,
          jobName: job?.name,
          err: error,
          attemptsMade: job?.attemptsMade,
        },
        'Job failed',
      );
    });

    this.worker.on('completed', (job: Job<T>) => {
      logger.info(
        {
          jobId: job.id,
          jobName: job.name,
          duration: Date.now() - job.timestamp,
        },
        'Job completed',
      );
    });
  }

  async addJob(name: string, data: T, options?: JobsOptions): Promise<Job<T>> {
    return this.queue.add(name, data as object, {
      attempts: this.options.maxRetries,
      backoff: {
        type: this.options.backoffType,
        delay: this.options.backoffDelay,
      },
      removeOnComplete: { count: 1000 },
      removeOnFail: { count: 5000 },
      ...options,
    }) as unknown as Promise<Job<T>>;
  }

  async scheduleRecurring(
    name: string,
    data: T,
    cron: string,
    options?: JobsOptions,
  ): Promise<void> {
    await this.queue.add(name, data as object, {
      repeat: { pattern: cron },
      attempts: this.options.maxRetries,
      backoff: {
        type: this.options.backoffType,
        delay: this.options.backoffDelay,
      },
      ...options,
    });
  }

  async addDelayedJob(
    name: string,
    data: T,
    delayMs: number,
    options?: JobsOptions,
  ): Promise<Job<T>> {
    return this.addJob(name, data, { delay: delayMs, ...options });
  }

  async moveToDeadLetter(job: Job<T>): Promise<void> {
    const dlqName = `${this.options.queueName}:dlq`;
    const dlq = new Queue(dlqName, { connection: this.options.redis });
    await dlq.add(job.name, job.data as object, {
      attempts: 0,
      removeOnComplete: false,
    });
    await dlq.close();
  }

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

  async retryFailed(limit = 100): Promise<number> {
    const failed = await this.queue.getFailed(0, limit);
    let retried = 0;
    for (const job of failed) {
      await job.retry();
      retried++;
    }
    return retried;
  }

  async shutdown(): Promise<void> {
    if (this.worker) {
      await this.worker.close();
    }
    await this.events.close();
    await this.queue.close();
  }
}
