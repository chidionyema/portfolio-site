import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { CacheInvalidationDemo } from '../../src/components/demo/CacheInvalidationDemo';

vi.mock('../../src/hooks/useDemoSession', () => ({
  useDemoSession: () => ({ 
    sessionId: 'test-session-123',
    events: [],
    executeCommand: vi.fn()
  })
}));

vi.mock('../../src/lib/api/demo-client', () => ({
  getCachedProduct: vi.fn().mockResolvedValue({ name: 'Widget Pro', price: 49.99, version: 1 }),
  updateProduct: vi.fn().mockResolvedValue(true),
  invalidateCache: vi.fn().mockResolvedValue(true),
  getDemoProduct: vi.fn().mockResolvedValue('prod_123')
}));

describe('CacheInvalidationDemo', () => {
  beforeEach(() => {
    // Don't use fake timers for this test
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders correctly', () => {
    render(<CacheInvalidationDemo />);
    // "Pub/Sub Invalidation" was pre-rewrite copy; the current heading is
    // "Three-Tier Cache Ladder" (see CacheInvalidationDemo.tsx).
    expect(screen.getByText('Three-Tier Cache Ladder')).toBeInTheDocument();
    expect(screen.getByText('Update DB')).toBeInTheDocument();
  });

  it('can trigger a read and log a hit', async () => {
    render(<CacheInvalidationDemo />);
    const readBtn = screen.getByRole('button', { name: /Read from Cache/i });
    
    await act(async () => {
      fireEvent.click(readBtn);
    });

    await waitFor(() => {
      expect(screen.getByText('read')).toBeInTheDocument();
    });
  });
});
