import { signIn } from "@/auth";

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const denied = error === "AccessDenied";

  return (
    <div className="flex min-h-screen flex-1 flex-col items-center justify-center gap-8 bg-neutral-950 px-6 text-center">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-white">MTG Game Tracker</h1>
        <p className="mt-2 text-neutral-400">
          {denied
            ? "That Google account isn't on the list."
            : "Sign in to continue"}
        </p>
      </div>

      {denied && (
        <p className="max-w-xs text-sm text-neutral-500">
          This app is invite-only — ask an existing player to add your email
          to your profile, then try again.
        </p>
      )}

      <form
        action={async () => {
          "use server";
          await signIn("google", { redirectTo: "/" });
        }}
      >
        <button
          type="submit"
          className="flex items-center gap-3 rounded-2xl bg-white px-6 py-4 text-left font-semibold text-neutral-900 shadow-lg active:scale-95"
        >
          <span className="text-xl">🔐</span>
          Sign in with Google
        </button>
      </form>
    </div>
  );
}
