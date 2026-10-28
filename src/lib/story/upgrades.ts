// Permanent Upgrades — passive benefits for the rest of the Story.

export interface UpgradeDef {
  id: string;
  name: string;
  icon: string;
  price: number;
  description: string;
}

export const UPGRADES: UpgradeDef[] = [
  { id: "bigger-rack", name: "Bigger Rack", icon: "Rows3", price: 10, description: "+1 rack capacity." },
  { id: "extra-chance", name: "Extra Chance", icon: "RotateCcw", price: 8, description: "+1 discard per Page." },
  { id: "deep-pockets", name: "Deep Pockets", icon: "Pocket", price: 12, description: "+1 available word placement per Page." },
  { id: "bargain-hunter", name: "Bargain Hunter", icon: "BadgePercent", price: 10, description: "Bookstore prices are 20% lower." },
  { id: "extra-shelf", name: "Extra Shelf", icon: "LibraryBig", price: 12, description: "+1 Pen slot." },
  { id: "flexible-fingers", name: "Flexible Fingers", icon: "Hand", price: 8, description: "Discard up to 4 tiles instead of 3." },
  { id: "golden-payday", name: "Coin Upgrades", icon: "Coins", price: 10, description: "+3 Coins after each successful future Page." },
];

export function upgradeDef(id: string): UpgradeDef {
  const def = UPGRADES.find((upgrade) => upgrade.id === id);
  if (!def) throw new Error(`Unknown upgrade: ${id}`);
  return def;
}

export const hasUpgrade = (upgrades: string[], id: string) => upgrades.includes(id);

export const rackCapacity = (upgrades: string[]) => 7 + (hasUpgrade(upgrades, "bigger-rack") ? 1 : 0);
export const discardsPerPage = (upgrades: string[]) => 3 + (hasUpgrade(upgrades, "extra-chance") ? 1 : 0);
export const discardLimit = (upgrades: string[]) => (hasUpgrade(upgrades, "flexible-fingers") ? 4 : 3);
export const penSlots = (upgrades: string[]) => 5 + (hasUpgrade(upgrades, "extra-shelf") ? 1 : 0);
export const priceFor = (upgrades: string[], price: number) =>
  hasUpgrade(upgrades, "bargain-hunter") ? Math.floor(price * 0.8) : price;

export const GOLDEN_PAYDAY_BONUS = 3;
