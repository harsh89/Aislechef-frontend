const supabase = {
  auth: {
    getSession: jest.fn(() => Promise.resolve({ data: { session: null } })),
    getUser: jest.fn(() => Promise.resolve({ data: { user: null } })),
    signInWithPassword: jest.fn(),
    signUp: jest.fn(),
    signOut: jest.fn(),
    onAuthStateChange: jest.fn(() => ({ data: { subscription: { unsubscribe: jest.fn() } } })),
  },
};

module.exports = {
  createClient: jest.fn(() => supabase),
};
