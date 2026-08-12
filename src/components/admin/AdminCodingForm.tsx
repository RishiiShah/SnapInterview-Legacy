"use client";

import Link from "next/link";

import { AdminCodingFields } from "@/components/admin/AdminCodingFields";
import {
  adminFieldClass,
  adminHeadingClass,
  adminInputOverrideClass,
  adminLabelClass,
  adminMutedClass,
  adminPanelClass,
  adminPrimaryButtonClass,
  adminSecondaryButtonClass,
  adminSecondaryLinkClass,
} from "@/components/admin/admin-styles";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

export type AdminCodingFormValues = {
  slug: string;
  title: string;
  description: string;
  constraints: string;
  difficulty: string;
  topics: string;
  estimatedTime: string;
  hint: string;
  starterCode: Record<string, string>;
  testCases: Array<{ input: string; expectedOutput: string }>;
  isPublished: boolean;
};

const defaults: AdminCodingFormValues = {
  slug: "", title: "", description: "", constraints: "", difficulty: "easy", topics: "", estimatedTime: "", hint: "",
  starterCode: {}, testCases: [], isPublished: false,
};

export function AdminCodingForm({
  mode,
  action,
  questionId,
  initialValues,
  error,
}: {
  mode: "create" | "edit";
  action: (formData: FormData) => void | Promise<void>;
  questionId?: string;
  initialValues?: Partial<AdminCodingFormValues>;
  error?: string;
}) {
  const values = { ...defaults, ...initialValues };
  return <div className="mx-auto max-w-3xl space-y-6">
    <div className="flex items-center justify-between gap-4"><div><h2 className={adminHeadingClass}>{mode === "create" ? "Add Coding Problem" : "Edit Coding Problem"}</h2><p className={`mt-1 ${adminMutedClass}`}>Coding problems are managed separately from Q&A practice.</p></div><Link href="/admin/coding" className={adminSecondaryLinkClass}>Back to Coding</Link></div>
    {error ? <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">{error}</div> : null}
    <form action={action} className={`space-y-5 ${adminPanelClass} p-6`}>
      {questionId ? <input type="hidden" name="questionId" value={questionId} /> : null}
      <div><label htmlFor="title" className={`mb-1.5 block ${adminLabelClass}`}>Title</label><Input id="title" name="title" required defaultValue={values.title} className={adminInputOverrideClass} /></div>
      <div className="grid gap-4 sm:grid-cols-2"><div><label htmlFor="slug" className={`mb-1.5 block ${adminLabelClass}`}>Slug</label><Input id="slug" name="slug" defaultValue={values.slug} className={adminInputOverrideClass} /></div><div><label htmlFor="estimatedTime" className={`mb-1.5 block ${adminLabelClass}`}>Estimated time</label><Input id="estimatedTime" name="estimatedTime" defaultValue={values.estimatedTime} className={adminInputOverrideClass} /></div></div>
      <div className="grid gap-4 sm:grid-cols-2"><div><label htmlFor="difficulty" className={`mb-1.5 block ${adminLabelClass}`}>Difficulty</label><select id="difficulty" name="difficulty" defaultValue={values.difficulty} className={adminFieldClass}><option value="easy">Easy</option><option value="medium">Medium</option><option value="hard">Hard</option></select></div><div><label htmlFor="topics" className={`mb-1.5 block ${adminLabelClass}`}>Topics</label><Input id="topics" name="topics" defaultValue={values.topics} placeholder="arrays, hash-map" className={adminInputOverrideClass} /></div></div>
      <div><label htmlFor="description" className={`mb-1.5 block ${adminLabelClass}`}>Description</label><textarea id="description" name="description" rows={7} defaultValue={values.description} className={adminFieldClass} /></div>
      <div><label htmlFor="constraints" className={`mb-1.5 block ${adminLabelClass}`}>Constraints</label><textarea id="constraints" name="constraints" rows={3} defaultValue={values.constraints} className={adminFieldClass} /></div>
      <div><label htmlFor="hint" className={`mb-1.5 block ${adminLabelClass}`}>Hint</label><textarea id="hint" name="hint" rows={3} defaultValue={values.hint} className={adminFieldClass} /></div>
      <AdminCodingFields initialStarterCode={values.starterCode} initialTestCases={values.testCases} />
      <label className="flex items-center gap-2 text-sm text-[#E8ECF4]"><input type="hidden" name="isPublished" value="false" /><input type="checkbox" name="isPublished" value="true" defaultChecked={values.isPublished} /> Publish this problem</label>
      <div className="flex gap-3 pt-2"><Button type="submit" className={adminPrimaryButtonClass}>{mode === "create" ? "Create coding problem" : "Save changes"}</Button><Link href="/admin/coding"><Button type="button" variant="secondary" className={adminSecondaryButtonClass}>Cancel</Button></Link></div>
    </form>
  </div>;
}
