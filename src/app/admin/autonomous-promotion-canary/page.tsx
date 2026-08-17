import { notFound } from "next/navigation";
import AutonomousPromotionCanaryClient from "./autonomous-promotion-canary-client";

export default function Page() {
  if (process.env.NODE_ENV !== "development") notFound();
  return <><p style={{ maxWidth: 960, margin: "20px auto 0", padding: "0 24px" }}><strong>Development-only historical experiment. Frozen; not a production service or current Source Coverage objective.</strong></p><AutonomousPromotionCanaryClient /></>;
}
