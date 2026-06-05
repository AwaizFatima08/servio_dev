// ─────────────────────────────────────────
// AuthContext.jsx — Global Auth State
// HomiLabs | Servio | Web
// Updated: 27 May 2026
// - Added token state (refreshed automatically by Firebase)
// - getToken() retained for one-off forced refresh cases
// ─────────────────────────────────────────
import { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { auth } from '../config/firebase';
import { getProfile } from '../services/authService';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser]               = useState(null);
  const [token, setToken]             = useState(null);   // ← ADDED
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading]         = useState(true);
  const [profileLoading, setProfileLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser);
        setProfileLoading(true);
        try {
          const t = await firebaseUser.getIdToken();
          setToken(t);                                     // ← ADDED
          const profile = await getProfile(t);
          setUserProfile(profile);
        } catch (err) {
          console.error('Failed to load profile:', err);
          setToken(null);                                  // ← ADDED
          setUserProfile(null);
        } finally {
          setProfileLoading(false);
        }
      } else {
        setUser(null);
        setToken(null);                                    // ← ADDED
        setUserProfile(null);
        setProfileLoading(false);
      }
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const logout = async () => {
    await signOut(auth);
    setUser(null);
    setToken(null);                                        // ← ADDED
    setUserProfile(null);
  };

  // getToken() forces a fresh token from Firebase.
  // Use this before any sensitive API call that may have been
  // sitting open for more than 1 hour (tokens expire in 60 min).
  const getToken = async () => {
    if (!user) return null;
    const t = await user.getIdToken(true);  // true = force refresh
    setToken(t);                                           // ← keep state in sync
    return t;
  };

  return (
    <AuthContext.Provider value={{
      user,
      token,              // ← ADDED to context value
      userProfile,
      setUserProfile,
      loading,
      profileLoading,
      logout,
      getToken,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
