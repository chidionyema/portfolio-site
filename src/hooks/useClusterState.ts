import { useSyncExternalStore } from 'react';
import { clusterStore, type ClusterState } from '../lib/cluster-store';

/**
 * Read-only subscription to the shared ClusterStore. Any component
 * mounted in the page can call this and receive the same view of
 * the cluster. health, chaos, live events, BFF identity. without
 * opening its own SignalR connection or REST polls.
 *
 * Drives the StatusStrip, LiveTopologyMap, LiveConsoleDock,
 * HeroFingerprint, and the ImpactRibbon. When chaos pauses a target
 * the chaos snapshot updates -> derived services list updates ->
 * every consumer re-renders. The page agrees with itself by
 * construction.
 */
export function useClusterState(): ClusterState {
  return useSyncExternalStore(
    clusterStore.subscribe,
    clusterStore.getSnapshot,
    clusterStore.getServerSnapshot,
  );
}
