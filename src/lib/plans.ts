export type PlanId = "hares" | "raee" | "amir";

export const PLAN_INFO: Record<
  PlanId,
  { name: string; monthlyPrice: number; coverageAmount: number }
> = {
  hares: { name: "حارس", monthlyPrice: 490, coverageAmount: 500_000 },
  raee: { name: "راعي", monthlyPrice: 790, coverageAmount: 1_500_000 },
  amir: { name: "أمير", monthlyPrice: 1800, coverageAmount: 5_000_000 },
};

export const PLAN_IDS: PlanId[] = ["hares", "raee", "amir"];
