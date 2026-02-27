import { act } from '@testing-library/react-native';

// Mock supabase module — factory must not reference outer variables (hoisting)
jest.mock('../../lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: jest.fn(),
      onAuthStateChange: jest.fn(() => ({
        data: { subscription: { unsubscribe: jest.fn() } },
      })),
    },
  },
}));

import { useAuthStore } from '../auth.store';
import { supabase } from '../../lib/supabase';

const mockGetSession = supabase.auth.getSession as jest.Mock;
const mockOnAuthStateChange = supabase.auth.onAuthStateChange as jest.Mock;

beforeEach(() => {
  useAuthStore.setState({ session: null, user: null, loading: true });
  mockGetSession.mockReset();
  mockOnAuthStateChange.mockReset();
  mockOnAuthStateChange.mockReturnValue({
    data: { subscription: { unsubscribe: jest.fn() } },
  });
});

describe('useAuthStore', () => {
  it('starts with loading=true and no session', () => {
    const state = useAuthStore.getState();
    expect(state.loading).toBe(true);
    expect(state.session).toBeNull();
    expect(state.user).toBeNull();
  });

  it('initialize sets loading=false when no session', async () => {
    mockGetSession.mockResolvedValue({ data: { session: null } });

    await act(async () => {
      useAuthStore.getState().initialize();
      await new Promise((r) => setTimeout(r, 0));
    });

    expect(useAuthStore.getState().loading).toBe(false);
    expect(useAuthStore.getState().session).toBeNull();
  });

  it('initialize sets session when logged in', async () => {
    const fakeSession = { access_token: 'tok', user: { id: 'u1', email: 'a@b.com' } };
    mockGetSession.mockResolvedValue({ data: { session: fakeSession } });

    await act(async () => {
      useAuthStore.getState().initialize();
      await new Promise((r) => setTimeout(r, 0));
    });

    expect(useAuthStore.getState().session).toEqual(fakeSession);
    expect(useAuthStore.getState().user).toEqual(fakeSession.user);
    expect(useAuthStore.getState().loading).toBe(false);
  });

  it('clear resets all auth state', () => {
    useAuthStore.setState({
      session: { access_token: 'tok' } as any,
      user: { id: 'u1' } as any,
      loading: false,
    });
    act(() => {
      useAuthStore.getState().clear();
    });
    expect(useAuthStore.getState().session).toBeNull();
    expect(useAuthStore.getState().user).toBeNull();
    expect(useAuthStore.getState().loading).toBe(false);
  });
});
