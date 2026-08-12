"use client";

import Link from "next/link";

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
import {
  INTERVIEW_DIFFICULTY_VALUES,
  QUESTION_CATEGORY_VALUES,
} from "@/lib/interview/domain";

export type AdminQuestionFormValues = {
  slug: string;
  text: string;
  category: string;
  difficulty: string;
  estimatedTime: string;
  tags: string;
  hint: string;
  sampleAnswer: string;
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

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className={adminHeadingClass}>{title}</h2>
          <p className={`mt-1 ${adminMutedClass}`}>
            {mode === "create"
              ? "Create a new practice question in the question bank."
              : "Update question content and metadata."}
          </p>
        </div>
        <Link href="/admin/questions" className={adminSecondaryLinkClass}>
          Back to list
        </Link>
      </div>

      {error ? (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {error}
        </div>
      ) : null}

      <form action={action} className={`space-y-5 ${adminPanelClass} p-6`}>
        {mode === "edit" && questionId != null ? (
          <input type="hidden" name="questionId" value={questionId} />
        ) : null}
        <div>
          <label htmlFor="text" className={`mb-1.5 block ${adminLabelClass}`}>
            Question text
          </label>
          <textarea
            id="text"
            name="text"
            required
            rows={4}
            defaultValue={values.text}
            className={adminFieldClass}
            placeholder="Tell me about a time you..."
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="slug" className={`mb-1.5 block ${adminLabelClass}`}>
              Slug
            </label>
            <Input
              id="slug"
              name="slug"
              defaultValue={values.slug}
              placeholder="auto-generated-from-text-if-empty"
              className={adminInputOverrideClass}
            />
            <p className="mt-1 text-xs text-[#A8B0C2]">
              Leave empty to auto-generate from question text.
            </p>
          </div>
          <div>
            <label htmlFor="estimatedTime" className={`mb-1.5 block ${adminLabelClass}`}>
              Estimated time
            </label>
            <Input
              id="estimatedTime"
              name="estimatedTime"
              defaultValue={values.estimatedTime}
              placeholder="5 min"
              className={adminInputOverrideClass}
            />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="category" className={`mb-1.5 block ${adminLabelClass}`}>
              Category
            </label>
            <select
              id="category"
              name="category"
              defaultValue={values.category}
              className={adminFieldClass}
            >
              {QUESTION_CATEGORY_VALUES.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="difficulty" className={`mb-1.5 block ${adminLabelClass}`}>
              Difficulty
            </label>
            <select
              id="difficulty"
              name="difficulty"
              defaultValue={values.difficulty}
              className={adminFieldClass}
            >
              {INTERVIEW_DIFFICULTY_VALUES.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label htmlFor="tags" className={`mb-1.5 block ${adminLabelClass}`}>
            Tags
          </label>
          <Input
            id="tags"
            name="tags"
            defaultValue={values.tags}
            placeholder="Teamwork, Communication, Leadership"
            className={adminInputOverrideClass}
          />
          <p className="mt-1 text-xs text-[#A8B0C2]">Comma-separated.</p>
        </div>

        <div>
          <label htmlFor="hint" className={`mb-1.5 block ${adminLabelClass}`}>
            Hint (optional)
          </label>
          <textarea
            id="hint"
            name="hint"
            rows={3}
            defaultValue={values.hint}
            className={adminFieldClass}
          />
        </div>

        <div>
          <label htmlFor="sampleAnswer" className={`mb-1.5 block ${adminLabelClass}`}>
            Sample answer (optional)
          </label>
          <textarea
            id="sampleAnswer"
            name="sampleAnswer"
            rows={5}
            defaultValue={values.sampleAnswer}
            className={adminFieldClass}
          />
        </div>

        <div className="flex flex-wrap gap-3 pt-2">
          <Button type="submit" className={adminPrimaryButtonClass}>
            {mode === "create" ? "Create question" : "Save changes"}
          </Button>
          <Link href="/admin/questions">
            <Button type="button" variant="secondary" className={adminSecondaryButtonClass}>
              Cancel
            </Button>
          </Link>
        </div>
      </form>
    </div>
  );
}
