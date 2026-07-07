// Set curado de iconos lucide elegibles para las cuentas. El nombre (kebab)
// se guarda en Account.icon; null = automático según el tipo de cuenta.
import {
  Banknote,
  BookOpen,
  Briefcase,
  Car,
  CircleDollarSign,
  Coins,
  CreditCard,
  Gem,
  Gift,
  HandCoins,
  Heart,
  House,
  Landmark,
  PiggyBank,
  Plane,
  Shield,
  ShoppingBag,
  Smartphone,
  Star,
  Stethoscope,
  Store,
  Utensils,
  Wallet,
  Wrench,
  type LucideIcon,
} from "lucide-react";

export interface AccountIconDef {
  name: string;
  icon: LucideIcon;
}

export const ACCOUNT_ICONS: AccountIconDef[] = [
  { name: "wallet", icon: Wallet },
  { name: "banknote", icon: Banknote },
  { name: "landmark", icon: Landmark },
  { name: "credit-card", icon: CreditCard },
  { name: "piggy-bank", icon: PiggyBank },
  { name: "coins", icon: Coins },
  { name: "hand-coins", icon: HandCoins },
  { name: "circle-dollar-sign", icon: CircleDollarSign },
  { name: "smartphone", icon: Smartphone },
  { name: "store", icon: Store },
  { name: "shopping-bag", icon: ShoppingBag },
  { name: "briefcase", icon: Briefcase },
  { name: "house", icon: House },
  { name: "car", icon: Car },
  { name: "plane", icon: Plane },
  { name: "gift", icon: Gift },
  { name: "heart", icon: Heart },
  { name: "star", icon: Star },
  { name: "shield", icon: Shield },
  { name: "gem", icon: Gem },
  { name: "book-open", icon: BookOpen },
  { name: "utensils", icon: Utensils },
  { name: "stethoscope", icon: Stethoscope },
  { name: "wrench", icon: Wrench },
];

const BY_NAME = new Map(ACCOUNT_ICONS.map((def) => [def.name, def.icon]));

export const ACCOUNT_ICON_NAMES = ACCOUNT_ICONS.map((def) => def.name);

const TYPE_FALLBACK: Record<string, LucideIcon> = {
  CASH: Banknote,
  BANK: Landmark,
  DIGITAL: CreditCard,
};

export function getAccountIcon(
  icon: string | null | undefined,
  type: string
): LucideIcon {
  return (icon ? BY_NAME.get(icon) : undefined) ?? TYPE_FALLBACK[type] ?? Wallet;
}
