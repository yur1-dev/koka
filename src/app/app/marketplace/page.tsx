import { redirect } from "next/navigation";

// The marketplace lives inside the dashboard.
export default function MarketplacePage() {
  redirect("/app/dashboard");
}
