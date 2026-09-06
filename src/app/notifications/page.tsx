import { redirect } from "next/navigation";
import { getUser, isAdminEmail } from "@/lib/auth";
import { AppNav } from "@/components/app/AppNav";
import { NotificationsList } from "./notifications-list";

export const metadata = { title: "Notifications" };

export default async function NotificationsPage() {
  const user = await getUser();
  if (!user) redirect("/login");

  return (
    <>
      <AppNav email={user.email ?? ""} isAdmin={isAdminEmail(user.email)} />
      <main id="main" className="mx-auto max-w-2xl px-4 py-10 sm:px-6 lg:px-8">
        <h1 className="font-display text-2xl font-bold tracking-tight text-surface-900">Notifications</h1>
        <p className="mt-1 text-surface-500">Offers, invitations, and updates from the community.</p>
        <NotificationsList />
      </main>
    </>
  );
}
