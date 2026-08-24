import { notFound } from "next/navigation";
import BatchPlanClient from "./promotion-batch-plan-client";

export default function Page() {
  if (process.env.NODE_ENV !== "development") notFound();
  return <BatchPlanClient />;
}
