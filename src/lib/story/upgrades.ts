// Permanent Upgrades — passive benefits for the rest of the Story.

export interface UpgradeDef {
  id: string;
  name: string;
  icon: string;
  price: number;
  description: string;
  chapter?: number;
  requires?: string;
}

export const UPGRADES: UpgradeDef[] = [
  { id: "bigger-rack", name: "Bigger Rack", icon: "Rows3", price: 10, description: "+1 rack capacity." },
  { id: "extra-chance", name: "Extra Chance", icon: "RotateCcw", price: 8, description: "+1 discard per Page." },
  { id: "deep-pockets", name: "Deep Pockets", icon: "Pocket", price: 12, description: "+1 available word placement per Page." },
  { id: "bargain-hunter", name: "Bargain Hunter", icon: "BadgePercent", price: 10, description: "Bookstore prices are 20% lower." },
  { id: "extra-shelf", name: "Extra Shelf", icon: "LibraryBig", price: 12, description: "+1 Pen slot." },
  { id: "flexible-fingers", name: "Flexible Fingers", icon: "Hand", price: 8, description: "Discard up to 4 tiles instead of 3." },
  { id: "golden-payday", name: "Coin Upgrades", icon: "Coins", price: 10, description: "+3 Coins after each successful future Page." },
  { id: "endless-pen-slot", name: "Extra Pen Slot", icon: "LibraryBig", price: 85, chapter: 4, description: "+1 Pen slot." },
  { id: "collectors-edition", name: "Collector's Edition", icon: "LibraryBig", price: 220, chapter: 7, requires: "endless-pen-slot", description: "+1 Pen slot. Requires Extra Pen Slot." },
  { id: "endless-extra-shelf", name: "Extra Shelf", icon: "LibraryBig", price: 40, chapter: 4, description: "+1 Bookstore offer." },
  { id: "expanded-bookstore", name: "Expanded Bookstore", icon: "LibraryBig", price: 95, chapter: 6, requires: "endless-extra-shelf", description: "+1 additional Bookstore offer. Requires Extra Shelf." },
  { id: "loyalty-card", name: "Loyalty Card", icon: "Coins", price: 45, chapter: 4, description: "+7 Coins per cleared Endless Page." },
  { id: "bookstore-discount", name: "Bookstore Discount", icon: "BadgePercent", price: 85, chapter: 4, description: "Subsequent purchases are 20% cheaper." },
];

export function upgradeAvailable(id: string, upgrades: string[], endless: boolean, chapter: number): boolean {
  const def = upgradeDef(id);
  return !upgrades.includes(id) && (!def.chapter || (endless && chapter >= def.chapter)) && (!def.requires || upgrades.includes(def.requires));
}
export const shopOfferCount = (upgrades: string[]) => 7 + (upgrades.includes("endless-extra-shelf") ? 1 : 0) + (upgrades.includes("expanded-bookstore") ? 1 : 0);

export function upgradeDef(id: string): UpgradeDef {
  const def = UPGRADES.find((upgrade) => upgrade.id === id);
  if (!def) throw new Error(`Unknown upgrade: ${id}`);
  return def;
}

export const hasUpgrade = (upgrades: string[], id: string) => upgrades.includes(id);

export const rackCapacity = (upgrades: string[]) => 7 + (hasUpgrade(upgrades, "bigger-rack") ? 1 : 0);
export const discardsPerPage = (upgrades: string[]) => 3 + (hasUpgrade(upgrades, "extra-chance") ? 1 : 0);
export const discardLimit = (upgrades: string[]) => (hasUpgrade(upgrades, "flexible-fingers") ? 4 : 3);
export const penSlots = (upgrades: string[]) => 5 + ["extra-shelf", "endless-pen-slot", "collectors-edition"].filter(id => hasUpgrade(upgrades, id)).length;
export const priceFor = (upgrades: string[], price: number) =>
  Math.floor(price * (hasUpgrade(upgrades, "bargain-hunter") ? 0.8 : 1) * (hasUpgrade(upgrades, "bookstore-discount") ? 0.8 : 1));

export const GOLDEN_PAYDAY_BONUS = 3;
