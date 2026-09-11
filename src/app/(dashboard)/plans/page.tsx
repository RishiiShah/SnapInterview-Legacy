import { redirect } from "next/navigation";

import PlansListClient from "@/components/plans/PlansListClient";
import { getSessionUserIdentity } from "@/lib/server-auth";
import { getInterviewPlanTemplates, listUserInterviewPlans } from "@/services/plan-service";

export default async function InterviewPlansPage() {
  const identity = await getSessionUserIdentity();
  if (!identity) redirect("/login");
  const [plans, templates] = await Promise.all([
    listUserInterviewPlans(identity.userId),
    Promise.resolve(getInterviewPlanTemplates()),
  ]);
  return (
    <PlansListClient
      initialPlans={plans}
      templates={templates.map((template) => ({
        key: template.key,
        title: template.title,
        description: template.description,
        nodeCount: template.nodes.length,
      }))}
    />
  );
}
