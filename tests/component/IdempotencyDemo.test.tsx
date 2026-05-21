import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { IdempotencyDemo } from '../../src/components/demo/IdempotencyDemo';

// Mock the hook
vi.mock('../../src/hooks/useDemoSession', () => ({
  useDemoSession: () => ({ sessionId: 'test-session-123' })
}));

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('IdempotencyDemo', () => {
  beforeEach(() => {
    mockFetch.mockReset();
    // Don't use fake timers for this test, it's getting stuck in async loops
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders correctly', () => {
    render(<IdempotencyDemo />);
    // Renders a heading and the action button
    expect(screen.getByRole('heading')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /send/i })).toBeInTheDocument();
  });

  it('can send a request and log the result', async () => {
    mockFetch.mockResolvedValueOnce({
      json: async () => ({
        result: { orderId: 'ord_123', status: 'created', processedAt: '2026-05-13T00:00:00Z' },
        isDuplicate: false,
        isWinner: true,
        cacheAgeSeconds: 0,
        expiresInSeconds: 30,
        ttlSeconds: 30
      })
    });

    render(<IdempotencyDemo />);
    
    const sendButton = screen.getByRole('button', { name: /Send request/i });
    
    await act(async () => {
      fireEvent.click(sendButton);
    });

    await waitFor(() => {
      expect(screen.getByText('Order Created (First hit)')).toBeInTheDocument();
    });
  });
});
