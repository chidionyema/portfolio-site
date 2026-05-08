import { useEffect } from 'react';

/**
 * Continuous traffic generator for the /lab page.
 *
 * The lab is supposed to be a system being exercised, not a static
 * console waiting for a click. This component fires a steady ~1 req
 * per second across the safe read-only demo paths so the topology
 * always has real packets flowing and the metrics panel always has
 * real numbers to compute against.
 *
 * Effect: when a visitor pauses a service via the topology, error
 * rates and latencies on the live metrics panel shift within a
 * couple of seconds because traffic is already in flight — no
 * "click a demo to see what happens" step.
 *
 * The auto-prober inside LiveTopologyMap fires only while chaos is
 * active. This component fires unconditionally while the lab page
 * is open, which is what makes the system feel alive.
 */
const API_URL = (
  import.meta.env.PUBLIC_API_URL || 'http://localhost:5050'
).replace(/\/$/, '');

const PROBE_PATHS: string[] = [
  '/api/health/snapshot',
  '/api/demo/cache/product/demo',
  // /api/demo/vault/status removed: no prod Vault server provisioned,
  // so the call always 503s. Hammering it on a 1.5s tick was filling
  // the BFF's resilience-handler failure window enough to trip the
  // identity-svc circuit breaker, which then briefly fails *other*
  // calls routed through identity. Add back once a real Vault is up.
  '/api/demo/events/relay-status',
  '/api/demo/ratelimit/request',
];

const TICK_MS = 1500;

export function LabBackgroundProber() {
  useEffect(() => {
    let i = 0;
    let stopped = false;

    const fire = () => {
      if (stopped) return;
      const path = PROBE_PATHS[i % PROBE_PATHS.length];
      i++;
      // POST for ratelimit (it's the only POST in the rotation),
      // GET for the rest. cache:'no-store' so the BFF actually sees
      // the request rather than the browser short-circuiting.
      const isPost = path === '/api/demo/ratelimit/request';
      // X-Demo-Session must parse as Guid? on the BFF (SessionRequest /
      // [FromHeader] binding). Sending 'lab-bg' as plain string previously
      // gave 400 Bad Request from ASP.NET's model binder. Omit the header
      // and let the controller generate a session id when none is supplied.
      fetch(`${API_URL}${path}`, {
        method: isPost ? 'POST' : 'GET',
        cache: 'no-store',
        headers: isPost ? { 'Content-Type': 'application/json' } : {},
        body: isPost ? JSON.stringify({ sessionId: null }) : undefined,
      }).catch(() => undefined);
    };

    // Kick off the first request immediately, then tick.
    fire();
    const id = window.setInterval(fire, TICK_MS);
    return () => {
      stopped = true;
      clearInterval(id);
    };
  }, []);

  return null;
}
