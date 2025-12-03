import {
  createContext,
  useContext,
  createSignal,
  onMount,
  ParentComponent,
} from "solid-js";

import {
  User,
  signInWithPopup,
  GoogleAuthProvider,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
} from "firebase/auth";

import { auth } from "./firebase";
import { userManager } from "./socket";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";

interface AuthContextType {
  user: () => User | null;
  loading: () => boolean;
  signInWithGoogle: () => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signUpWithEmail: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  getToken: () => Promise<string | null>;
}

const AuthContext = createContext<AuthContextType>();

export const AuthProvider: ParentComponent = (props) => {
  const [user, setUser] = createSignal<User | null>(null);
  const [loading, setLoading] = createSignal(true);

  onMount(() => {
    // listen to auth state
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      setLoading(false);

      // verify token & update userId
      if (firebaseUser) {
        try {
          const token = await firebaseUser.getIdToken();

          const response = await fetch(`${API_URL}/api/auth/verify`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ token }),
          });

          if (response.ok) {
            const data = await response.json();
            userManager.setUserId(data.uid);
            console.log("[Auth] User signed in:", data.uid);
          }
        } catch (error) {
          console.error("[Auth] Token verification failed:", error);
        }
      }
    });

    return unsubscribe;
  });

  const getToken = async (): Promise<string | null> => {
    const currentUser = user();
    if (!currentUser) return null;

    try {
      return await currentUser.getIdToken();
    } catch (error) {
      console.error("[Auth] Failed to get token:", error);
      return null;
    }
  };

  const signInWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    try {
      const result = await signInWithPopup(auth, provider);
      console.log("[Auth] Google sign-in successful:", result.user.uid);
    } catch (error) {
      console.error("[Auth] Google sign-in error:", error);
      throw error;
    }
  };

  const signInWithEmail = async (email: string, password: string) => {
    try {
      const result = await signInWithEmailAndPassword(auth, email, password);
      console.log("[Auth] Email sign-in successful:", result.user.uid);
    } catch (error) {
      console.error("[Auth] Email sign-in error:", error);
      throw error;
    }
  };

  const signUpWithEmail = async (email: string, password: string) => {
    try {
      const result = await createUserWithEmailAndPassword(
        auth,
        email,
        password,
      );
      console.log("[Auth] Email sign-up successful:", result.user.uid);
    } catch (error) {
      console.error("[Auth] Email sign-up error:", error);
      throw error;
    }
  };

  const signOut = async () => {
    try {
      await firebaseSignOut(auth);
      // generate new anon Id
      const newUserId = `user-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      userManager.setUserId(newUserId);
      console.log("[Auth] User signed out, new anonymous ID:", newUserId);
    } catch (error) {
      console.error("[Auth] Sign-out error:", error);
      throw error;
    }
  };

  const contextValue: AuthContextType = {
    user,
    loading,
    signInWithGoogle,
    signInWithEmail,
    signUpWithEmail,
    signOut,
    getToken,
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {props.children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
