import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { CheckoutDemo } from '../../src/components/demo/CheckoutDemo';

vi.mock('../../src/hooks/useDemoSession', () => ({
  useDemoSession: () => ({ 
    sessionId: 'test-session-123',
    events: [],
    chaos: { serviceFaulty: false },
    executeCommand: vi.fn().mockResolvedValue({ 
      orderId: '550e8400-e29b-41d4-a716-446655440000',
      sessionId: 'saga_123'
    })
  })
}));

describe('CheckoutDemo', () => {
  it('renders correctly', () => {
    render(<CheckoutDemo />);
    expect(screen.getByText('Your order')).toBeInTheDocument();
    expect(screen.getByText('Demo Widget')).toBeInTheDocument();
  });

  it('can start a simulation', async () => {
    render(<CheckoutDemo />);
    const payBtn = screen.getByRole('button', { name: /Pay £39.99/i });
    
    await act(async () => {
      fireEvent.click(payBtn);
    });

    await waitFor(() => {
      expect(screen.getByText(/Awaiting saga initiation/i)).toBeInTheDocument();
    });
  });
});
