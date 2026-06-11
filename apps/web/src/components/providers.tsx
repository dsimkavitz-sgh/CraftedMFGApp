"use client";

import { createContext, useContext } from "react";
import type { UserRole, UserRow } from "@crafted/shared";

interface ProfileContextValue {
  profile: UserRow | null;
}

const ProfileContext = createContext<ProfileContextValue>({ profile: null });

/**
 * Hydrated from the authenticated server layout with the result of
 * getCurrentProfile() so every client component can read profile + role.
 */
export function Providers({
  profile,
  children,
}: {
  profile: UserRow | null;
  children: React.ReactNode;
}) {
  return <ProfileContext.Provider value={{ profile }}>{children}</ProfileContext.Provider>;
}

export function useProfile(): UserRow | null {
  return useContext(ProfileContext).profile;
}

export function useRole(): UserRole | null {
  return useProfile()?.role ?? null;
}
