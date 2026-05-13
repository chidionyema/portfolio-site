import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { CacheStampedeDemo } from '../../src/components/demo/CacheStampedeDemo';

vi.mock('../../src/hooks/useDemoSession', () => ({
  useDemoSession: () => ({ 
    sessionId: 'test-session-123',
    events: [],
    executeCommand: vi.fn().mockResolvedValue({
      dbHits: 1,
      cacheHits: 49,
      durationMs: 150,
      p99Ms: 45
    })
  })
}));

describe('CacheStampedeDemo', () => {
  it('renders correctly', () => {
    render(<CacheStampedeDemo />);
    expect(screen.getByText('HybridCache Tiers')).toBeInTheDocument();
  });

  it('can trigger a lock stampede', async () => {
    render(<CacheStampedeDemo />);
    const lockButton = screen.getByText('Mutex Lock').closest('button');
    
    await act(async () => {
      fireEvent.click(lockButton!);
    });

    await waitFor(() => {
      expect(screen.getByText('lock')).toBeInTheDocument();
    });
  });
});
