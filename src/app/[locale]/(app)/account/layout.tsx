import { AccountNavigation } from "@/components/account/account-navigation";

export default function AccountLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto grid w-full max-w-6xl min-w-0 gap-8 pb-6 lg:grid-cols-[220px_minmax(0,1fr)] lg:gap-12">
      <AccountNavigation />
      <div className="min-w-0 max-w-3xl">{children}</div>
    </div>
  );
}
