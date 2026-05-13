import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { CacheStampedeDemo } from '../../src/components/demo/CacheStampedeDemo';

// Mock the hook
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
    expect(screen.getByText('Unprotected')).toBeInTheDocument();
  });

  it('can trigger a lock stampede', async () => {
    render(<CacheStampedeDemo />);
    
    const lockButton = screen.getByText('Mutex Lock').closest('button');
    expect(lockButton).not.toBeNull();
    
    fireEvent.click(lockButton!);

    await waitFor(() => {
      // The result row should appear in the table
      expect(screen.getByText('lock')).toBeInTheDocument();
      // DB hits should be 1
      expect(screen.getByText('1')).toBeInTheDocument();
    });
  });
});
