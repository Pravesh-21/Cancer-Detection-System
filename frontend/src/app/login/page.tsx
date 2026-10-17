import Link from "next/link";
import AuthShell from "@/components/auth/AuthShell";
import LoginForm from "@/components/auth/LoginForm";

export const metadata = { title: "Sign in | CancerLens" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  const next = typeof params.next === "string" ? params.next : undefined;

  return (
    <AuthShell
      title="Sign in"
      subtitle="Access your hospital's diagnostic workspace"
      footer={
        <>
          New hospital?{" "}
          <Link href="/register" className="font-bold text-[#0F74C9] hover:underline">
            Register your hospital
          </Link>
        </>
      }
    >
      <LoginForm next={next} expired={params.expired === "1"} />
    </AuthShell>
  );
}
