import NextAuth from "next-auth";
import { authOptions } from "@/lib/auth";

// Route files may only export HTTP handlers, so config lives in src/lib/auth.ts.
const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
