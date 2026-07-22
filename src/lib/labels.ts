export type AssetType = "horse" | "camel" | "falcon";
export type ClaimStatus = "submitted" | "reviewing" | "approved" | "rejected" | "paid";
export type PolicyStatus = "active" | "pending" | "expired" | "cancelled";

export const ASSET_TYPE_LABEL: Record<AssetType, string> = {
  horse: "خيل",
  camel: "إبل",
  falcon: "صقر",
};

export const CLAIM_STATUS_LABEL: Record<ClaimStatus, string> = {
  submitted: "مُقدَّمة",
  reviewing: "قيد المراجعة",
  approved: "موافَق عليها",
  rejected: "مرفوضة",
  paid: "مصروفة",
};

export const POLICY_STATUS_LABEL: Record<PolicyStatus, string> = {
  active: "سارية",
  pending: "بانتظار الدفع",
  expired: "منتهية",
  cancelled: "ملغاة",
};
