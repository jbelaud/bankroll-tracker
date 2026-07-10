// ============================================================
// STUB de génération d'export. TODO: brancher sur la vraie
// génération d'export (sérialisation réelle des bankrolls/paris
// de l'utilisateur via listBankrolls()/listAllBets(), déjà
// disponibles côté serveur — reste à décider du format définitif
// avant de la brancher). Le téléchargement lui-même (Blob, lien
// <a download>) est réel — seule la donnée est simulée ici.
// ============================================================

export async function exportUserData(): Promise<object> {
  await new Promise((r) => setTimeout(r, 800));

  return {
    exportedAt: new Date().toISOString(),
    format: "bettrack-export-v1",
    bankrolls: [
      { name: "Winamax principale", bookmaker: "Winamax", initial: 200 },
      { name: "Betclic", bookmaker: "Betclic", initial: 100 },
    ],
    bets: [
      {
        date: "2026-06-05",
        sport: "Football",
        betType: "Résultat du match",
        stake: 10,
        odds: 1.85,
        result: "GAGNE",
      },
    ],
  };
}
