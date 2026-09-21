import { LoginForm } from "@/components/auth/LoginForm";
import { isGoogleConfigured } from "@/lib/config";
import { safeCallbackUrl } from "@/lib/safe-redirect";

export const metadata = { title: "Sign in | Lead Management" };

type SearchParams = { [key: string]: string | string[] | undefined };

const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

export default async function LoginPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const params = await searchParams;

  return (
    <LoginForm
      callbackUrl={safeCallbackUrl(first(params.callbackUrl))}
      error={first(params.error)}
      configured={isGoogleConfigured()}
    />
  );
}
