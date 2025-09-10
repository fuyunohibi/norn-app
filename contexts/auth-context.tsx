import { Session, User } from '@supabase/supabase-js';
import React, { createContext, useContext, useEffect, useState } from 'react';
import { emailLogin, signup } from '../services/auth.service';
import { DatabaseService } from '../services/database.service';
import { supabase } from '../utils/supabase';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signUp: (data: { email: string; password: string; username: string; full_name: string }) => Promise<{ success?: boolean; error?: string }>;
  signIn: (data: { email: string; password: string }) => Promise<{ error?: string } | undefined>;
  signOut: () => Promise<{ error: any }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);

      // Initialize user database when they sign in
      if (event === 'SIGNED_IN' && session?.user) {
        try {
          await DatabaseService.initializeUser(session.user.id, {
            username: session.user.user_metadata?.username || `user_${session.user.id.slice(0, 8)}`,
            full_name: session.user.user_metadata?.full_name || 'User',
          });
        } catch (error) {
          console.error('Failed to initialize user database:', error);
        }
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signUp = async (data: { email: string; password: string; username: string; full_name: string }) => {
    return await signup(data);
  };

  const signIn = async (data: { email: string; password: string }) => {
    return await emailLogin(data);
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    return { error };
  };

  const value = {
    user,
    session,
    loading,
    signUp,
    signIn,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
