// ─── Auth state bridge ────────────────────────────────────────────────────────
// Breaks the circular dependency between AppNavigator and useAuth.
// AppNavigator registers its setState setter here on mount.
// useAuth calls notifyAuthChange() to trigger a stack switch.
// Neither file needs to import the other.

let _setIsLoggedIn: ((v: boolean) => void) | null = null;

export function registerAuthSetter(setter: (v: boolean) => void) {
  _setIsLoggedIn = setter;
}

export function notifyAuthChange(loggedIn: boolean) {
  _setIsLoggedIn?.(loggedIn);
}
