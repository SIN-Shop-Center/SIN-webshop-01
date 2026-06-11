/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { supabase } from "../lib/supabase/client";
import { User } from "../types";

export interface AuthContextType {
  currentUser: User;
  setCurrentUser: React.Dispatch<React.SetStateAction<User>>;
  isAuthModalOpen: boolean;
  setIsAuthModalOpen: React.Dispatch<React.SetStateAction<boolean>>;
  handleLogin: (user: User) => void;
  handleLogout: () => void;
  handleToggleUser: () => void;
  isLoading: boolean;
}

export const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User>(() => {
    const saved = localStorage.getItem("sin_shop_user");
    if (saved) {
      const parsed = JSON.parse(saved);
      const isLegacyDemoUser =
        parsed.email === "christian.mueller@example.de" ||
        parsed.email === "christian.buyer@temu-deals.de" ||
        parsed.email === "admin.seller@sin-concept.de";
      if (!isLegacyDemoUser) {
        if (!parsed.role) parsed.role = "buyer";
        return parsed;
      }
    }
    return {
      name: "",
      email: "",
      isLoggedIn: false,
      role: "buyer",
    };
  });
  
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  
  // Check for existing session on mount
  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        const userName = session.user.user_metadata?.name || session.user.email?.split('@')[0] || 'User';
        const userRole = session.user.user_metadata?.role || 'buyer';
        setCurrentUser({
          name: userName,
          email: session.user.email || '',
          isLoggedIn: true,
          avatar: userName.substring(0, 2).toUpperCase(),
          role: userRole
        });
      }
      setIsLoading(false);
    };
    checkSession();
  }, []);
  
  // Listen for auth state changes
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        const userName = session.user.user_metadata?.name || session.user.email?.split('@')[0] || 'User';
        const userRole = session.user.user_metadata?.role || 'buyer';
        setCurrentUser({
          name: userName,
          email: session.user.email || '',
          isLoggedIn: true,
          avatar: userName.substring(0, 2).toUpperCase(),
          role: userRole
        });
      } else if (event === 'SIGNED_OUT') {
        setCurrentUser({
          name: '',
          email: '',
          isLoggedIn: false,
          role: 'buyer'
        });
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);
  
  // Save user to localStorage
  useEffect(() => {
    localStorage.setItem("sin_shop_user", JSON.stringify(currentUser));
  }, [currentUser]);
  
  const handleLogin = useCallback((user: User) => {
    setCurrentUser(user);
  }, []);
  
  const handleLogout = useCallback(async () => {
    try {
      await supabase.auth.signOut();
      const guestUser: User = {
        name: "Gast",
        email: "",
        isLoggedIn: false,
        role: "buyer",
      };
      setCurrentUser(guestUser);
    } catch (error) {
      console.error('Logout error:', error);
    }
  }, []);
  
  const handleToggleUser = useCallback(() => {
    setIsAuthModalOpen(true);
  }, []);
  
  const value: AuthContextType = {
    currentUser,
    setCurrentUser,
    isAuthModalOpen,
    setIsAuthModalOpen,
    handleLogin,
    handleLogout,
    handleToggleUser,
    isLoading,
  };
  
  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
