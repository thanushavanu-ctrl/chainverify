import React, { createContext, useContext, useState, useEffect } from "react";

export interface User {
  id: string;
  email: string;
  fullName: string;
  role: "USER" | "ADMIN" | string;
}

export interface IdentityProfile {
  id?: string;
  pseudonymousId: string;
  commitmentHash: string;
  status: "VERIFIED" | "PENDING" | "REJECTED" | "REVOKED" | "NONE";
  statusReason?: string;
  documentType?: string;
  registeredTxHash?: string;
  registeredBlockNumber?: number;
  verifiedTxHash?: string;
  verifiedBlockNumber?: number;
  createdAt?: string;
  updatedAt?: string;
}

interface AuthContextType {
  user: User | null;
  identityProfile: IdentityProfile | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  register: (payload: {
    fullName: string;
    email: string;
    password: string;
    termsAccepted: boolean;
  }) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [identityProfile, setIdentityProfile] = useState<IdentityProfile | null>(null);
  const [token, setToken] = useState<string | null>(() => localStorage.getItem("chainverify_token"));
  const [isLoading, setIsLoading] = useState(true);

  const fetchCurrentUser = async () => {
    try {
      const headers: Record<string, string> = {};
      const savedToken = localStorage.getItem("chainverify_token");
      if (savedToken) {
        headers["Authorization"] = `Bearer ${savedToken}`;
      }

      const res = await fetch("/api/auth/me", {
        headers,
        credentials: "include",
      });

      if (res.ok) {
        const data = await res.json();
        if (data.success && data.user) {
          setUser({
            id: data.user.id,
            email: data.user.email,
            fullName: data.user.fullName,
            role: data.user.role,
          });
          setIdentityProfile(data.user.identityProfile || null);
        }
      } else {
        setUser(null);
        setIdentityProfile(null);
        localStorage.removeItem("chainverify_token");
      }
    } catch (err) {
      console.warn("Could not check current user session:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCurrentUser();
  }, []);

  const login = async (email: string, password: string) => {
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        return { success: false, error: data.error || "Authentication failed." };
      }

      setUser(data.user);
      setToken(data.token);
      localStorage.setItem("chainverify_token", data.token);

      await fetchCurrentUser();
      return { success: true };
    } catch (err: any) {
      return { success: false, error: "Network error connecting to backend service." };
    }
  };

  const register = async (payload: {
    fullName: string;
    email: string;
    password: string;
    termsAccepted: boolean;
  }) => {
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        return {
          success: false,
          error: data.details
            ? data.details.map((d: any) => d.message).join(", ")
            : data.error || "Registration failed.",
        };
      }

      setUser(data.user);
      setToken(data.token);
      localStorage.setItem("chainverify_token", data.token);

      await fetchCurrentUser();
      return { success: true };
    } catch (err: any) {
      return { success: false, error: "Network error during registration." };
    }
  };

  const logout = async () => {
    try {
      await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "include",
      });
    } catch (err) {
      console.warn("Logout request failed:", err);
    } finally {
      setUser(null);
      setIdentityProfile(null);
      setToken(null);
      localStorage.removeItem("chainverify_token");
      window.location.href = "/";
    }
  };

  const refreshProfile = async () => {
    await fetchCurrentUser();
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        identityProfile,
        token,
        isLoading,
        login,
        register,
        logout,
        refreshProfile,
      }}
    >
      {children}
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
