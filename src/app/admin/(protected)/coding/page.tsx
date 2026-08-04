import Link from "next/link";

import { requireAdminSession } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";

export default async function AdminCodingPage() {
  await requireAdminSession();
  const questions = await prisma.codingQuestion.findMany({ select: { id: true, title: true, slug: true, difficulty: true, isPublished: true, updatedAt: true }, orderBy: { updatedAt: "desc" } });
  return <div className="space-y-6"><div className="flex items-center justify-between"><div><h1 className="text-2xl font-semibold text-[#F2F4F8]">Coding Problems</h1><p className="mt-1 text-sm text-[#A8B0C2]">Create and publish browser-run coding problems.</p></div><Link href="/admin/coding/new" className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-500">Add coding problem</Link></div><div className="overflow-hidden rounded-xl border border-white/[0.08]">{questions.map((question) => <Link key={question.id} href={`/admin/coding/${question.id}/edit`} className="flex items-center justify-between border-b border-white/[0.06] px-4 py-3 last:border-0 hover:bg-white/[0.04]"><span className="font-medium text-[#E8ECF4]">{question.title}</span><span className="text-xs text-[#A8B0C2]">{question.difficulty} · {question.isPublished ? "Published" : "Draft"}</span></Link>)}{questions.length === 0 ? <p className="p-8 text-center text-sm text-[#A8B0C2]">No coding problems yet.</p> : null}</div></div>;
}
