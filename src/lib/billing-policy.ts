export function subscriptionGrantsAccess(status: string | null | undefined): boolean {
  return status === "active" || status === "trialing";
}
