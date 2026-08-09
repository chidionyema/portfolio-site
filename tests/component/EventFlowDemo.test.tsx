import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { EventFlowDemo } from '../../src/components/demo/EventFlowDemo';

vi.mock('../../src/hooks/useDemoSession', () => ({
  useDemoSession: () => ({ 
    sessionId: 'test-session-123',
    events: [],
    executeCommand: vi.fn().mockResolvedValue({ success: true, queuedCount: 0 })
  })
}));

describe('EventFlowDemo', () => {
  beforeEach(() => {
    // Mock fetch globally
    global.fetch = vi.fn().mockImplementation(() => 
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ isPaused: false, queuedCount: 0 })
      })
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders correctly', async () => {
    await act(async () => {
      render(<EventFlowDemo />);
    });
    // Renders headings ("Event delivery guarantee" caption heading + the
    // "Message broker" h3) and the action button. Two headings exist, so
    // getByRole('heading') would throw a multiple-elements error.
    expect(screen.getAllByRole('heading').length).toBeGreaterThan(0);
    expect(screen.getByRole('button', { name: /commit/i })).toBeInTheDocument();
  });

  it('can trigger an event commit', async () => {
    await act(async () => {
      render(<EventFlowDemo />);
    });
    
    const commitBtn = screen.getByRole('button', { name: /Commit event/i });
    
    await act(async () => {
      fireEvent.click(commitBtn);
    });

    await waitFor(() => {
      expect(screen.getByText('Waiting for commit...')).toBeInTheDocument();
    });
  });
});
