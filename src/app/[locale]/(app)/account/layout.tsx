import { AccountNavigation } from "@/components/account/account-navigation";

export default function AccountLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto flex w-full max-w-5xl min-w-0 flex-col gap-6 pb-6">
      <AccountNavigation />
      <div className="min-w-0 w-full max-w-3xl">{children}</div>
    </div>
  );
}
