import { notFound } from "next/navigation";

import AdminInterviewDetailView from "@/components/admin/AdminInterviewDetail";
import { getAdminInterviewDetail } from "@/lib/admin/interview-detail";
type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function AdminInterviewDetailPage({ params }: PageProps) {
  const { id } = await params;

  const interview = await getAdminInterviewDetail(id);
  if (!interview) {
    notFound();
  }

  return <AdminInterviewDetailView interview={interview} />;
}
