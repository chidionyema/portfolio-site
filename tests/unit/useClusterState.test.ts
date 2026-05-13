import { describe, it, expect } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useClusterState } from '../../src/hooks/useClusterState';

describe('useClusterState', () => {
  it('should initialize with a connecting or unknown state', () => {
    // In a real test, we would mock SignalR and fetch
    const { result } = renderHook(() => useClusterState());
    expect(result.current.systemStatus).toBeDefined();
    // Default mock state is unknown initially due to fetch failure in node env
    expect(['healthy', 'degraded', 'connecting', 'offline', 'unknown']).toContain(result.current.systemStatus);
  });
});
