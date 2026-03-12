
import { SlideIn } from "@/components/ui/motion";
import RecordingsList from "@/components/recordings/RecordingsList";
import { listUserVideos } from "@/lib/s3/videos";
import { prisma } from "@/lib/prisma";
import { getServerAuthSession } from "@/lib/server-auth";

export default async function RecordingsPage() {
  const session = await getServerAuthSession();

  if (!session?.user?.email) {
    return (
      <>
        <div className="space-y-8 pb-8">
          <SlideIn>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-zinc-900">Recordings</h1>
              <p className="mt-1 text-sm text-zinc-500">Review and manage your saved interview session videos.</p>
            </div>
          </SlideIn>
          <div className="rounded-2xl border border-dashed border-zinc-300 bg-zinc-50 py-12 text-center text-sm text-zinc-500">
            Please sign in to view recordings.
          </div>
        </div>
      </>
    );
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { id: true },
  });

  const initialVideos = user ? await listUserVideos(`${user.id}/`) : [];

  return (
    <>
      <div className="space-y-8 pb-8">
        <SlideIn>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-zinc-900">Recordings</h1>
            <p className="mt-1 text-sm text-zinc-500">Review and manage your saved interview session videos.</p>
          </div>
        </SlideIn>

        <RecordingsList initialVideos={initialVideos} />
      </div>
    </>
  );
}
