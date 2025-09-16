import { fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';

import { UserSearchBar } from '@/components/search/UserSearchBar';

jest.mock('@/lib/api/client/users', () => ({
  UsersApi: {
    suggest: jest.fn().mockResolvedValue({ ok: true, items: [] }),
  },
}));

jest.mock('@/lib/ux/metrics', () => ({
  mark: jest.fn(),
  measure: jest.fn().mockReturnValue(0),
  report: jest.fn(),
}));

describe('UserSearchBar', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  test('does not submit while IME composition is active', () => {
    const handleChange = jest.fn();
    const handleSubmit = jest.fn();
    render(<UserSearchBar value="" onChange={handleChange} onSubmit={handleSubmit} />);

    const input = screen.getByRole('combobox', { name: 'ユーザーを検索' });

    fireEvent.change(input, { target: { value: 'や' }, nativeEvent: { isComposing: true } });
    expect(handleChange).toHaveBeenCalledWith('や');

    fireEvent.keyDown(input, { key: 'Enter', nativeEvent: { isComposing: true } });
    expect(handleSubmit).not.toHaveBeenCalled();
  });

  test('Enter submits current value when not composing', () => {
    const handleSubmit = jest.fn();
    render(<UserSearchBar value="やま" onChange={jest.fn()} onSubmit={handleSubmit} />);
    const input = screen.getByRole('combobox', { name: 'ユーザーを検索' });

    fireEvent.keyDown(input, { key: 'Enter' });
    expect(handleSubmit).toHaveBeenCalledWith('やま');
  });
});
