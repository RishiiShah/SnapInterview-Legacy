import Link from "next/link";

import { prisma } from "@/lib/prisma";
import { deletePracticeQuestionAction } from "./actions";

export default async function AdminQuestionsPage() {
  const [totalQuestions, categories, difficulties, recentQuestions] = await Promise.all([
    prisma.practiceQuestion.count(),
    prisma.practiceQuestion.groupBy({
      by: ["category"],
      _count: { _all: true },
      orderBy: { _count: { category: "desc" } },
    }),
    prisma.practiceQuestion.groupBy({
      by: ["difficulty"],
      _count: { _all: true },
      orderBy: { _count: { difficulty: "desc" } },
    }),
    prisma.practiceQuestion.findMany({
      orderBy: { updatedAt: "desc" },
      take: 30,
      select: {
        id: true,
        slug: true,
        category: true,
        difficulty: true,
        tags: true,
        updatedAt: true,
      },
    }),
  ]);

  return (
    <div className="space-y-6">
      <section>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight text-zinc-900">Questions</h2>
            <p className="mt-1 text-sm text-zinc-500">Practice question inventory and taxonomy distribution.</p>
          </div>

          <Link
            href="/admin/questions/new"
            className="rounded-lg bg-zinc-900 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-700"
          >
            + Add Question
          </Link>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
          <p className="text-sm text-zinc-500">Total Questions</p>
          <p className="mt-2 text-2xl font-semibold text-zinc-900">{totalQuestions.toLocaleString()}</p>
        </div>
        <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
          <p className="text-sm text-zinc-500">Top Categories</p>
          <div className="mt-2 space-y-1 text-sm text-zinc-700">
            {categories.slice(0, 4).map((entry) => (
              <p key={entry.category}>
                {entry.category}: <span className="font-medium">{entry._count._all}</span>
              </p>
            ))}
          </div>
        </div>
        <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
          <p className="text-sm text-zinc-500">Difficulty Split</p>
          <div className="mt-2 space-y-1 text-sm text-zinc-700">
            {difficulties.map((entry) => (
              <p key={entry.difficulty}>
                {entry.difficulty}: <span className="font-medium">{entry._count._all}</span>
              </p>
            ))}
          </div>
        </div>
      </section>

      <section className="overflow-x-auto rounded-xl border border-zinc-200 bg-white shadow-sm">
        <table className="min-w-full text-sm">
          <thead className="border-b border-zinc-200 bg-zinc-50 text-left text-xs uppercase tracking-wide text-zinc-500">
            <tr>
              <th className="px-4 py-3">Slug</th>
              <th className="px-4 py-3">Category</th>
              <th className="px-4 py-3">Difficulty</th>
              <th className="px-4 py-3">Tags</th>
              <th className="px-4 py-3">Updated</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {recentQuestions.map((question) => (
              <tr key={question.id} className="border-b border-zinc-100 last:border-b-0">
                <td className="px-4 py-3 font-medium text-zinc-900">{question.slug}</td>
                <td className="px-4 py-3 text-zinc-700">{question.category}</td>
                <td className="px-4 py-3 text-zinc-700">{question.difficulty}</td>
                <td className="px-4 py-3 text-zinc-700">{question.tags.slice(0, 3).join(", ") || "-"}</td>
                <td className="px-4 py-3 text-zinc-700">
                  {new Intl.DateTimeFormat("en-US", { dateStyle: "medium" }).format(question.updatedAt)}
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-2">
                    <Link
                      href={`/admin/questions/${question.id}/edit`}
                      className="rounded-md border border-zinc-200 px-2.5 py-1 text-xs font-medium text-zinc-700 hover:bg-zinc-100"
                    >
                      Edit
                    </Link>

                    <form action={deletePracticeQuestionAction}>
                      <input type="hidden" name="questionId" value={question.id} />
                      <button
                        type="submit"
                        className="rounded-md border border-red-200 px-2.5 py-1 text-xs font-medium text-red-700 hover:bg-red-50"
                      >
                        Delete
                      </button>
                    </form>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
