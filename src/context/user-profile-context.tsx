'use client';

import React, { createContext, useContext, useEffect, useState, useCallback, type PropsWithChildren } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db, auth } from '@/lib/firebase';
import { onAuthStateChanged, type User } from 'firebase/auth';
import type { UserProfile } from '@/lib/types';
import { usePathname } from 'next/navigation';

type UserProfileContextType = {
  userProfile: UserProfile | null;
  loading: boolean;
};

const UserProfileContext = createContext<UserProfileContextType | undefined>(undefined);

export const UserProfileProvider = ({ children }: PropsWithChildren) => {
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const pathname = usePathname();

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (!currentUser) {
        setLoading(false);
        setUserProfile(null);
      }
    });
    return () => unsubscribeAuth();
  }, []);

  useEffect(() => {
    if (user && pathname.startsWith('/dashboard')) {
      setLoading(true);
      const docRef = doc(db, 'users', user.uid);
      const unsubscribe = onSnapshot(docRef, (docSnap) => {
        if (docSnap.exists()) {
          setUserProfile(docSnap.data() as UserProfile);
        } else {
          // If the user doc doesn't exist, create a temporary profile
          // from the auth object until the doc is created.
          setUserProfile({
            uid: user.uid,
            displayName: user.displayName || 'Usuario',
            email: user.email || '',
            photoURL: user.photoURL
          });
        }
        setLoading(false);
      }, (error) => {
        console.error("Error fetching user profile with onSnapshot:", error);
        setLoading(false);
      });

      return () => unsubscribe();
    }
  }, [user, pathname]);


  const value = { userProfile, loading };

  return (
    <UserProfileContext.Provider value={value}>
      {children}
    </UserProfileContext.Provider>
  );
};

export const useUserProfile = () => {
  const context = useContext(UserProfileContext);
  if (context === undefined) {
    throw new Error('useUserProfile must be used within a UserProfileProvider');
  }
  return context;
};
