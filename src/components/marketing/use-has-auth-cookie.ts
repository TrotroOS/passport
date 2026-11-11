"use client";

import { useSyncExternalStore } from "react";

function hasAuthCookie() {
  return document.cookie.split(";").some((part) => part.trim().startsWith("sb-"));
}

function subscribe() {
  return () => undefined;
}

export function useHasSupabaseAuthCookie() {
  return useSyncExternalStore(subscribe, hasAuthCookie, () => false);
}
