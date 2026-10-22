export type Feature = "shiftLog" | "export" | "multipleWorkplaces";

/** Milestone 6 ships these features for every account. */
export function canUseFeature(feature: Feature): true {
  void feature;
  return true;
}
