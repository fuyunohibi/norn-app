import React from 'react';
import { Alert } from 'react-native';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { SignupForm } from '../signup-form';

const signUpMock = jest.fn();
const onSwitchToLoginMock = jest.fn();

jest.mock('@/contexts/auth-context', () => ({
  useAuth: () => ({
    signUp: signUpMock,
  }),
}));

describe('SignupForm UI', () => {
  beforeEach(() => {
    jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
    signUpMock.mockReset();
    onSwitchToLoginMock.mockReset();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('moves from step 1 to step 2 when step 1 is valid', async () => {
    const { getByPlaceholderText, getByText, queryByText } = render(
      <SignupForm onSwitchToLogin={onSwitchToLoginMock} />
    );

    fireEvent.changeText(getByPlaceholderText('Enter your email address'), 'test@example.com');
    fireEvent.changeText(getByPlaceholderText('Create a strong password'), 'password123');
    fireEvent.changeText(getByPlaceholderText('Confirm your password'), 'password123');

    fireEvent.press(getByText('Continue'));

    await waitFor(() => {
      expect(queryByText('Personal Details')).toBeTruthy();
    });
  });

  it('submits registration and shows success alert, then switches to login on OK', async () => {
    signUpMock.mockResolvedValue({ success: true });

    const { getByPlaceholderText, getByText } = render(
      <SignupForm onSwitchToLogin={onSwitchToLoginMock} />
    );

    fireEvent.changeText(getByPlaceholderText('Enter your email address'), 'test@example.com');
    fireEvent.changeText(getByPlaceholderText('Create a strong password'), 'password123');
    fireEvent.changeText(getByPlaceholderText('Confirm your password'), 'password123');
    fireEvent.press(getByText('Continue'));

    await waitFor(() => getByText('Personal Details'));

    fireEvent.changeText(getByPlaceholderText('Enter your full name'), 'Test User');
    fireEvent.changeText(getByPlaceholderText('Choose a unique username'), 'myuser');

    fireEvent.press(getByText('Create Account'));

    await waitFor(() => {
      expect(signUpMock).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123',
        username: 'myuser',
        full_name: 'Test User',
      });
    });

    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith(
        'Success',
        'Please check your email for a confirmation link to complete your registration.',
        [{ text: 'OK', onPress: expect.any(Function) }]
      );
    });

    const okHandler = (Alert.alert as jest.Mock).mock.calls[0][2][0].onPress as () => void;
    okHandler();
    expect(onSwitchToLoginMock).toHaveBeenCalled();
  });

  it('shows an error alert when registration fails', async () => {
    signUpMock.mockResolvedValue({ error: 'Signup failed.' });

    const { getByPlaceholderText, getByText } = render(
      <SignupForm onSwitchToLogin={onSwitchToLoginMock} />
    );

    fireEvent.changeText(getByPlaceholderText('Enter your email address'), 'test@example.com');
    fireEvent.changeText(getByPlaceholderText('Create a strong password'), 'password123');
    fireEvent.changeText(getByPlaceholderText('Confirm your password'), 'password123');
    fireEvent.press(getByText('Continue'));

    await waitFor(() => getByText('Personal Details'));

    fireEvent.changeText(getByPlaceholderText('Enter your full name'), 'Test User');
    fireEvent.changeText(getByPlaceholderText('Choose a unique username'), 'myuser');
    fireEvent.press(getByText('Create Account'));

    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith('Signup Failed', 'Signup failed.');
    });
  });
});

