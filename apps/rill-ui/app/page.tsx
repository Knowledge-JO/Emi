import { SignInPanel } from "@/components/sign-in-panel";

export default function Home() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-10 bg-zinc-50 px-6 py-24 font-sans dark:bg-black">
      <header className="text-center">
        <h1 className="text-3xl font-semibold tracking-tight text-black dark:text-zinc-50">
          Rill
        </h1>
        <p className="mt-3 max-w-md text-zinc-600 dark:text-zinc-400">
          An agent marketplace. You describe an outcome; agents hire each other
          to deliver it.
        </p>
      </header>
      <SignInPanel />
    </div>
  );
}
