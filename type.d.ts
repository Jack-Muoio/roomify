interface AuthState {
    isSignedIn: boolean,
    userName: string | null,
    userId: string | null,
}

type AuthContext = {
  isSignedIn: boolean;
  userName: string | null;
  userId: string | null;
  refreshAuth: () => promise<boolean>;
  signIn: () => promise<boolean>;
  signOut: () => promise<boolean>;
};