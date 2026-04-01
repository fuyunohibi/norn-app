import { signup } from '../auth.service';

jest.mock('@/utils/supabase', () => {
  const signUp = jest.fn();
  const insert = jest.fn();
  const from = jest.fn(() => ({ insert }));

  return {
    supabase: {
      auth: { signUp },
      from,
    },
    __mocks: { signUp, from, insert },
  };
});

const getMocks = () => {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const mod = require('@/utils/supabase');
  return mod.__mocks as {
    signUp: jest.Mock;
    from: jest.Mock;
    insert: jest.Mock;
  };
};

describe('signup (registration)', () => {
  beforeEach(() => {
    jest.spyOn(console, 'log').mockImplementation(() => undefined);
    jest.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('returns success true when auth signup and profile insert succeed', async () => {
    const { signUp, from, insert } = getMocks();

    signUp.mockResolvedValue({
      data: { user: { id: 'user-123' } },
      error: null,
    });
    insert.mockResolvedValue({ error: null });

    const result = await signup({
      email: 'TEST@EXAMPLE.COM ',
      password: 'password123',
      username: 'MyUser ',
      full_name: ' Test User ',
    });

    expect(result).toEqual({ success: true });
    expect(signUp).toHaveBeenCalledWith({
      email: 'test@example.com',
      password: 'password123',
    });
    expect(from).toHaveBeenCalledWith('users');
    expect(insert).toHaveBeenCalledWith({
      user_id: 'user-123',
      username: 'myuser',
      full_name: 'Test User',
    });
  });

  it('maps "User already registered" auth error to a friendly message', async () => {
    const { signUp } = getMocks();

    signUp.mockResolvedValue({
      data: { user: null },
      error: { message: 'User already registered' },
    });

    await expect(
      signup({
        email: 'a@b.com',
        password: 'password123',
        username: 'u',
        full_name: 'User',
      })
    ).resolves.toEqual({
      error:
        'This email is already registered. Please use a different email or try signing in.',
    });
  });

  it('maps duplicate username profile insert error to a friendly message', async () => {
    const { signUp, insert } = getMocks();

    signUp.mockResolvedValue({
      data: { user: { id: 'user-123' } },
      error: null,
    });
    insert.mockResolvedValue({
      error: { message: 'duplicate key value violates unique constraint', code: '23505' },
    });

    await expect(
      signup({
        email: 'a@b.com',
        password: 'password123',
        username: 'TakenName',
        full_name: 'User',
      })
    ).resolves.toEqual({
      error: 'This username is already taken. Please choose a different one.',
    });
  });
});

