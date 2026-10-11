/** A dependency the app needs before it can serve traffic (database, cache, …). */
export interface ReadinessCheck {
  name: string;
  check: () => Promise<void>;
}

const checks: ReadinessCheck[] = [];

/** Register a dependency check, e.g. from the module that opens a database connection. */
export function addReadinessCheck(name: string, check: () => Promise<void>) {
  checks.push({ name, check });
}

let shuttingDown = false;

/** Called on SIGTERM so load balancers stop sending traffic before the server closes. */
export function markShuttingDown() {
  shuttingDown = true;
}

/** Run every check. `ready` is false while shutting down or if any check fails. */
export async function readiness() {
  if (shuttingDown) return { ready: false, checks: { shutdown: 'shutting down' } };

  const results = await Promise.allSettled(checks.map(({ check }) => check()));
  const report = Object.fromEntries(
    checks.map(({ name }, index) => [
      name,
      results[index]?.status === 'fulfilled' ? 'ok' : 'failing',
    ]),
  );
  return { ready: Object.values(report).every((status) => status === 'ok'), checks: report };
}
