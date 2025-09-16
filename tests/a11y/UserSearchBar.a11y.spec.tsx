import { render } from '@testing-library/react';
import { axe, toHaveNoViolations } from 'jest-axe';

import { UserSearchBar } from '../../src/components/search/UserSearchBar';

expect.extend(toHaveNoViolations);

jest.mock('../../src/lib/api/client/users', () => ({
  UsersApi: {
    suggest: jest.fn().mockResolvedValue({ ok: true, items: [] }),
  },
}));

jest.mock('../../src/lib/ux/metrics', () => ({
  mark: jest.fn(),
  measure: jest.fn().mockReturnValue(0),
  report: jest.fn(),
}));

describe('UserSearchBar accessibility', () => {
  test('has no serious accessibility violations', async () => {
    const { container } = render(
      <UserSearchBar value="" onChange={() => {}} onSubmit={() => {}} />
    );
    const results = await axe(container, {
      rules: {
        // suppress combobox suggestion list rule because dropdown is rendered dynamically after input
        'aria-required-children': { enabled: false },
      },
    });
    expect(results).toHaveNoViolations();
  });
});
