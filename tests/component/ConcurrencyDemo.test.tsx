import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { ConcurrencyDemo } from '../../src/components/demo/ConcurrencyDemo';

vi.mock('../../src/hooks/useDemoSession', () => ({
  useDemoSession: () => ({
    sessionId: 'test-session-123',
    events: [],
    // A single mocked response covers both calls the component makes:
    // the mount-time GET (reads res.id to learn the product id — without
    // it, sendUserRequest() bails out and the demo never sends anything)
    // and the PUT save (reads res.success + res.inventory.version).
    executeCommand: vi.fn().mockResolvedValue({ success: true, id: 'prod_demo_widget', inventory: { version: 2 } })
  })
}));

describe('ConcurrencyDemo', () => {
  beforeEach(() => {
    // Setup
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders correctly', () => {
    render(<ConcurrencyDemo />);
    // "Entity Versioning" was pre-rewrite copy; the current headings are
    // "Commit Log" and "Version Timeline". The version badge ("v1") is
    // rendered independently in both user panels plus the timeline footer,
    // so it has multiple matches — use getAllByText.
    expect(screen.getByText('Commit Log')).toBeInTheDocument();
    expect(screen.getAllByText('v1').length).toBeGreaterThan(0);
  });

  it('can send a single update and log success', async () => {
    await act(async () => {
      render(<ConcurrencyDemo />);
    });

    // There's no "Single Update" button; each user panel has its own
    // "Save. {label}" button (e.g. "Save. User A").
    const sendBtn = screen.getByRole('button', { name: /Save\. User A/i });

    await act(async () => {
      fireEvent.click(sendBtn);
    });

    await waitFor(() => {
      expect(screen.getByText('Committed v2')).toBeInTheDocument();
      // Version badge is duplicated across both panels + the timeline footer.
      expect(screen.getAllByText('v2').length).toBeGreaterThan(0);
    });
  });
});
