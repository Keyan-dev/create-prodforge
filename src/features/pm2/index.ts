import type { Feature } from '../../core/feature';
import { featureFiles } from '../../core/templates';
import { versions } from '../../core/versions';

/**
 * PM2 ecosystem file for VM / bare-metal deploys: cluster mode across all CPUs, waits for each
 * worker's `ready` signal, and gives it time to shut down gracefully. PM2 itself is installed
 * on the server, not added to package.json; it never runs inside the Docker image.
 */
export const pm2: Feature = {
  id: 'pm2',
  label: 'PM2',
  enabled: (cfg) => cfg.pm2,
  dependsOn: ['base'],
  async apply(ctx) {
    await ctx.files.copyDir(featureFiles('pm2'), '.', { pm2Version: versions.pm2 });
    ctx.inject(
      'README.md',
      'docs',
      [
        '',
        '## PM2',
        '',
        'For a VM or bare-metal server. Build, then start one worker per CPU in cluster mode:',
        '',
        '```bash',
        `npm install --global pm2@${versions.pm2}`,
        'pm2 start ecosystem.config.cjs',
        '```',
      ].join('\n'),
    );
  },
};
