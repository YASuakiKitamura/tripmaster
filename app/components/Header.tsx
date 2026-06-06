import { auth, signOut } from "@/auth";
import { TripSwitcher } from "./TripSwitcher";

export async function Header() {
  const session = await auth();
  const user = session?.user;

  return (
    <header className="sticky top-0 z-50 bg-[var(--accent)] px-5 pt-[calc(env(safe-area-inset-top)+14px)] pb-3 text-white shadow-[0_2px_12px_rgba(0,0,0,0.18)]">
      <div className="mx-auto flex max-w-[680px] items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="font-serif-jp text-[20px] font-bold tracking-[0.05em]">
            🧳 PP添乗員
          </h1>
          <p className="mt-0.5 text-[11px] opacity-85">旅の作戦をスマホ1つに</p>
        </div>

        {user && (
          <div className="flex flex-shrink-0 items-center gap-2">
            <TripSwitcher />
            <form
              action={async () => {
                "use server";
                await signOut({ redirectTo: "/login" });
              }}
            >
              <button
                type="submit"
                className="rounded-full bg-white/20 px-2.5 py-1 text-[11px] font-bold active:bg-white/30"
              >
                ログアウト
              </button>
            </form>
          </div>
        )}
      </div>
    </header>
  );
}
