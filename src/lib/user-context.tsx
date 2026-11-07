"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { User } from "@/lib/api/schemas";

const UserContext = createContext<User | null>(null);

/** The signed-in user, loaded on the server by the portal layout (no loading flash). */
export function UserProvider({ user, children }: { user: User; children: ReactNode }) {
  return <UserContext.Provider value={user}>{children}</UserContext.Provider>;
}

export function useUser(): User {
  const user = useContext(UserContext);
  if (!user) throw new Error("useUser must be used inside the portal layout.");
  return user;
}
