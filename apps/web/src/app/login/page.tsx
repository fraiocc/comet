import { redirect } from "next/navigation";

import { AuthForm } from "@/components/AuthForm";
import { getSessionUser } from "@/lib/auth";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const user = await getSessionUser();
  if (user) {
    redirect("/dashboard");
  }

  const { error } = await searchParams;

  return <AuthForm mode="login" initialError={error ?? null} />;
}
