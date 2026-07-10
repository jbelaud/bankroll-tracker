import { createNavigation } from "next-intl/navigation";
import { routing } from "./routing";

// Link/redirect/usePathname/useRouter locale-aware — à utiliser partout à la
// place des équivalents next/link et next/navigation dans les écrans sous
// [locale] (préfixe /fr ou /en géré automatiquement).
export const { Link, redirect, usePathname, useRouter, getPathname } =
  createNavigation(routing);
