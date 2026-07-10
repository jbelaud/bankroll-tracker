import Stripe from "stripe";

// Clé secrète serveur uniquement — jamais exposée côté client (même
// principe que src/lib/prisma.ts pour la connexion base de données).
// null tant que STRIPE_SECRET_KEY n'est pas configurée (avant création du
// compte Stripe) — le SDK lève une erreur de construction sur une clé vide,
// donc on ne construit qu'avec une vraie valeur. Chaque site d'appel doit
// vérifier `if (!stripe)` avant usage (TypeScript l'impose via le type
// `Stripe | null`), même garde-fou que ANTHROPIC_API_KEY dans /api/scan.
export const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY)
  : null;
