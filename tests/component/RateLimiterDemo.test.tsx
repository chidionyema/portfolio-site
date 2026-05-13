import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { RateLimiterDemo } from '../../src/components/demo/RateLimiterDemo';

vi.mock('../../src/hooks/useDemoSession', () => ({
  useDemoSession: () => ({ 
    sessionId: 'test-session-123',
    events: [],
    executeCommand: vi.fn()
  })
}));

describe('RateLimiterDemo', () => {
  beforeEach(() => {
    // Standard setup
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders correctly', () => {
    render(<RateLimiterDemo />);
    expect(screen.getByText('Token Bucket')).toBeInTheDocument();
    expect(screen.getByText('Available Tokens')).toBeInTheDocument();
  });

  it('can send a request and decrement tokens', async () => {
    render(<RateLimiterDemo />);
    const sendBtn = screen.getByRole('button', { name: /Send Request/i });
    
    await act(async () => {
      fireEvent.click(sendBtn);
    });

    await waitFor(() => {
      expect(screen.getByText('200 OK')).toBeInTheDocument();
      // Token count changes from 5 to 4
      expect(screen.getByText('4')).toBeInTheDocument();
    });
  });
});
