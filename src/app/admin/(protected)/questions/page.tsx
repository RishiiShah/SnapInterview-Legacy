import Link from "next/link";

import { getAdminQuestionFacets } from "@/lib/admin/question-facets";
import { prisma } from "@/lib/prisma";
import { deletePracticeQuestionAction, importPracticeQuestionsAction } from "./actions";
import {
  adminActionLinkClass,
  adminDangerButtonClass,
  adminPaginationLinkClass,
  adminPaginationLinkDisabledClass,
  adminPrimaryLinkClass,
  adminSecondaryLinkClass,
} from "@/components/admin/admin-styles";
import { ConfirmActionForm } from "@/components/admin/ConfirmActionForm";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

const filterSelectClass =
  "w-full rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-2.5 text-sm text-zinc-900 outline-none transition-all focus:border-zinc-400 focus:bg-white focus:ring-2 focus:ring-zinc-100";

export default async function AdminQuestionsPage({
  searchParams,
}: {
  searchParams?: Promise<{
    q?: string;
    category?: string;
    difficulty?: string;
    page?: string;
    error?: string;
    message?: string;
  }>;
}) {
  const sp = searchParams ? await searchParams : undefined;
  const q = (sp?.q ?? "").trim();
  const category = (sp?.category ?? "").trim();
  const difficulty = (sp?.difficulty ?? "").trim();
  const page = Math.max(1, Number(sp?.page ?? "1") || 1);
  const error = sp?.error ? decodeURIComponent(sp.error) : "";
  const message = sp?.message ? decodeURIComponent(sp.message) : "";
  const pageSize = 20;

  const where = {
    ...(q ? { slug: { contains: q, mode: "insensitive" as const } } : {}),
    ...(category ? { category } : {}),
    ...(difficulty ? { difficulty } : {}),
  };

  const [{ totalQuestions, categories, difficulties }, filteredCount, recentQuestions] =
    await Promise.all([
      getAdminQuestionFacets(),
      prisma.practiceQuestion.count({ where }),
      prisma.practiceQuestion.findMany({
        where,
        orderBy: { updatedAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
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

  const totalPages = Math.max(1, Math.ceil(filteredCount / pageSize));
  const prevPage = Math.max(1, page - 1);
  const nextPage = Math.min(totalPages, page + 1);

  const paramsForPage = (targetPage: number) => {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (category) params.set("category", category);
    if (difficulty) params.set("difficulty", difficulty);
    params.set("page", String(targetPage));
    return `/admin/questions?${params.toString()}`;
  };
  const filterFormKey = `${q}|${category}|${difficulty}`;

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
            className={adminPrimaryLinkClass}
          >
            + Add Question
          </Link>
        </div>
      </section>

      <section className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
        <form key={filterFormKey} className="grid gap-3 md:grid-cols-5">
          <Input
            type="text"
            name="q"
            defaultValue={q}
            placeholder="Search by slug"
          />
          <select
            name="category"
            defaultValue={category}
            className={filterSelectClass}
          >
            <option value="">All categories</option>
            {categories.map((entry) => (
              <option key={entry.category} value={entry.category}>
                {entry.category}
              </option>
            ))}
          </select>
          <select
            name="difficulty"
            defaultValue={difficulty}
            className={filterSelectClass}
          >
            <option value="">All difficulties</option>
            {difficulties.map((entry) => (
              <option key={entry.difficulty} value={entry.difficulty}>
                {entry.difficulty}
              </option>
            ))}
          </select>
          <Button type="submit" size="md" className="w-full">
            Apply filters
          </Button>
          <Link href="/admin/questions" className="w-full">
            <Button type="button" variant="secondary" size="md" className="w-full">
              Clear filters
            </Button>
          </Link>
        </form>
      </section>

      {message ? (
        <section className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800 shadow-sm">
          {message}
        </section>
      ) : null}
      {error ? (
        <section className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 shadow-sm">
          {error}
        </section>
      ) : null}

      <section className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold text-zinc-900">Bulk Import / Export</h3>
            <p className="text-xs text-zinc-500">Import CSV/JSON questions and export full question bank.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <a
              href="/api/admin/questions/export?format=csv"
              className={adminSecondaryLinkClass}
            >
              Export CSV
            </a>
            <a
              href="/api/admin/questions/export?format=json"
              className={adminSecondaryLinkClass}
            >
              Export JSON
            </a>
          </div>
        </div>

        <form action={importPracticeQuestionsAction} className="mt-4 space-y-2">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <input
              type="file"
              name="file"
              accept=".csv,application/json"
              required
              className="min-w-0 flex-1 rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2.5 text-sm text-zinc-700 file:mr-3 file:rounded-md file:border-0 file:bg-zinc-900 file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-white"
            />
            <Button type="submit" size="md" className="w-full shrink-0 sm:w-auto">
              Import file
            </Button>
          </div>
          <p className="text-xs text-zinc-500">
            New slugs are added. Existing slugs only get new tags merged in—edit a question to remove tags that do not fit.
          </p>
        </form>
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
          <p className="text-sm text-zinc-500">Total Questions</p>
          <p className="mt-2 text-2xl font-semibold text-zinc-900">{totalQuestions.toLocaleString()}</p>
        </div>
        <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
          <p className="text-sm text-zinc-500">Top Categories</p>
          <div className="mt-2 space-y-1 text-sm text-zinc-700">
            {[...categories]
              .sort((a, b) => b._count._all - a._count._all)
              .slice(0, 4)
              .map((entry) => (
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
                      className={adminActionLinkClass}
                    >
                      Edit
                    </Link>

                    <ConfirmActionForm
                      action={deletePracticeQuestionAction}
                      hiddenFields={{ questionId: question.id }}
                      buttonLabel="Delete"
                      buttonClassName={adminDangerButtonClass}
                      confirmMessage={`Delete question "${question.slug}"?`}
                      reasonRequired
                      reasonPrompt="Reason for deleting this question"
                    />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="flex items-center justify-between rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm shadow-sm">
        <p className="text-zinc-600">
          Showing {(page - 1) * pageSize + 1}-
          {Math.min(page * pageSize, filteredCount)} of {filteredCount}
        </p>
        <div className="flex items-center gap-2">
          <Link
            href={paramsForPage(prevPage)}
            className={page === 1 ? adminPaginationLinkDisabledClass : adminPaginationLinkClass}
          >
            Previous
          </Link>
          <span className="text-zinc-500">Page {page} / {totalPages}</span>
          <Link
            href={paramsForPage(nextPage)}
            className={page === totalPages ? adminPaginationLinkDisabledClass : adminPaginationLinkClass}
          >
            Next
          </Link>
        </div>
      </section>
    </div>
  );
}
