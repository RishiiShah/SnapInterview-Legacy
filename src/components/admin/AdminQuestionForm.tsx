"use client";

import { useState } from "react";
import Link from "next/link";

import { adminSecondaryLinkClass } from "@/components/admin/admin-styles";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import {
  INTERVIEW_DIFFICULTY_VALUES,
  INTERVIEW_TYPE_VALUES,
} from "@/lib/interview/domain";
import { AdminCodingFields } from "./AdminCodingFields";

export type AdminQuestionFormValues = {
  slug: string;
  text: string;
  category: string;
  difficulty: string;
  estimatedTime: string;
  tags: string;
  hint: string;
  sampleAnswer: string;
  type?: string;
  description?: string;
  constraints?: string;
  starterCode?: Record<string, string>;
  testCases?: Array<{ input: string; expectedOutput: string; isHidden: boolean }>;
  solutionCode?: Record<string, string>;
};

const defaultValues: AdminQuestionFormValues = {
  slug: "",
  text: "",
  category: "behavioral",
  difficulty: "medium",
  estimatedTime: "5 min",
  tags: "",
  hint: "",
  sampleAnswer: "",
};

const fieldClass =
  "w-full rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-2.5 text-sm text-zinc-900 outline-none placeholder:text-zinc-600 transition-all focus:border-zinc-400 focus:bg-white focus:ring-2 focus:ring-zinc-100";

type AdminQuestionFormProps = {
  mode: "create" | "edit";
  action: (formData: FormData) => void | Promise<void>;
  questionId?: number;
  initialValues?: Partial<AdminQuestionFormValues>;
  error?: string;
};

export function AdminQuestionForm({
  mode,
  action,
  questionId,
  initialValues,
  error,
}: AdminQuestionFormProps) {
  const values = { ...defaultValues, ...initialValues };
  const title = mode === "create" ? "Add Question" : "Edit Question";
  const [questionType, setQuestionType] = useState(values.type ?? "text");

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight text-zinc-900">{title}</h2>
          <p className="mt-1 text-sm text-zinc-600">
            {mode === "create"
              ? "Create a new practice question in the question bank."
              : "Update question content and metadata."}
          </p>
        </div>
        <Link
          href="/admin/questions"
          className={adminSecondaryLinkClass}
        >
          Back to list
        </Link>
      </div>

      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      <form action={action} className="space-y-5 rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
        {mode === "edit" && questionId != null ? (
          <input type="hidden" name="questionId" value={questionId} />
        ) : null}
        <input type="hidden" name="type" value={questionType} />

        <div>
          <label className="mb-1.5 block text-sm font-medium text-zinc-700">Type</label>
          <div className="flex items-center gap-2">
            {(["text", "coding"] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setQuestionType(t)}
                className={`cursor-pointer rounded-lg px-4 py-2 text-xs font-bold capitalize transition-all ${
                  questionType === t
                    ? "bg-zinc-900 text-white"
                    : "border border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50"
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label htmlFor="text" className="mb-1.5 block text-sm font-medium text-zinc-700">
            {questionType === "coding" ? "Title" : "Question text"}
          </label>
          <textarea
            id="text"
            name="text"
            required
            rows={questionType === "coding" ? 2 : 4}
            defaultValue={values.text}
            className={fieldClass}
            placeholder={questionType === "coding" ? "Two Sum" : "Tell me about a time you..."}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="slug" className="mb-1.5 block text-sm font-medium text-zinc-700">
              Slug
            </label>
            <Input
              id="slug"
              name="slug"
              defaultValue={values.slug}
              placeholder="auto-generated-from-text-if-empty"
            />
            <p className="mt-1 text-xs text-zinc-600">Leave empty to auto-generate from question text.</p>
          </div>
          <div>
            <label htmlFor="estimatedTime" className="mb-1.5 block text-sm font-medium text-zinc-700">
              Estimated time
            </label>
            <Input id="estimatedTime" name="estimatedTime" defaultValue={values.estimatedTime} placeholder="5 min" />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="category" className="mb-1.5 block text-sm font-medium text-zinc-700">
              Category
            </label>
            <select id="category" name="category" defaultValue={questionType === "coding" ? "coding" : values.category} className={fieldClass}>
              {INTERVIEW_TYPE_VALUES.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="difficulty" className="mb-1.5 block text-sm font-medium text-zinc-700">
              Difficulty
            </label>
            <select id="difficulty" name="difficulty" defaultValue={values.difficulty} className={fieldClass}>
              {INTERVIEW_DIFFICULTY_VALUES.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label htmlFor="tags" className="mb-1.5 block text-sm font-medium text-zinc-700">
            Tags
          </label>
          <Input
            id="tags"
            name="tags"
            defaultValue={values.tags}
            placeholder="Teamwork, Communication, Leadership"
          />
          <p className="mt-1 text-xs text-zinc-600">Comma-separated.</p>
        </div>

        <div>
          <label htmlFor="hint" className="mb-1.5 block text-sm font-medium text-zinc-700">
            Hint (optional)
          </label>
          <textarea id="hint" name="hint" rows={3} defaultValue={values.hint} className={fieldClass} />
        </div>

        {questionType === "text" && (
          <div>
            <label htmlFor="sampleAnswer" className="mb-1.5 block text-sm font-medium text-zinc-700">
              Sample answer (optional)
            </label>
            <textarea
              id="sampleAnswer"
              name="sampleAnswer"
              rows={5}
              defaultValue={values.sampleAnswer}
              className={fieldClass}
            />
          </div>
        )}

        {questionType === "coding" && (
          <>
            <div>
              <label htmlFor="description" className="mb-1.5 block text-sm font-medium text-zinc-700">
                Problem Description
              </label>
              <textarea
                id="description"
                name="description"
                rows={6}
                defaultValue={values.description ?? ""}
                className={fieldClass}
                placeholder="Given an array of integers nums and an integer target..."
              />
            </div>
            <div>
              <label htmlFor="constraints" className="mb-1.5 block text-sm font-medium text-zinc-700">
                Constraints
              </label>
              <textarea
                id="constraints"
                name="constraints"
                rows={3}
                defaultValue={values.constraints ?? ""}
                className={fieldClass}
                placeholder="1 <= nums.length <= 10^4"
              />
            </div>
            <AdminCodingFields
              initialStarterCode={values.starterCode}
              initialTestCases={values.testCases}
              initialSolutionCode={values.solutionCode}
            />
          </>
        )}

        <div className="flex flex-wrap gap-3 pt-2">
          <Button type="submit">{mode === "create" ? "Create question" : "Save changes"}</Button>
          <Link href="/admin/questions">
            <Button type="button" variant="secondary">
              Cancel
            </Button>
          </Link>
        </div>
      </form>
    </div>
  );
}
