import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatPermissionLabel(
  displayName: string,
  systemName?: string,
) {
  const normalized = displayName.trim();

  if (systemName) {
    const prefix = `${systemName}:`;
    if (normalized.toLowerCase().startsWith(prefix.toLowerCase())) {
      const withoutPrefix = normalized.slice(prefix.length).trim();
      return withoutPrefix || normalized;
    }
  }

  const colonIndex = normalized.indexOf(":");
  if (colonIndex > -1) {
    const withoutPrefix = normalized.slice(colonIndex + 1).trim();
    return withoutPrefix || normalized;
  }

  return normalized;
}

export function formatRoleDescription(description: string | null | undefined) {
  if (!description) {
    return description ?? "";
  }

  return description.replace(/^\s*default\s*manager\s*:/i, "Manager:");
}
