import { router } from 'expo-router';
import { useEffect } from 'react';
import { useAuth } from '../contexts/auth-context';

export default function Index() {
  const { user, loading } = useAuth();

  useEffect(() => {
    if (loading) return;

    if (user) {
      // User is authenticated, redirect to main app
      router.replace('/(tabs)');
    } else {
      // User is not authenticated, redirect to auth
      router.replace('/auth');
    }
  }, [user, loading]);

  return null;
}
