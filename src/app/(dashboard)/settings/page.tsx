import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getServerAuthSession } from "@/lib/server-auth";
import SettingsPageClient from "./SettingsPageClient";

export default async function SettingsPage() {
  const session = await getServerAuthSession();
  const userId = session?.user?.id ?? session?.session?.userId;

  if (!userId) {
    redirect("/login");
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { resumeText: true },
  });

  return (
    <SettingsPageClient
      user={{
        name: session?.user?.name ?? "",
        email: session?.user?.email ?? "",
        image: session?.user?.image ?? null,
      }}
      initialResumeText={user?.resumeText ?? null}
    />
  );
}
