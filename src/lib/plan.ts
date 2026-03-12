import { FREE_PLAN_LIMITS, type AppPlanValue } from "@/lib/constants";

export function getCurrentPlan(): AppPlanValue {
  return process.env.APP_PLAN === "PRO" ? "PRO" : "FREE";
}

export function getPlanLimits(plan = getCurrentPlan()) {
  if (plan === "PRO") {
    return {
      visibleChannels: Number.POSITIVE_INFINITY,
      csvExportRows: Number.POSITIVE_INFINITY,
      aiDrafts: Number.POSITIVE_INFINITY,
    };
  }

  return FREE_PLAN_LIMITS;
}

export function isDraftGenerationLocked(existingDraftCount: number, plan = getCurrentPlan()) {
  const limit = getPlanLimits(plan).aiDrafts;
  return Number.isFinite(limit) ? existingDraftCount >= limit : false;
}
