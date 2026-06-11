import DashboardShell from "@/components/dashboard/DashboardShell";
import { getServerAuthSession } from "@/lib/server-auth";
import { redirect } from "next/navigation";

export default async function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const session = await getServerAuthSession();
    const userId = session?.user?.id ?? session?.session?.userId;

    if (!userId) {
        redirect("/login");
    }

    return (
        <DashboardShell>
            {children}
        </DashboardShell>
    );
}
