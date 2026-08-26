type ScanMeasurementRow = {
  bookmaker: string;
  screenshots: number;
  betsDetected: number;
  importedWithoutCorrection: number;
  importedCorrected: number;
  empty: number;
  failures: number;
};

export function ScanMeasurementTable({ rows }: { rows: ScanMeasurementRow[] }) {
  return (
    <section className="glass-card overflow-hidden rounded-xl">
      <div className="border-b border-border p-3">
        <h2 className="text-sm font-semibold">Qualité Kalivoa Scan</h2>
        <p className="mt-1 text-xs text-muted-foreground">Données mesurées depuis l’instrumentation P0 ; aucune donnée historique n’est reconstituée.</p>
      </div>
      {rows.length === 0 ? (
        <p className="p-4 text-sm text-muted-foreground">Aucun Scan instrumenté sur cette période.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[46rem] text-left text-xs">
            <thead className="border-b border-border bg-muted/40 text-muted-foreground">
              <tr>
                <th className="p-3 font-medium">Bookmaker</th>
                <th className="p-3 text-right font-medium">Captures</th>
                <th className="p-3 text-right font-medium">Paris détectés</th>
                <th className="p-3 text-right font-medium">Importés sans correction</th>
                <th className="p-3 text-right font-medium">Importés corrigés</th>
                <th className="p-3 text-right font-medium">Vides</th>
                <th className="p-3 text-right font-medium">Échecs</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.map((row) => (
                <tr key={row.bookmaker}>
                  <th className="p-3 font-medium">{row.bookmaker}</th>
                  <td className="p-3 text-right num">{row.screenshots}</td>
                  <td className="p-3 text-right num">{row.betsDetected}</td>
                  <td className="p-3 text-right num text-profit">{row.importedWithoutCorrection}</td>
                  <td className="p-3 text-right num text-warning">{row.importedCorrected}</td>
                  <td className="p-3 text-right num">{row.empty}</td>
                  <td className="p-3 text-right num text-loss">{row.failures}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
