import Link from "next/link";
import { redirect } from "next/navigation";
import { CodingWorkspacePageClient } from "@/components/coding/CodingWorkspacePageClient";
import { getServerAuthSession } from "@/lib/server-auth";
import { getPublishedCodingWorkspace } from "@/repositories/coding-question-repo";

export default async function CodingDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const session = await getServerAuthSession();
  if (!session?.user) redirect("/login");
  const { slug } = await params;
  const workspace = await getPublishedCodingWorkspace(slug, session.user.id);

  if (!workspace) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <h1 className="text-xl font-bold text-[#F2F4F8]">Problem not found</h1>
        <p className="mt-2 text-sm text-[#A8B0C2]">
          The coding problem you&apos;re looking for doesn&apos;t exist.
        </p>
        <Link
          href="/coding"
          className="mt-4 text-sm font-medium text-[#93C5FD] underline hover:text-[#BFDBFE]"
        >
          ← Back to Coding
        </Link>
      </div>
    );
  }

  return <CodingWorkspacePageClient question={workspace} />;
}
