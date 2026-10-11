import type { Job } from 'bullmq';
import { describe, expect, it } from 'vitest';
import { type ExampleJobData, processExampleJob } from '../src/jobs/example.job';

describe('example job', () => {
  it('processes a job without needing Redis', async () => {
    const job = { id: '1', data: { message: 'hello' } } as Job<ExampleJobData>;

    await expect(processExampleJob(job)).resolves.toHaveProperty('processedAt');
  });
});
