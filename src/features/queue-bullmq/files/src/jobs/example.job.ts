import { type Job, Queue } from 'bullmq';
import { logger } from '../lib/logger';
import { bullConnection } from './connection';

/**
 * An example background job. Copy this file for each kind of job: a name, its data, a processor
 * that the worker runs, and a function the app calls to enqueue one.
 */
export const EXAMPLE_QUEUE = 'example';

export interface ExampleJobData {
  message: string;
}

/** Runs in the worker process (src/worker.ts). Throwing makes BullMQ retry the job. */
export async function processExampleJob(job: Job<ExampleJobData>) {
  logger.info({ jobId: job.id, data: job.data }, 'Processing example job');
  return { processedAt: new Date().toISOString() };
}

let queue: Queue<ExampleJobData> | undefined;

/** Enqueue a job from the app, e.g. in a route handler. Retries 3 times with backoff. */
export async function enqueueExampleJob(data: ExampleJobData) {
  queue ??= new Queue<ExampleJobData>(EXAMPLE_QUEUE, { connection: bullConnection() });
  return queue.add('example', data, {
    attempts: 3,
    backoff: { type: 'exponential', delay: 1000 },
    removeOnComplete: 1000,
    removeOnFail: 5000,
  });
}

/** Close the queue's connection, if it was opened. Called on shutdown. */
export async function closeExampleQueue() {
  await queue?.close();
}
