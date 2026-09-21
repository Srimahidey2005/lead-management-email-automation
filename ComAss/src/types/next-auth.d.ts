import "next-auth";
import "next-auth/jwt";

declare module "next-auth" {
  interface Session {
    /** Set when the Gmail token could not be refreshed and the user must reconnect. */
    error?: "RefreshAccessTokenError";
  }
}

declare module "next-auth/jwt" {
  // These live only in the encrypted server-side JWT cookie, never in the client session.
  interface JWT {
    accessToken?: string;
    refreshToken?: string;
    accessTokenExpires?: number;
    error?: "RefreshAccessTokenError";
  }
}
