import { useState, useEffect, useMemo } from "react";
import {
  LineChart, Line, AreaChart, Area, BarChart, Bar, PieChart, Pie, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer, Legend, Cell,
} from "recharts";
import {
  Wallet, TrendingUp, TrendingDown, Plus, History as HistoryIcon,
  BarChart3, LayoutDashboard, Zap, Trash2, X, ChevronDown, Upload,
  CheckCircle2, AlertCircle, Gift, Radio, Pencil, Filter, ImagePlus, Loader2, FileJson,
  Target, Sparkles, RefreshCw, Download,
} from "lucide-react";

// ---------- Constants ----------

const SPORTS = {
  "Football": ["Résultat du match", "Victoire finale du tournoi", "Vainqueur de groupe", "Double chance", "Buteur", "Double buteur", "Passeur décisif", "Double passeur décisif", "Buteur ou passeur", "Top buteur du tournoi", "But sur penalty", "Minute du but", "Type de but", "Les 2 équipes marquent", "Nombre de tirs cadrés", "Écart de buts", "Mi-temps/Fin de match", "Première équipe à marquer", "Over/Under buts", "Qualification", "Handicap", "Score exact", "Mymatch", "Combiné", "Autre"],
  "Cyclisme": ["Top 1", "Top 3", "Top 10", "Vainqueur d'étape", "Classement général", "Autre"],
  "Tennis": ["Vainqueur du match", "Total de jeux", "Score exact (sets)", "Vainqueur du set", "Autre"],
  "Basketball": ["Vainqueur", "Total points", "Handicap", "Autre"],
  "Rugby": ["Vainqueur", "Total points", "Handicap", "Autre"],
  "Autre sport": ["Autre"],
};

const SPORT_LIST = Object.keys(SPORTS);
const RESULTS = ["En attente", "Gagné", "Perdu", "Remboursé", "Cashé"];

const RESULT_COLOR = {
  "Gagné": "text-emerald-400",
  "Perdu": "text-rose-400",
  "Remboursé": "text-zinc-400",
  "En attente": "text-amber-400",
  "Cashé": "text-sky-400",
};

const CHART_COLORS = ["#34d399", "#fbbf24", "#818cf8", "#f472b6", "#38bdf8", "#fb923c", "#a3e635", "#e879f9"];

function uid() {
  return (crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2)) ;
}

function fmt(n) {
  const v = Number(n) || 0;
  return v.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " €";
}

function computeProfit(bet) {
  const stake = Number(bet.stake) || 0;
  const odds = Number(bet.odds) || 0;
  if (bet.result === "Cashé") return (Number(bet.cashOutAmount) || 0) - realStake(bet); // cash out: encaissé - mise réellement engagée
  if (bet.result === "Gagné") return stake * (odds - 1); // same formula for freebets: stake itself isn't returned either way
  if (bet.result === "Perdu") return bet.freebet ? 0 : -stake; // a lost freebet costs nothing real
  return 0; // Remboursé / En attente
}

// Capital actually at risk from the bankroll (freebets aren't your money until won)
function realStake(bet) {
  return bet.freebet ? 0 : Number(bet.stake) || 0;
}

function computeBoostGain(bet) {
  if (!bet.boosted || bet.result !== "Gagné" || !bet.originalOdds) return 0;
  const stake = Number(bet.stake) || 0;
  const diff = (Number(bet.odds) || 0) - (Number(bet.originalOdds) || 0);
  return diff > 0 ? stake * diff : 0;
}

// ---------- Storage ----------

const STORAGE_KEY = "bankroll-tracker-data";
const DEFAULT_DATA = { bankrolls: [], bets: [], goals: { monthlyProfitGoal: 0, monthlyLossLimit: 0 }, insights: null };

async function loadData() {
  try {
    const res = await window.storage.get(STORAGE_KEY, false);
    if (res && res.value) {
      const parsed = JSON.parse(res.value);
      return { ...DEFAULT_DATA, ...parsed };
    }
  } catch (e) {
    // key not found or error, start fresh
  }
  return { ...DEFAULT_DATA };
}

async function saveData(data) {
  try {
    await window.storage.set(STORAGE_KEY, JSON.stringify(data), false);
  } catch (e) {
    console.error("Erreur de sauvegarde", e);
  }
}

// ---------- Small UI atoms ----------

function Card({ children, className = "" }) {
  return <div className={`bg-zinc-900 border border-zinc-800 rounded-xl ${className}`}>{children}</div>;
}

function Label({ children }) {
  return <label className="block text-xs uppercase tracking-wide text-zinc-500 mb-1.5 font-medium">{children}</label>;
}

function Input(props) {
  return <input {...props} className={`w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 ${props.className || ""}`} />;
}

function Select(props) {
  return (
    <div className="relative">
      <select {...props} className={`w-full appearance-none bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 ${props.className || ""}`}>
        {props.children}
      </select>
      <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none" />
    </div>
  );
}

function StatBlock({ label, value, valueClass = "text-zinc-100", sub }) {
  return (
    <Card className="p-4">
      <div className="text-xs uppercase tracking-wide text-zinc-500 font-medium">{label}</div>
      <div className={`mt-2 text-2xl font-mono font-semibold ${valueClass}`}>{value}</div>
      {sub && <div className="mt-1 text-xs text-zinc-500">{sub}</div>}
    </Card>
  );
}

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload || !payload.length) return null;
  return (
    <div className="bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs shadow-xl">
      <div className="text-zinc-400 mb-1">{label}</div>
      {payload.map((p, i) => (
        <div key={i} style={{ color: p.color }} className="font-mono">
          {p.name}: {typeof p.value === "number" ? fmt(p.value) : p.value}
        </div>
      ))}
    </div>
  );
}

// ---------- Bankroll creation modal ----------

function BankrollModal({ onClose, onSave, editingBankroll }) {
  const isEdit = !!editingBankroll;
  const [name, setName] = useState(editingBankroll?.name || "");
  const [bookmaker, setBookmaker] = useState(editingBankroll?.bookmaker || "");
  const [initial, setInitial] = useState(editingBankroll ? String(editingBankroll.initial) : "");

  const submit = () => {
    if (!bookmaker.trim() || initial === "") return;
    if (isEdit) {
      onSave({
        ...editingBankroll,
        name: name.trim() || bookmaker.trim(),
        bookmaker: bookmaker.trim(),
        initial: Number(initial),
      });
    } else {
      onSave({
        id: uid(),
        name: name.trim() || bookmaker.trim(),
        bookmaker: bookmaker.trim(),
        initial: Number(initial),
        createdAt: new Date().toISOString(),
      });
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-sm p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-zinc-100">{isEdit ? "Modifier la bankroll" : "Nouvelle bankroll"}</h3>
          <button onClick={onClose} className="text-zinc-500 hover:text-zinc-300"><X size={18} /></button>
        </div>
        <div className="space-y-3">
          <div>
            <Label>Bookmaker</Label>
            <Input placeholder="Winamax, Betclic, Unibet..." value={bookmaker} onChange={(e) => setBookmaker(e.target.value)} />
          </div>
          <div>
            <Label>Nom de la bankroll (optionnel)</Label>
            <Input placeholder="Ex : Bankroll principale" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div>
            <Label>Capital de départ</Label>
            <Input type="number" step="0.01" placeholder="100.00" value={initial} onChange={(e) => setInitial(e.target.value)} />
            {isEdit && <p className="mt-1 text-xs text-zinc-500">Modifier le capital de départ recalcule automatiquement le solde actuel de cette bankroll.</p>}
          </div>
        </div>
        <button onClick={submit} className="mt-5 w-full bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-semibold text-sm py-2.5 rounded-lg transition-colors">
          {isEdit ? "Enregistrer les modifications" : "Créer la bankroll"}
        </button>
      </Card>
    </div>
  );
}

// ---------- Dashboard ----------

function GoalsCard({ goals, currentMonthProfit, onUpdateGoals }) {
  const [editing, setEditing] = useState(false);
  const [profitGoal, setProfitGoal] = useState(String(goals.monthlyProfitGoal || ""));
  const [lossLimit, setLossLimit] = useState(String(goals.monthlyLossLimit || ""));

  const hasGoal = goals.monthlyProfitGoal > 0;
  const hasLimit = goals.monthlyLossLimit > 0;
  const profitPct = hasGoal ? Math.max(0, Math.min(100, (currentMonthProfit / goals.monthlyProfitGoal) * 100)) : 0;
  const lossPct = hasLimit ? Math.max(0, Math.min(100, (Math.abs(Math.min(0, currentMonthProfit)) / goals.monthlyLossLimit) * 100)) : 0;
  const lossBreached = hasLimit && currentMonthProfit < 0 && Math.abs(currentMonthProfit) >= goals.monthlyLossLimit;

  const save = () => {
    onUpdateGoals({ monthlyProfitGoal: Number(profitGoal) || 0, monthlyLossLimit: Number(lossLimit) || 0 });
    setEditing(false);
  };

  if (editing) {
    return (
      <Card className="p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-zinc-300 flex items-center gap-1.5"><Target size={14} className="text-emerald-400" /> Objectifs du mois</h3>
          <button onClick={() => setEditing(false)} className="text-zinc-500 hover:text-zinc-300"><X size={16} /></button>
        </div>
        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <Label>Objectif de bénéfice mensuel (€)</Label>
            <Input type="number" step="1" placeholder="Ex : 100" value={profitGoal} onChange={(e) => setProfitGoal(e.target.value)} />
          </div>
          <div>
            <Label>Limite de perte mensuelle (€)</Label>
            <Input type="number" step="1" placeholder="Ex : 150" value={lossLimit} onChange={(e) => setLossLimit(e.target.value)} />
          </div>
        </div>
        <p className="mt-2 text-xs text-zinc-500">Laisse à 0 pour désactiver un objectif. Ces seuils se réinitialisent chaque mois automatiquement (basés sur le bénéfice du mois en cours).</p>
        <button onClick={save} className="mt-3 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-semibold text-sm px-4 py-2 rounded-lg transition-colors">
          Enregistrer
        </button>
      </Card>
    );
  }

  if (!hasGoal && !hasLimit) {
    return (
      <Card className="p-4 flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm text-zinc-400">
          <Target size={15} className="text-zinc-600" />
          Aucun objectif défini pour ce mois.
        </div>
        <button onClick={() => setEditing(true)} className="text-xs font-medium text-emerald-400 hover:text-emerald-300">
          Définir un objectif
        </button>
      </Card>
    );
  }

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-zinc-300 flex items-center gap-1.5"><Target size={14} className="text-emerald-400" /> Objectifs du mois</h3>
        <button onClick={() => setEditing(true)} className="text-zinc-500 hover:text-zinc-300"><Pencil size={14} /></button>
      </div>
      <div className="space-y-3">
        {hasGoal && (
          <div>
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="text-zinc-400">Bénéfice du mois : <span className="font-mono text-zinc-200">{fmt(currentMonthProfit)}</span></span>
              <span className="text-zinc-500">objectif {fmt(goals.monthlyProfitGoal)}</span>
            </div>
            <div className="h-2 rounded-full bg-zinc-800 overflow-hidden">
              <div className="h-full bg-emerald-500 transition-all" style={{ width: `${profitPct}%` }} />
            </div>
          </div>
        )}
        {hasLimit && (
          <div>
            <div className="flex items-center justify-between text-xs mb-1">
              <span className={lossBreached ? "text-rose-400 font-medium" : "text-zinc-400"}>
                {lossBreached ? "Limite de perte atteinte" : "Pertes du mois"} : <span className="font-mono">{fmt(Math.min(0, currentMonthProfit))}</span>
              </span>
              <span className="text-zinc-500">limite -{fmt(goals.monthlyLossLimit)}</span>
            </div>
            <div className="h-2 rounded-full bg-zinc-800 overflow-hidden">
              <div className={`h-full transition-all ${lossBreached ? "bg-rose-500" : "bg-amber-500"}`} style={{ width: `${lossPct}%` }} />
            </div>
            {lossBreached && (
              <p className="mt-1.5 text-xs text-rose-400">Tu as atteint ta limite de perte définie pour ce mois — une pause peut être une bonne idée.</p>
            )}
          </div>
        )}
      </div>
    </Card>
  );
}

function Dashboard({ bankrolls, bets, goals, onUpdateGoals, onNewBankroll }) {
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const settled = useMemo(() => bets.filter((b) => b.result !== "En attente").sort((a, b) => new Date(a.date) - new Date(b.date)), [bets]);

  const currentMonthProfit = useMemo(() => {
    const now = new Date();
    const prefix = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    return settled.filter((b) => (b.date || "").startsWith(prefix)).reduce((s, b) => s + computeProfit(b), 0);
  }, [settled]);

  const isFiltered = !!(dateFrom || dateTo);
  const inRange = (b) => (!dateFrom || b.date >= dateFrom) && (!dateTo || b.date <= dateTo);
  const periodSettled = useMemo(() => settled.filter(inRange), [settled, dateFrom, dateTo]);

  const applyPreset = (preset) => {
    const today = new Date();
    const toISO = (d) => d.toISOString().slice(0, 10);
    if (preset === "all") { setDateFrom(""); setDateTo(""); return; }
    if (preset === "7d") { const d = new Date(today); d.setDate(d.getDate() - 7); setDateFrom(toISO(d)); setDateTo(toISO(today)); return; }
    if (preset === "month") { const d = new Date(today.getFullYear(), today.getMonth(), 1); setDateFrom(toISO(d)); setDateTo(toISO(today)); return; }
    if (preset === "year") { const d = new Date(today.getFullYear(), 0, 1); setDateFrom(toISO(d)); setDateTo(toISO(today)); return; }
  };

  const curve = useMemo(() => {
    const totalInitial = bankrolls.reduce((s, br) => s + br.initial, 0);
    // Balance at the start of the selected range = initial capital + profit of everything settled before the range
    const before = dateFrom ? settled.filter((b) => b.date < dateFrom) : [];
    let running = totalInitial + before.reduce((s, b) => s + computeProfit(b), 0);
    const points = [{ date: "Départ", solde: running }];
    periodSettled.forEach((b) => {
      running += computeProfit(b);
      points.push({ date: new Date(b.date).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" }), solde: running });
    });
    return points;
  }, [settled, periodSettled, bankrolls, dateFrom]);

  const totalInitial = bankrolls.reduce((s, br) => s + br.initial, 0);
  const totalProfitAllTime = settled.reduce((s, b) => s + computeProfit(b), 0);
  const totalBalance = totalInitial + totalProfitAllTime; // always the real current balance, regardless of filter

  const periodProfit = periodSettled.reduce((s, b) => s + computeProfit(b), 0);
  const periodStaked = periodSettled.reduce((s, b) => s + realStake(b), 0);
  const periodRoi = periodStaked > 0 ? (periodProfit / periodStaked) * 100 : 0;
  const periodWonCount = periodSettled.filter((b) => b.result === "Gagné").length;
  const periodWinRate = periodSettled.length > 0 ? (periodWonCount / periodSettled.length) * 100 : 0;
  const pending = bets.filter((b) => b.result === "En attente");

  if (bankrolls.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <Wallet size={40} className="text-zinc-700 mb-4" />
        <h3 className="text-zinc-300 font-semibold mb-1">Aucune bankroll pour l'instant</h3>
        <p className="text-zinc-500 text-sm mb-5 max-w-xs">Crée une bankroll liée à un bookmaker pour commencer à suivre tes paris.</p>
        <button onClick={onNewBankroll} className="bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-semibold text-sm px-4 py-2.5 rounded-lg transition-colors flex items-center gap-2">
          <Plus size={16} /> Créer une bankroll
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <GoalsCard goals={goals} currentMonthProfit={currentMonthProfit} onUpdateGoals={onUpdateGoals} />

      <Card className="p-3.5">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="flex items-center gap-1.5 text-xs uppercase tracking-wide text-zinc-500 font-medium mr-1"><Filter size={13} /> Période</span>
          {[["all", "Tout"], ["7d", "7 derniers jours"], ["month", "Ce mois-ci"], ["year", "Cette année"]].map(([key, label]) => (
            <button
              key={key}
              onClick={() => applyPreset(key)}
              className="px-3 py-1.5 rounded-lg text-xs font-medium bg-zinc-950 border border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:border-zinc-700 transition-colors"
            >
              {label}
            </button>
          ))}
          <div className="flex items-center gap-1.5 ml-auto">
            <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="w-36 py-1.5 text-xs" />
            <span className="text-zinc-600 text-xs">→</span>
            <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="w-36 py-1.5 text-xs" />
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatBlock label="Solde total" value={fmt(totalBalance)} valueClass={totalProfitAllTime >= 0 ? "text-emerald-400" : "text-rose-400"} sub="toujours global" />
        <StatBlock label={isFiltered ? "Bénéfice (période)" : "Bénéfice cumulé"} value={(periodProfit >= 0 ? "+" : "") + fmt(periodProfit)} valueClass={periodProfit >= 0 ? "text-emerald-400" : "text-rose-400"} />
        <StatBlock label={isFiltered ? "ROI (période)" : "ROI"} value={periodRoi.toFixed(1) + " %"} valueClass={periodRoi >= 0 ? "text-emerald-400" : "text-rose-400"} sub={`${periodSettled.length} paris réglés`} />
        <StatBlock label={isFiltered ? "Réussite (période)" : "Taux de réussite"} value={periodWinRate.toFixed(1) + " %"} sub={`${periodWonCount} gagnés`} />
      </div>

      <Card className="p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-zinc-300">Courbe de bankroll {isFiltered && <span className="text-zinc-500 font-normal">(période sélectionnée)</span>}</h3>
          {pending.length > 0 && <span className="text-xs text-amber-400">{pending.length} pari(s) en attente</span>}
        </div>
        {periodSettled.length === 0 ? (
          <p className="text-zinc-500 text-sm py-10 text-center">Aucun pari réglé sur cette période.</p>
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={curve} margin={{ left: -10, right: 10, top: 10 }}>
              <defs>
                <linearGradient id="soldeFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#34d399" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="#34d399" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="#27272a" strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="date" tick={{ fill: "#71717a", fontSize: 11 }} axisLine={{ stroke: "#3f3f46" }} tickLine={false} />
              <YAxis tick={{ fill: "#71717a", fontSize: 11 }} axisLine={false} tickLine={false} width={70} tickFormatter={(v) => v.toFixed(0) + "€"} />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="solde" name="Solde" stroke="#34d399" strokeWidth={2} fill="url(#soldeFill)" />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </Card>

      <div>
        <h3 className="text-sm font-semibold text-zinc-300 mb-2">Bankrolls</h3>
        <div className="grid sm:grid-cols-2 gap-3">
          {bankrolls.map((br) => {
            const brBets = settled.filter((b) => b.bankrollId === br.id);
            const p = brBets.reduce((s, b) => s + computeProfit(b), 0);
            const balance = br.initial + p;
            return (
              <Card key={br.id} className="p-4 flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium text-zinc-200">{br.name}</div>
                  <div className="text-xs text-zinc-500">{br.bookmaker}</div>
                </div>
                <div className="text-right">
                  <div className="font-mono font-semibold text-zinc-100">{fmt(balance)}</div>
                  <div className={`text-xs font-mono ${p >= 0 ? "text-emerald-400" : "text-rose-400"}`}>{p >= 0 ? "+" : ""}{fmt(p)}</div>
                </div>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ---------- Add bet ----------

function AddBet({ bankrolls, onAdd }) {
  const [bankrollId, setBankrollId] = useState(bankrolls[0]?.id || "");
  const [sport, setSport] = useState(SPORT_LIST[0]);
  const [betType, setBetType] = useState(SPORTS[SPORT_LIST[0]][0]);
  const [description, setDescription] = useState("");
  const [stake, setStake] = useState("");
  const [odds, setOdds] = useState("");
  const [boosted, setBoosted] = useState(false);
  const [originalOdds, setOriginalOdds] = useState("");
  const [freebet, setFreebet] = useState(false);
  const [live, setLive] = useState(false);
  const [result, setResult] = useState("En attente");
  const [cashOutAmount, setCashOutAmount] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));

  useEffect(() => {
    if (!bankrollId && bankrolls[0]) setBankrollId(bankrolls[0].id);
  }, [bankrolls]);

  useEffect(() => {
    setBetType(SPORTS[sport][0]);
  }, [sport]);

  if (bankrolls.length === 0) {
    return <p className="text-zinc-500 text-sm">Crée d'abord une bankroll dans l'onglet "Bankrolls".</p>;
  }

  const submit = () => {
    if (!stake || !odds || !bankrollId) return;
    onAdd({
      id: uid(),
      bankrollId,
      date,
      sport,
      betType,
      description: description.trim(),
      stake: Number(stake),
      odds: Number(odds),
      boosted,
      originalOdds: boosted && originalOdds ? Number(originalOdds) : null,
      freebet,
      live,
      result,
      cashOutAmount: result === "Cashé" ? Number(cashOutAmount) || 0 : null,
    });
    setDescription("");
    setStake("");
    setOdds("");
    setBoosted(false);
    setOriginalOdds("");
    setFreebet(false);
    setLive(false);
    setResult("En attente");
    setCashOutAmount("");
  };

  return (
    <Card className="p-5 max-w-xl">
      <h3 className="text-sm font-semibold text-zinc-300 mb-4">Ajouter un pari</h3>
      <div className="grid sm:grid-cols-2 gap-3">
        <div>
          <Label>Bankroll</Label>
          <Select value={bankrollId} onChange={(e) => setBankrollId(e.target.value)}>
            {bankrolls.map((br) => <option key={br.id} value={br.id}>{br.name} ({br.bookmaker})</option>)}
          </Select>
        </div>
        <div>
          <Label>Date</Label>
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
        <div>
          <Label>Sport</Label>
          <Select value={sport} onChange={(e) => setSport(e.target.value)}>
            {SPORT_LIST.map((s) => <option key={s} value={s}>{s}</option>)}
          </Select>
        </div>
        <div>
          <Label>Type de pari</Label>
          <Select value={betType} onChange={(e) => setBetType(e.target.value)}>
            {SPORTS[sport].map((t) => <option key={t} value={t}>{t}</option>)}
          </Select>
        </div>
        <div className="sm:col-span-2">
          <Label>Description (optionnel)</Label>
          <Input placeholder="Ex : PSG - OM, Mbappé buteur" value={description} onChange={(e) => setDescription(e.target.value)} />
        </div>
        <div>
          <Label>Mise (€)</Label>
          <Input type="number" step="0.01" placeholder="10.00" value={stake} onChange={(e) => setStake(e.target.value)} />
        </div>
        <div>
          <Label>Cote</Label>
          <Input type="number" step="0.01" placeholder="1.85" value={odds} onChange={(e) => setOdds(e.target.value)} />
        </div>
        <div>
          <Label>Résultat</Label>
          <Select value={result} onChange={(e) => setResult(e.target.value)}>
            {RESULTS.map((r) => <option key={r} value={r}>{r}</option>)}
          </Select>
        </div>
        <div className="flex items-end pb-2 flex-wrap gap-x-4 gap-y-2">
          <label className="flex items-center gap-2 text-sm text-zinc-300 cursor-pointer">
            <input type="checkbox" checked={boosted} onChange={(e) => setBoosted(e.target.checked)} className="accent-amber-400 w-4 h-4" />
            <Zap size={14} className="text-amber-400" /> Cote boostée
          </label>
        </div>
        <div className="flex items-end pb-2 flex-wrap gap-x-4 gap-y-2">
          <label className="flex items-center gap-2 text-sm text-zinc-300 cursor-pointer">
            <input type="checkbox" checked={freebet} onChange={(e) => setFreebet(e.target.checked)} className="accent-fuchsia-400 w-4 h-4" />
            <Gift size={14} className="text-fuchsia-400" /> Freebet
          </label>
          <label className="flex items-center gap-2 text-sm text-zinc-300 cursor-pointer">
            <input type="checkbox" checked={live} onChange={(e) => setLive(e.target.checked)} className="accent-sky-400 w-4 h-4" />
            <Radio size={14} className="text-sky-400" /> Live
          </label>
        </div>
        {boosted && (
          <div className="sm:col-span-2">
            <Label>Cote d'origine avant boost (optionnel, pour mesurer le gain)</Label>
            <Input type="number" step="0.01" placeholder="1.60" value={originalOdds} onChange={(e) => setOriginalOdds(e.target.value)} />
          </div>
        )}
        {result === "Cashé" && (
          <div className="sm:col-span-2">
            <Label>Montant encaissé (€)</Label>
            <Input type="number" step="0.01" placeholder="Ex : 12.50" value={cashOutAmount} onChange={(e) => setCashOutAmount(e.target.value)} />
          </div>
        )}
      </div>
      <button onClick={submit} className="mt-5 w-full bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-semibold text-sm py-2.5 rounded-lg transition-colors flex items-center justify-center gap-2">
        <Plus size={16} /> Enregistrer le pari
      </button>
    </Card>
  );
}

// ---------- History ----------

function HistoryTab({ bets, bankrolls, onDelete, onDeleteMany, onUpdateResult }) {
  const [filterSport, setFilterSport] = useState("Tous");
  const [filterBankroll, setFilterBankroll] = useState("Toutes");
  const [selected, setSelected] = useState(() => new Set());

  const filtered = bets
    .filter((b) => filterSport === "Tous" || b.sport === filterSport)
    .filter((b) => filterBankroll === "Toutes" || b.bankrollId === filterBankroll)
    .sort((a, b) => new Date(b.date) - new Date(a.date));

  const bankrollName = (id) => bankrolls.find((br) => br.id === id)?.name || "—";

  const allFilteredSelected = filtered.length > 0 && filtered.every((b) => selected.has(b.id));

  const toggleOne = (id) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    setSelected((prev) => {
      if (allFilteredSelected) {
        const next = new Set(prev);
        filtered.forEach((b) => next.delete(b.id));
        return next;
      }
      const next = new Set(prev);
      filtered.forEach((b) => next.add(b.id));
      return next;
    });
  };

  const deleteSelected = () => {
    if (selected.size === 0) return;
    onDeleteMany(Array.from(selected));
    setSelected(new Set());
  };

  return (
    <div>
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="w-44">
          <Select value={filterSport} onChange={(e) => setFilterSport(e.target.value)}>
            <option>Tous</option>
            {SPORT_LIST.map((s) => <option key={s} value={s}>{s}</option>)}
          </Select>
        </div>
        <div className="w-52">
          <Select value={filterBankroll} onChange={(e) => setFilterBankroll(e.target.value)}>
            <option value="Toutes">Toutes les bankrolls</option>
            {bankrolls.map((br) => <option key={br.id} value={br.id}>{br.name}</option>)}
          </Select>
        </div>
        {filtered.length > 0 && (
          <label className="flex items-center gap-2 text-sm text-zinc-400 cursor-pointer ml-1">
            <input type="checkbox" checked={allFilteredSelected} onChange={toggleAll} className="accent-emerald-500 w-4 h-4" />
            Tout sélectionner {filterSport !== "Tous" || filterBankroll !== "Toutes" ? "(filtré)" : ""}
          </label>
        )}
        {selected.size > 0 && (
          <button
            onClick={deleteSelected}
            className="ml-auto flex items-center gap-1.5 bg-rose-500/15 border border-rose-500/40 text-rose-400 hover:bg-rose-500/25 text-sm font-medium px-3 py-1.5 rounded-lg transition-colors"
          >
            <Trash2 size={14} /> Supprimer {selected.size} pari(s)
          </button>
        )}
      </div>

      {filtered.length === 0 ? (
        <p className="text-zinc-500 text-sm">Aucun pari trouvé.</p>
      ) : (
        <div className="space-y-2">
          {filtered.map((b) => {
            const profit = computeProfit(b);
            const isSelected = selected.has(b.id);
            return (
              <Card key={b.id} className={`p-3.5 flex items-center gap-3 ${isSelected ? "border-emerald-500/50" : ""}`}>
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => toggleOne(b.id)}
                  className="accent-emerald-500 w-4 h-4 shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium text-zinc-200">{b.sport}</span>
                    <span className="text-xs text-zinc-500">· {b.betType}</span>
                    {b.boosted && <span className="flex items-center gap-0.5 text-xs text-amber-400"><Zap size={11} />boost</span>}
                    {b.freebet && <span className="flex items-center gap-0.5 text-xs text-fuchsia-400"><Gift size={11} />freebet</span>}
                    {b.live && <span className="flex items-center gap-0.5 text-xs text-sky-400"><Radio size={11} />live</span>}
                  </div>
                  {b.description && <div className="text-xs text-zinc-500 truncate">{b.description}</div>}
                  <div className="text-xs text-zinc-600 mt-0.5">{new Date(b.date).toLocaleDateString("fr-FR")} · {bankrollName(b.bankrollId)}</div>
                </div>
                <div className="text-right w-24 shrink-0">
                  <div className="font-mono text-sm text-zinc-300">{fmt(b.stake)}</div>
                  <div className="font-mono text-xs text-zinc-500">
                    {b.result === "Cashé" ? `encaissé ${fmt(b.cashOutAmount)}` : `cote ${Number(b.odds).toFixed(2)}`}
                  </div>
                </div>
                <div className="w-28 shrink-0">
                  <Select value={b.result} onChange={(e) => onUpdateResult(b.id, e.target.value)} className="text-xs py-1.5">
                    {RESULTS.map((r) => <option key={r} value={r}>{r}</option>)}
                  </Select>
                </div>
                <div className={`w-24 text-right font-mono text-sm shrink-0 ${b.result === "En attente" ? "text-zinc-600" : profit >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                  {b.result === "En attente" ? "—" : (profit >= 0 ? "+" : "") + fmt(profit)}
                </div>
                <button onClick={() => onDelete(b.id)} className="text-zinc-600 hover:text-rose-400 shrink-0">
                  <Trash2 size={15} />
                </button>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ---------- Stats ----------

function groupStats(bets, keyFn) {
  const map = {};
  bets.forEach((b) => {
    const key = keyFn(b);
    if (!map[key]) map[key] = { name: key, profit: 0, staked: 0, count: 0, won: 0, settled: 0, oddsSum: 0 };
    map[key].count += 1;
    map[key].oddsSum += Number(b.odds) || 0;
    if (b.result !== "En attente") {
      map[key].settled += 1;
      map[key].profit += computeProfit(b);
      map[key].staked += realStake(b);
      if (b.result === "Gagné") map[key].won += 1;
    }
  });
  return Object.values(map)
    .map((r) => ({ ...r, avgOdds: r.count > 0 ? r.oddsSum / r.count : 0 }))
    .sort((a, b) => b.profit - a.profit);
}

const ODDS_BUCKETS = ["< 1.5", "1.5 - 2", "2 - 3", "3 - 5", "5 - 10", "10 - 25", "25+"];
function oddsBucket(b) {
  const o = Number(b.odds) || 0;
  if (o < 1.5) return "< 1.5";
  if (o < 2) return "1.5 - 2";
  if (o < 3) return "2 - 3";
  if (o < 5) return "3 - 5";
  if (o < 10) return "5 - 10";
  if (o < 25) return "10 - 25";
  return "25+";
}

const STAKE_BUCKETS = ["< 1€", "1 - 2€", "2 - 5€", "5 - 10€", "10 - 20€", "20€+"];
function stakeBucket(b) {
  const s = Number(b.stake) || 0;
  if (s < 1) return "< 1€";
  if (s < 2) return "1 - 2€";
  if (s < 5) return "2 - 5€";
  if (s < 10) return "5 - 10€";
  if (s < 20) return "10 - 20€";
  return "20€+";
}

function bucketStats(bets, bucketFn, labels) {
  const map = {};
  labels.forEach((l) => { map[l] = { name: l, count: 0, profit: 0, staked: 0, won: 0, settled: 0, oddsSum: 0 }; });
  bets.forEach((b) => {
    const label = bucketFn(b);
    if (!map[label]) return;
    map[label].count += 1;
    map[label].oddsSum += Number(b.odds) || 0;
    if (b.result !== "En attente") {
      map[label].settled += 1;
      map[label].profit += computeProfit(b);
      map[label].staked += realStake(b);
      if (b.result === "Gagné") map[label].won += 1;
    }
  });
  return labels.map((l) => ({ ...map[l], avgOdds: map[l].count > 0 ? map[l].oddsSum / map[l].count : 0 }));
}

function computeGlobalStats(bets) {
  const settled = bets.filter((b) => b.result !== "En attente").sort((a, b) => new Date(a.date) - new Date(b.date));
  const totalStaked = settled.reduce((s, b) => s + realStake(b), 0);
  const avgOdds = bets.length > 0 ? bets.reduce((s, b) => s + (Number(b.odds) || 0), 0) / bets.length : 0;
  const avgOddsWeighted = totalStaked > 0 ? settled.reduce((s, b) => s + (Number(b.odds) || 0) * realStake(b), 0) / totalStaked : 0;
  const avgStake = bets.length > 0 ? bets.reduce((s, b) => s + realStake(b), 0) / bets.length : 0;

  let biggestWin = null, biggestLoss = null;
  settled.forEach((b) => {
    const p = computeProfit(b);
    if (p > 0 && (!biggestWin || p > computeProfit(biggestWin))) biggestWin = b;
    if (p < 0 && (!biggestLoss || p < computeProfit(biggestLoss))) biggestLoss = b;
  });

  const freebetBets = bets.filter((b) => b.freebet);
  const freebetSettled = freebetBets.filter((b) => b.result !== "En attente");
  const freebetProfit = freebetSettled.reduce((s, b) => s + computeProfit(b), 0);
  const freebetWon = freebetSettled.filter((b) => b.result === "Gagné").length;
  const freebetWinRate = freebetSettled.length > 0 ? (freebetWon / freebetSettled.length) * 100 : 0;

  const liveBets = bets.filter((b) => b.live);
  const liveSettled = liveBets.filter((b) => b.result !== "En attente");
  const liveProfit = liveSettled.reduce((s, b) => s + computeProfit(b), 0);
  const liveStaked = liveSettled.reduce((s, b) => s + realStake(b), 0);
  const liveWon = liveSettled.filter((b) => b.result === "Gagné").length;
  const liveWinRate = liveSettled.length > 0 ? (liveWon / liveSettled.length) * 100 : 0;

  // Streaks (Gagné/Perdu only, Remboursé is skipped and doesn't break the streak)
  let curStreak = 0, curType = null;
  let bestWinStreak = 0, worstLossStreak = 0;
  let runWin = 0, runLoss = 0;
  settled.forEach((b) => {
    if (b.result === "Gagné") {
      runWin += 1; runLoss = 0;
      bestWinStreak = Math.max(bestWinStreak, runWin);
      curStreak = runWin; curType = "Gagné";
    } else if (b.result === "Perdu") {
      runLoss += 1; runWin = 0;
      worstLossStreak = Math.max(worstLossStreak, runLoss);
      curStreak = runLoss; curType = "Perdu";
    }
  });

  const distribution = ["Gagné", "Perdu", "Remboursé", "En attente"].map((r) => ({
    name: r, value: bets.filter((b) => b.result === r).length,
  })).filter((d) => d.value > 0);

  const monthMap = {};
  settled.forEach((b) => {
    const m = (b.date || "").slice(0, 7);
    if (!monthMap[m]) monthMap[m] = 0;
    monthMap[m] += computeProfit(b);
  });
  const monthly = Object.keys(monthMap).sort().map((m) => ({ name: m, profit: monthMap[m] }));

  return {
    totalBets: bets.length, totalStaked, avgOdds, avgOddsWeighted, avgStake,
    biggestWin, biggestLoss, curStreak, curType, bestWinStreak, worstLossStreak,
    distribution, monthly,
    freebetCount: freebetBets.length, freebetProfit, freebetWinRate,
    liveCount: liveBets.length, liveProfit, liveStaked, liveWinRate,
  };
}

const RESULT_PIE_COLOR = { "Gagné": "#34d399", "Perdu": "#fb7185", "Remboursé": "#a1a1aa", "En attente": "#fbbf24" };

function StatsTable({ rows }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-xs uppercase tracking-wide text-zinc-500 border-b border-zinc-800">
            <th className="py-2 pr-3 font-medium">Nom</th>
            <th className="py-2 pr-3 font-medium text-right">Paris</th>
            <th className="py-2 pr-3 font-medium text-right">Réussite</th>
            <th className="py-2 pr-3 font-medium text-right">Cote moy.</th>
            <th className="py-2 pr-3 font-medium text-right">Misé</th>
            <th className="py-2 font-medium text-right">Bénéfice</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.name} className="border-b border-zinc-900">
              <td className="py-2 pr-3 text-zinc-200">{r.name}</td>
              <td className="py-2 pr-3 text-right font-mono text-zinc-400">{r.count}</td>
              <td className="py-2 pr-3 text-right font-mono text-zinc-400">{r.settled > 0 ? ((r.won / r.settled) * 100).toFixed(0) + "%" : "—"}</td>
              <td className="py-2 pr-3 text-right font-mono text-zinc-400">{r.avgOdds.toFixed(2)}</td>
              <td className="py-2 pr-3 text-right font-mono text-zinc-400">{fmt(r.staked)}</td>
              <td className={`py-2 text-right font-mono font-medium ${r.profit >= 0 ? "text-emerald-400" : "text-rose-400"}`}>{r.profit >= 0 ? "+" : ""}{fmt(r.profit)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ---------- AI Insights ----------

function buildStatsSummary(bets, bankrolls) {
  const settled = bets.filter((b) => b.result !== "En attente");
  const totalProfit = settled.reduce((s, b) => s + computeProfit(b), 0);
  const totalStaked = settled.reduce((s, b) => s + realStake(b), 0);
  const g = computeGlobalStats(bets);

  const summarize = (rows) => rows
    .filter((r) => r.count > 0)
    .map((r) => ({
      nom: r.name,
      paris: r.count,
      reussite: r.settled > 0 ? Math.round((r.won / r.settled) * 100) : null,
      profit: Math.round(r.profit * 100) / 100,
    }));

  return {
    totalParis: bets.length,
    parisRegles: settled.length,
    parisEnAttente: bets.length - settled.length,
    totalMise: Math.round(totalStaked * 100) / 100,
    beneficeTotal: Math.round(totalProfit * 100) / 100,
    roiPourcent: totalStaked > 0 ? Math.round((totalProfit / totalStaked) * 1000) / 10 : null,
    tauxReussiteGlobalPourcent: settled.length > 0 ? Math.round((settled.filter((b) => b.result === "Gagné").length / settled.length) * 100) : null,
    coteMoyenne: Math.round(g.avgOdds * 100) / 100,
    coteMoyennePondereeParMise: Math.round(g.avgOddsWeighted * 100) / 100,
    meilleureSerieVictoires: g.bestWinStreak,
    pireSerieDefaites: g.worstLossStreak,
    parSport: summarize(groupStats(bets, (b) => b.sport)),
    parTypeDePari: summarize(groupStats(bets, (b) => b.betType)).slice(0, 12),
    parBookmaker: summarize(groupStats(bets, (b) => bankrolls.find((br) => br.id === b.bankrollId)?.bookmaker || "inconnu")),
    parTrancheDeCote: summarize(bucketStats(bets, oddsBucket, ODDS_BUCKETS)),
    parTrancheDeMise: summarize(bucketStats(bets, stakeBucket, STAKE_BUCKETS)),
    nombreParisAvecCoteBoostee: bets.filter((b) => b.boosted).length,
    nombreFreebets: bets.filter((b) => b.freebet).length,
    nombreParisLive: bets.filter((b) => b.live).length,
  };
}

function buildInsightsPrompt(summary) {
  return `Tu es un analyste de paris sportifs. On te donne un résumé statistique agrégé (pas les paris bruts un par un) d'un parieur amateur. Génère une analyse honnête et utile en français.

Résumé statistique :
${JSON.stringify(summary)}

Réponds UNIQUEMENT avec un objet JSON valide, sans texte autour, sans balises markdown, avec exactement ce format :
{
  "appreciation": "2-3 phrases d'appréciation générale honnête, citant au moins un chiffre concret du résumé",
  "points_forts": ["...", "..."],
  "points_amelioration": ["...", "..."],
  "recommandations": ["...", "..."]
}

Règles impératives :
- Base les points forts/faibles sur les données précises fournies (sport, type de pari, bookmaker, tranche de cote ou de mise) — pas de généralités vagues type "continuez comme ça".
- Si "parisRegles" est inférieur à 20, précise explicitement dans "appreciation" que l'échantillon est trop faible pour tirer des conclusions statistiquement fiables, même si le ROI affiché est élevé.
- Si le ROI ou le bénéfice repose sur un tout petit nombre de paris à cote élevée (regarde parTrancheDeCote), signale-le comme un point d'amélioration ("dépendance à quelques gros gains") plutôt que comme une force.
- Ne recommande JAMAIS d'augmenter les mises, de parier plus souvent, ou de suivre une martingale pour "rattraper" des pertes. Les recommandations portent uniquement sur la gestion du risque, la diversification, la discipline de mise, ou l'analyse de ce qui fonctionne déjà.
- 2 à 4 éléments par liste, chaque élément est une phrase complète, concrète, exploitable.`;
}

async function generateInsights(bets, bankrolls) {
  const summary = buildStatsSummary(bets, bankrolls);
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "claude-sonnet-4-6",
      max_tokens: 1500,
      messages: [{ role: "user", content: buildInsightsPrompt(summary) }],
    }),
  });
  const data = await response.json();
  if (!response.ok || data.error) {
    throw new Error(data?.error?.message || `Erreur API (${response.status})`);
  }
  const textBlocks = (data.content || []).filter((b) => b.type === "text").map((b) => b.text).join("\n");
  if (!textBlocks.trim()) {
    throw new Error("Réponse vide de l'API — le modèle n'a peut-être pas eu assez de tokens pour répondre.");
  }
  // Extract the JSON object even if the model added stray text or markdown fences around it
  const start = textBlocks.indexOf("{");
  const end = textBlocks.lastIndexOf("}");
  if (start === -1 || end === -1 || end < start) {
    throw new Error("Format de réponse inattendu (pas de JSON détecté).");
  }
  const jsonStr = textBlocks.slice(start, end + 1);
  try {
    return JSON.parse(jsonStr);
  } catch (e) {
    throw new Error("JSON invalide reçu du modèle — probablement une réponse tronquée.");
  }
}

const INSIGHTS_COOLDOWN_HOURS = 12;

function AIInsights({ bets, bankrolls, insights, onUpdateInsights }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(t);
  }, []);

  const settledCount = bets.filter((b) => b.result !== "En attente").length;
  const lastGeneratedAt = insights?.generatedAt ? new Date(insights.generatedAt).getTime() : null;
  const msSinceLast = lastGeneratedAt ? now - lastGeneratedAt : Infinity;
  const cooldownMs = INSIGHTS_COOLDOWN_HOURS * 60 * 60 * 1000;
  const onCooldown = msSinceLast < cooldownMs;
  const hoursLeft = onCooldown ? Math.ceil((cooldownMs - msSinceLast) / (60 * 60 * 1000)) : 0;

  const handleGenerate = async () => {
    if (onCooldown) return;
    setLoading(true);
    setError("");
    try {
      const result = await generateInsights(bets, bankrolls);
      onUpdateInsights({ data: result, generatedAt: new Date().toISOString(), betsCountAtGeneration: bets.length });
    } catch (e) {
      setError(`Impossible de générer l'analyse : ${e.message}`);
    }
    setLoading(false);
  };

  if (settledCount < 3) {
    return (
      <Card className="p-4 flex items-center gap-2 text-sm text-zinc-400">
        <Sparkles size={15} className="text-zinc-600 shrink-0" />
        Ajoute au moins quelques paris réglés pour débloquer l'analyse IA de tes performances.
      </Card>
    );
  }

  const insight = insights?.data || null;

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-zinc-300 flex items-center gap-1.5">
          <Sparkles size={14} className="text-violet-400" /> Insights IA
        </h3>
        <button
          onClick={handleGenerate}
          disabled={loading || onCooldown}
          title={onCooldown ? `Disponible à nouveau dans environ ${hoursLeft}h (limite pour maîtriser le coût des appels IA)` : ""}
          className="text-xs font-medium text-violet-400 hover:text-violet-300 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5"
        >
          {loading ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />}
          {insight ? "Régénérer" : "Générer l'analyse"}
        </button>
      </div>

      {onCooldown && (
        <div className="text-xs text-zinc-500 mb-2">Prochaine analyse disponible dans ~{hoursLeft}h (limite de {INSIGHTS_COOLDOWN_HOURS}h entre deux générations, pour maîtriser le coût).</div>
      )}
      {error && <div className="text-xs text-rose-400 flex items-center gap-1.5 mb-2"><AlertCircle size={12} />{error}</div>}
      {!insight && !loading && !error && !onCooldown && (
        <p className="text-zinc-500 text-sm">Clique sur "Générer l'analyse" pour une analyse personnalisée de tes performances par sport, type de pari, bookmaker et tranche de cote.</p>
      )}
      {loading && <p className="text-zinc-500 text-sm">Analyse en cours...</p>}

      {insight && (
        <div className="space-y-4">
          <p className="text-sm text-zinc-300">{insight.appreciation}</p>
          {insights.betsCountAtGeneration !== bets.length && !onCooldown && (
            <p className="text-xs text-amber-400">De nouveaux paris ont été ajoutés depuis cette analyse — régénère pour une version à jour.</p>
          )}
          <div className="grid sm:grid-cols-3 gap-3">
            <div>
              <div className="text-xs uppercase tracking-wide text-emerald-400 font-medium mb-1.5 flex items-center gap-1"><TrendingUp size={12} /> Points forts</div>
              <ul className="space-y-1.5">
                {(insight.points_forts || []).map((p, i) => <li key={i} className="text-xs text-zinc-400 bg-emerald-500/5 border border-emerald-500/20 rounded-lg p-2">{p}</li>)}
              </ul>
            </div>
            <div>
              <div className="text-xs uppercase tracking-wide text-amber-400 font-medium mb-1.5 flex items-center gap-1"><AlertCircle size={12} /> Points d'amélioration</div>
              <ul className="space-y-1.5">
                {(insight.points_amelioration || []).map((p, i) => <li key={i} className="text-xs text-zinc-400 bg-amber-500/5 border border-amber-500/20 rounded-lg p-2">{p}</li>)}
              </ul>
            </div>
            <div>
              <div className="text-xs uppercase tracking-wide text-sky-400 font-medium mb-1.5 flex items-center gap-1"><Target size={12} /> Recommandations</div>
              <ul className="space-y-1.5">
                {(insight.recommandations || []).map((p, i) => <li key={i} className="text-xs text-zinc-400 bg-sky-500/5 border border-sky-500/20 rounded-lg p-2">{p}</li>)}
              </ul>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}

function StatsTab({ bets, bankrolls, insights, onUpdateInsights }) {
  const bySport = useMemo(() => groupStats(bets, (b) => b.sport), [bets]);
  const byType = useMemo(() => groupStats(bets, (b) => b.betType), [bets]);
  const byBookmaker = useMemo(() => groupStats(bets, (b) => bankrolls.find((br) => br.id === b.bankrollId)?.bookmaker || "—"), [bets, bankrolls]);
  const oddsDist = useMemo(() => bucketStats(bets, oddsBucket, ODDS_BUCKETS), [bets]);
  const stakeDist = useMemo(() => bucketStats(bets, stakeBucket, STAKE_BUCKETS), [bets]);
  const g = useMemo(() => computeGlobalStats(bets), [bets]);

  const boostedBets = bets.filter((b) => b.boosted);
  const boostedSettled = boostedBets.filter((b) => b.result !== "En attente");
  const boostedProfit = boostedSettled.reduce((s, b) => s + computeProfit(b), 0);
  const boostedStaked = boostedSettled.reduce((s, b) => s + realStake(b), 0);
  const boostedWon = boostedSettled.filter((b) => b.result === "Gagné").length;
  const boostedWinRate = boostedSettled.length > 0 ? (boostedWon / boostedSettled.length) * 100 : 0;
  const boostedExtraGain = boostedBets.reduce((s, b) => s + computeBoostGain(b), 0);

  const nonBoostedSettled = bets.filter((b) => !b.boosted && b.result !== "En attente");
  const nonBoostedWon = nonBoostedSettled.filter((b) => b.result === "Gagné").length;
  const nonBoostedWinRate = nonBoostedSettled.length > 0 ? (nonBoostedWon / nonBoostedSettled.length) * 100 : 0;

  if (bets.length === 0) {
    return <p className="text-zinc-500 text-sm">Ajoute des paris pour voir apparaître tes statistiques.</p>;
  }

  return (
    <div className="space-y-6">
      <AIInsights bets={bets} bankrolls={bankrolls} insights={insights} onUpdateInsights={onUpdateInsights} />

      <div>
        <h3 className="text-sm font-semibold text-zinc-300 mb-3">Vue d'ensemble</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatBlock label="Paris enregistrés" value={g.totalBets} sub={`${fmt(g.totalStaked)} misés (réglés)`} />
          <StatBlock label="Cote moyenne" value={g.avgOdds.toFixed(2)} sub="moyenne simple" />
          <StatBlock label="Cote moy. pondérée" value={g.avgOddsWeighted.toFixed(2)} sub="pondérée par la mise" />
          <StatBlock label="Mise moyenne" value={fmt(g.avgStake)} />
          <StatBlock label="Plus gros gain" value={g.biggestWin ? "+" + fmt(computeProfit(g.biggestWin)) : "—"} valueClass="text-emerald-400" sub={g.biggestWin ? `${g.biggestWin.sport} · cote ${Number(g.biggestWin.odds).toFixed(2)}` : ""} />
          <StatBlock label="Plus grosse perte" value={g.biggestLoss ? fmt(computeProfit(g.biggestLoss)) : "—"} valueClass="text-rose-400" sub={g.biggestLoss ? `${g.biggestLoss.sport} · cote ${Number(g.biggestLoss.odds).toFixed(2)}` : ""} />
          <StatBlock label="Série actuelle" value={g.curType ? `${g.curStreak} ${g.curType === "Gagné" ? "victoire(s)" : "défaite(s)"}` : "—"} valueClass={g.curType === "Gagné" ? "text-emerald-400" : g.curType === "Perdu" ? "text-rose-400" : "text-zinc-100"} />
          <StatBlock label="Meilleure série" value={`${g.bestWinStreak} victoire(s)`} valueClass="text-emerald-400" sub={`pire : ${g.worstLossStreak} défaite(s) d'affilée`} />
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div>
          <h3 className="text-sm font-semibold text-zinc-300 mb-3">Répartition des résultats</h3>
          <Card className="p-4">
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={g.distribution} dataKey="value" nameKey="name" innerRadius={50} outerRadius={80} paddingAngle={3}>
                  {g.distribution.map((d, i) => <Cell key={i} fill={RESULT_PIE_COLOR[d.name]} />)}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ fontSize: 12, color: "#a1a1aa" }} />
              </PieChart>
            </ResponsiveContainer>
          </Card>
        </div>
        <div>
          <h3 className="text-sm font-semibold text-zinc-300 mb-3">Bénéfice par mois</h3>
          <Card className="p-4">
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={g.monthly} margin={{ left: -10, right: 10 }}>
                <CartesianGrid stroke="#27272a" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" tick={{ fill: "#71717a", fontSize: 11 }} axisLine={{ stroke: "#3f3f46" }} tickLine={false} />
                <YAxis tick={{ fill: "#71717a", fontSize: 11 }} axisLine={false} tickLine={false} width={60} tickFormatter={(v) => v.toFixed(0) + "€"} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="profit" name="Bénéfice" radius={[4, 4, 0, 0]}>
                  {g.monthly.map((r, i) => <Cell key={i} fill={r.profit >= 0 ? "#34d399" : "#fb7185"} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div>
          <h3 className="text-sm font-semibold text-zinc-300 mb-3">Distribution des cotes</h3>
          <Card className="p-4">
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={oddsDist} margin={{ left: -10, right: 10 }}>
                <CartesianGrid stroke="#27272a" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" tick={{ fill: "#71717a", fontSize: 10 }} axisLine={{ stroke: "#3f3f46" }} tickLine={false} />
                <YAxis tick={{ fill: "#71717a", fontSize: 11 }} axisLine={false} tickLine={false} width={60} tickFormatter={(v) => v.toFixed(0) + "€"} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="profit" name="Bénéfice" radius={[4, 4, 0, 0]}>
                  {oddsDist.map((r, i) => <Cell key={i} fill={r.profit >= 0 ? "#34d399" : "#fb7185"} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            <div className="mt-2">
              <StatsTable rows={oddsDist} />
            </div>
          </Card>
        </div>
        <div>
          <h3 className="text-sm font-semibold text-zinc-300 mb-3">Distribution des mises</h3>
          <Card className="p-4">
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={stakeDist} margin={{ left: -10, right: 10 }}>
                <CartesianGrid stroke="#27272a" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" tick={{ fill: "#71717a", fontSize: 10 }} axisLine={{ stroke: "#3f3f46" }} tickLine={false} />
                <YAxis tick={{ fill: "#71717a", fontSize: 11 }} axisLine={false} tickLine={false} width={60} tickFormatter={(v) => v.toFixed(0) + "€"} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="profit" name="Bénéfice" radius={[4, 4, 0, 0]}>
                  {stakeDist.map((r, i) => <Cell key={i} fill={r.profit >= 0 ? "#34d399" : "#fb7185"} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            <div className="mt-2">
              <StatsTable rows={stakeDist} />
            </div>
          </Card>
        </div>
      </div>

      <div>
        <h3 className="text-sm font-semibold text-zinc-300 mb-3">Bénéfice par sport</h3>
        <Card className="p-4">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={bySport} margin={{ left: -10, right: 10 }}>
              <CartesianGrid stroke="#27272a" strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="name" tick={{ fill: "#71717a", fontSize: 11 }} axisLine={{ stroke: "#3f3f46" }} tickLine={false} />
              <YAxis tick={{ fill: "#71717a", fontSize: 11 }} axisLine={false} tickLine={false} width={60} tickFormatter={(v) => v.toFixed(0) + "€"} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="profit" name="Bénéfice" radius={[4, 4, 0, 0]}>
                {bySport.map((r, i) => <Cell key={i} fill={r.profit >= 0 ? "#34d399" : "#fb7185"} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <div className="mt-3">
            <StatsTable rows={bySport} />
          </div>
        </Card>
      </div>

      <div>
        <h3 className="text-sm font-semibold text-zinc-300 mb-3">Par type de pari</h3>
        <Card className="p-4">
          <StatsTable rows={byType} />
        </Card>
      </div>

      <div>
        <h3 className="text-sm font-semibold text-zinc-300 mb-3">Par bookmaker</h3>
        <Card className="p-4">
          <StatsTable rows={byBookmaker} />
        </Card>
      </div>

      <div>
        <h3 className="text-sm font-semibold text-zinc-300 mb-3 flex items-center gap-1.5"><Zap size={14} className="text-amber-400" /> Cotes boostées</h3>
        <Card className="p-4">
          {boostedBets.length === 0 ? (
            <p className="text-zinc-500 text-sm">Aucun pari avec cote boostée enregistré pour l'instant.</p>
          ) : (
            <>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <StatBlock label="Paris boostés" value={boostedBets.length} />
                <StatBlock label="Bénéfice" value={(boostedProfit >= 0 ? "+" : "") + fmt(boostedProfit)} valueClass={boostedProfit >= 0 ? "text-emerald-400" : "text-rose-400"} />
                <StatBlock label="Taux de réussite" value={boostedWinRate.toFixed(0) + " %"} sub={`vs ${nonBoostedWinRate.toFixed(0)} % sans boost`} />
                <StatBlock label="Gain grâce au boost" value={"+" + fmt(boostedExtraGain)} valueClass="text-amber-400" sub="vs cote d'origine" />
              </div>
              <div className="mt-3 text-xs text-zinc-500">Total misé sur boost : <span className="font-mono text-zinc-300">{fmt(boostedStaked)}</span></div>
            </>
          )}
        </Card>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div>
          <h3 className="text-sm font-semibold text-zinc-300 mb-3 flex items-center gap-1.5"><Gift size={14} className="text-fuchsia-400" /> Freebets</h3>
          <Card className="p-4">
            {g.freebetCount === 0 ? (
              <p className="text-zinc-500 text-sm">Aucun freebet enregistré pour l'instant.</p>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                <StatBlock label="Freebets utilisés" value={g.freebetCount} />
                <StatBlock label="Réussite" value={g.freebetWinRate.toFixed(0) + " %"} />
                <StatBlock label="Gains générés" value={(g.freebetProfit >= 0 ? "+" : "") + fmt(g.freebetProfit)} valueClass={g.freebetProfit >= 0 ? "text-emerald-400" : "text-rose-400"} sub="mise non risquée" />
              </div>
            )}
          </Card>
        </div>
        <div>
          <h3 className="text-sm font-semibold text-zinc-300 mb-3 flex items-center gap-1.5"><Radio size={14} className="text-sky-400" /> Paris live</h3>
          <Card className="p-4">
            {g.liveCount === 0 ? (
              <p className="text-zinc-500 text-sm">Aucun pari live enregistré pour l'instant.</p>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                <StatBlock label="Paris en live" value={g.liveCount} />
                <StatBlock label="Réussite" value={g.liveWinRate.toFixed(0) + " %"} />
                <StatBlock label="Bénéfice" value={(g.liveProfit >= 0 ? "+" : "") + fmt(g.liveProfit)} valueClass={g.liveProfit >= 0 ? "text-emerald-400" : "text-rose-400"} sub={`${fmt(g.liveStaked)} misés`} />
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}

// ---------- Bankrolls management ----------

function BankrollsTab({ bankrolls, bets, onNew, onEdit, onDelete, onExport }) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <button onClick={onNew} className="bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-semibold text-sm px-4 py-2.5 rounded-lg transition-colors flex items-center gap-2">
          <Plus size={16} /> Nouvelle bankroll
        </button>
        <button onClick={onExport} className="bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 text-sm font-medium px-4 py-2.5 rounded-lg transition-colors flex items-center gap-2">
          <Download size={16} /> Exporter mes données
        </button>
      </div>
      <p className="text-xs text-zinc-500 mb-4">Télécharge une sauvegarde complète (bankrolls, paris, objectifs) au format JSON — à garder de ton côté, pour ne rien perdre.</p>
      {bankrolls.length === 0 ? (
        <p className="text-zinc-500 text-sm">Aucune bankroll créée.</p>
      ) : (
        <div className="space-y-2">
          {bankrolls.map((br) => {
            const brBets = bets.filter((b) => b.bankrollId === br.id);
            const settled = brBets.filter((b) => b.result !== "En attente");
            const profit = settled.reduce((s, b) => s + computeProfit(b), 0);
            return (
              <Card key={br.id} className="p-4 flex items-center justify-between">
                <div>
                  <div className="font-medium text-zinc-200">{br.name}</div>
                  <div className="text-xs text-zinc-500">{br.bookmaker} · départ {fmt(br.initial)} · {brBets.length} pari(s)</div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <div className="font-mono font-semibold text-zinc-100">{fmt(br.initial + profit)}</div>
                    <div className={`text-xs font-mono ${profit >= 0 ? "text-emerald-400" : "text-rose-400"}`}>{profit >= 0 ? "+" : ""}{fmt(profit)}</div>
                  </div>
                  <button onClick={() => onEdit(br)} className="text-zinc-600 hover:text-emerald-400">
                    <Pencil size={16} />
                  </button>
                  <button onClick={() => onDelete(br.id)} className="text-zinc-600 hover:text-rose-400">
                    <Trash2 size={16} />
                  </button>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ---------- Import ----------

const IMPORT_EXAMPLE = `[
  {
    "date": "2026-06-28",
    "bookmaker": "Winamax",
    "ticketRef": "6FQSQQOU",
    "sport": "Football",
    "betType": "Buteur",
    "description": "Mbappé buteur - PSG-OM",
    "stake": 10,
    "odds": 1.85,
    "boosted": false,
    "originalOdds": null,
    "freebet": false,
    "live": false,
    "result": "Gagné"
  },
  {
    "date": "2026-06-29",
    "bookmaker": "Betclic",
    "ticketRef": null,
    "sport": "Cyclisme",
    "betType": "Top 3",
    "description": "Tour de France étape 5",
    "stake": 5,
    "odds": 3.2,
    "boosted": true,
    "originalOdds": 2.5,
    "freebet": false,
    "live": true,
    "result": "Perdu"
  }
]`;

function parseImportJson(raw, bankrolls, existingBets) {
  let arr;
  try {
    arr = JSON.parse(raw);
  } catch (e) {
    return { error: "JSON invalide : vérifie les guillemets et les virgules." };
  }
  if (!Array.isArray(arr)) return { error: "Le JSON doit être une liste de paris entre crochets [ ]." };
  if (arr.length === 0) return { error: "La liste est vide." };

  const existingByName = {};
  bankrolls.forEach((br) => { existingByName[br.bookmaker.trim().toLowerCase()] = br; });
  const existingByRef = {};
  (existingBets || []).forEach((b) => { if (b.ticketRef) existingByRef[b.ticketRef] = b; });
  const seenInBatch = new Set();

  const newBankrolls = [];
  const newBankrollsByName = {};
  const bets = [];
  const updates = [];
  const warnings = [];
  let duplicateCount = 0;

  arr.forEach((raw, i) => {
    const bookmaker = (raw.bookmaker || "").toString().trim();
    if (!bookmaker) { warnings.push(`Ligne ${i + 1} : bookmaker manquant, ignorée.`); return; }
    if (raw.stake == null || raw.odds == null) { warnings.push(`Ligne ${i + 1} : mise ou cote manquante, ignorée.`); return; }

    const ref = (raw.ticketRef || "").toString().trim() || null;
    const result = RESULTS.includes(raw.result) ? raw.result : "En attente";

    // A bet already imported as "En attente" whose result is now known: update it in place instead of skipping
    const existing = ref ? existingByRef[ref] : null;
    if (existing && existing.result === "En attente" && result !== "En attente") {
      updates.push({
        id: existing.id,
        patch: {
          result,
          odds: Number(raw.odds) || existing.odds,
          stake: Number(raw.stake) || existing.stake,
          boosted: !!raw.boosted,
          originalOdds: raw.originalOdds ? Number(raw.originalOdds) : existing.originalOdds,
          freebet: !!raw.freebet,
          live: !!raw.live,
          description: (raw.description || existing.description || "").toString(),
          cashOutAmount: result === "Cashé" ? (Number(raw.cashOutAmount) || 0) : null,
        },
      });
      return;
    }

    if (ref && (existingByRef[ref] || seenInBatch.has(ref))) {
      duplicateCount += 1;
      return;
    }
    if (ref) seenInBatch.add(ref);

    const key = bookmaker.toLowerCase();
    let bankrollId;
    if (existingByName[key]) {
      bankrollId = existingByName[key].id;
    } else if (newBankrollsByName[key]) {
      bankrollId = newBankrollsByName[key].id;
    } else {
      const nb = { id: uid(), name: bookmaker, bookmaker, initial: 0, createdAt: new Date().toISOString() };
      newBankrollsByName[key] = nb;
      newBankrolls.push(nb);
      bankrollId = nb.id;
    }

    const newBet = {
      id: uid(),
      bankrollId,
      ticketRef: ref,
      date: raw.date || new Date().toISOString().slice(0, 10),
      sport: (raw.sport || "Autre sport").toString(),
      betType: (raw.betType || "Autre").toString(),
      description: (raw.description || "").toString(),
      stake: Number(raw.stake) || 0,
      odds: Number(raw.odds) || 0,
      boosted: !!raw.boosted,
      originalOdds: raw.originalOdds ? Number(raw.originalOdds) : null,
      freebet: !!raw.freebet,
      live: !!raw.live,
      result,
      cashOutAmount: result === "Cashé" ? (Number(raw.cashOutAmount) || 0) : null,
    };
    if (!ref && (looksLikeDuplicate(newBet, existingBets || []) || looksLikeDuplicate(newBet, bets))) {
      newBet.possibleDuplicate = true;
    }
    bets.push(newBet);
  });

  if (bets.length === 0 && updates.length === 0) {
    return duplicateCount > 0
      ? { error: `Les ${duplicateCount} pari(s) sont tous des doublons déjà importés (référence identique).`, warnings }
      : { error: "Aucun pari valide trouvé.", warnings };
  }
  return { bets, updates, newBankrolls, warnings, duplicateCount };
}

// ---------- Screenshot import (AI extraction) ----------

function buildExtractionPrompt() {
  return `Tu es un extracteur de tickets de paris sportifs. On te donne une ou plusieurs captures d'écran d'une application de paris sportifs (Winamax, Betclic, Unibet, PMU, ParionsSport, ou autre). Chaque capture peut contenir PLUSIEURS tickets de paris empilés.

Réponds UNIQUEMENT avec un tableau JSON valide, sans aucun texte avant ou après, sans balises markdown. Un objet par ticket de pari visible sur l'image. Si l'image ne contient aucun ticket de pari lisible, réponds avec un tableau vide [].

Schéma attendu pour chaque pari :
{
  "date": "AAAA-MM-JJ",
  "ticketRef": "référence du ticket telle qu'affichée (ex: 6FQSQQOU), ou null si non visible",
  "sport": "Football" | "Cyclisme" | autre sport si évident,
  "betType": voir liste ci-dessous,
  "description": "Équipe A X-Y Équipe B - détail du pari (joueur, marché, score, etc.)",
  "stake": nombre (la mise en euros),
  "odds": nombre (la cote),
  "boosted": false,
  "originalOdds": null,
  "freebet": false,
  "live": false,
  "result": "Gagné" | "Perdu" | "Remboursé" | "En attente" | "Cashé",
  "cashOutAmount": nombre (uniquement si result est "Cashé", sinon null)
}

Types de paris déjà utilisés, à réutiliser en priorité (choisis le plus proche, n'utilise "Autre" qu'en dernier recours) :
${JSON.stringify(SPORTS, null, 0)}

Précision cyclisme : "Vainqueur" ou "Podium 1er" (quelle que soit la formulation du bookmaker) = toujours "Top 1". On uniformise systématiquement en Top 1 / Top 3 / Top 10, jamais de libellé bookmaker brut.

Règles impératives :
- "date" : utilise la date affichée en bas du ticket (format ticket "10h02 - 22 juin 2026" → "2026-06-22").
- "boosted" : les badges promo du bookmaker (ex. "Bang to the Moon", "City of Gold", "Penalty World", "La Grosse Cote Boostée") NE sont PAS des cotes boostées au sens de ce champ — laisse toujours false pour ces badges.
- "freebet" : true uniquement si le ticket indique explicitement "Mise Freebets". Mets quand même le vrai montant du freebet dans "stake".
- "live" : true uniquement si un badge "Live" est visible sur le ticket.
- "result" : pour un ticket annulé/remboursé ("Annulé", "Player request"...), mets "result": "Remboursé" et utilise la cote D'ORIGINE (pas le "1,00" affiché après annulation) dans "odds".
- "En attente" : un ticket sans étiquette colorée "Gagné"/"Perdu"/"Annulé" (souvent marqué "En cours", ou sans étiquette du tout), ou un pari long terme pas encore résolu (vainqueur final d'un tournoi/classement général/champion national sur une compétition en cours), doit être classé "result": "En attente". Le "Gains" affiché à 0,00 € sur ce type de ticket ne signifie PAS une perte — capture quand même la mise et la cote normalement, juste sans résultat.
- "Cashé" (Cash Out / encaissement anticipé) : si le ticket indique explicitement un encaissement anticipé ("Cash Out", "Cashé", ou un montant "Gains" différent de la mise et différent du gain théorique mise×cote alors que le match n'est pas terminé), mets "result": "Cashé" et renseigne "cashOutAmount" avec le montant réellement encaissé (le "Gains" affiché sur ce ticket). Ne confonds pas avec un pari simplement gagné normalement.
- "Mymatch" ou paris combinant plusieurs sélections sur le même match : combine toutes les sélections visibles dans une seule "description", séparées par " + ", et utilise "betType": "Mymatch". Si le détail est masqué (ticket réduit), précise "(détail des sélections non affiché sur le screen)" dans la description.
- "Combiné" (plusieurs matchs différents) : garde le détail de chaque sélection (marché + résultat gagné/perdu) dans la description, avec la cote totale dans "odds".
- Ne devine jamais un ticket partiellement masqué ou coupé : ignore-le plutôt que d'inventer des valeurs.
- Renseigne toujours "ticketRef" quand une référence est visible sur le ticket (souvent en petit, en bas, format "Ref : XXXXXXXX") — c'est utilisé pour détecter les doublons entre captures. Si plusieurs tickets de CETTE réponse ont la même référence, ne les inclus qu'une seule fois.
- Si un marché ne correspond vraiment à aucun type existant : utilise "betType": "Autre" MAIS commence la "description" par "[Type suggéré : Nom du type]" suivi du reste de la description habituelle. Ça permet de repérer facilement ces cas dans l'app pour les valider et les ajouter à la liste plutôt que de les laisser en "Autre" silencieusement.`;
}

async function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result.split(",")[1]);
    reader.onerror = () => reject(new Error("Lecture du fichier impossible"));
    reader.readAsDataURL(file);
  });
}

async function extractBetsFromImages(files, onProgress) {
  const allBets = [];
  const failures = [];

  for (let i = 0; i < files.length; i++) {
    onProgress?.(i, files.length);
    const file = files[i];
    try {
      const base64Data = await fileToBase64(file);
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-6",
          max_tokens: 1000,
          messages: [
            {
              role: "user",
              content: [
                { type: "image", source: { type: "base64", media_type: file.type || "image/png", data: base64Data } },
                { type: "text", text: buildExtractionPrompt() },
              ],
            },
          ],
        }),
      });
      const data = await response.json();
      const textBlocks = (data.content || []).filter((b) => b.type === "text").map((b) => b.text).join("\n");
      const cleaned = textBlocks.replace(/```json|```/g, "").trim();
      const parsed = JSON.parse(cleaned);
      if (Array.isArray(parsed)) {
        parsed.forEach((b) => allBets.push({ ...b, _sourceFile: file.name }));
      }
    } catch (e) {
      failures.push(file.name);
    }
  }

  return { bets: allBets, failures };
}

// Filet de sécurité quand aucune référence de ticket n'est disponible : repère un pari qui ressemble
// fortement à un pari déjà connu (même date, mise et cote quasi identiques, description proche).
function looksLikeDuplicate(bet, otherBets) {
  return otherBets.some((o) => {
    if (o.id === bet.id) return false;
    if (o.date !== bet.date) return false;
    if (Math.abs((Number(o.stake) || 0) - (Number(bet.stake) || 0)) > 0.01) return false;
    if (Math.abs((Number(o.odds) || 0) - (Number(bet.odds) || 0)) > 0.01) return false;
    const a = (o.description || "").toString().trim().toLowerCase();
    const b = (bet.description || "").toString().trim().toLowerCase();
    if (!a || !b) return a === b;
    return a === b;
  });
}

function ScreenshotImport({ bankrolls, bets: existingBets, onImport }) {
  const [bankrollId, setBankrollId] = useState(bankrolls[0]?.id || "");
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(null);
  const [error, setError] = useState("");
  const [preview, setPreview] = useState(null);

  useEffect(() => {
    if (!bankrollId && bankrolls[0]) setBankrollId(bankrolls[0].id);
  }, [bankrolls]);

  const handleFiles = (fileList) => {
    const arr = Array.from(fileList).filter((f) => f.type.startsWith("image/"));
    setFiles(arr);
    setPreview(null);
    setError("");
  };

  const handleExtract = async () => {
    if (files.length === 0) { setError("Choisis au moins une image."); return; }
    if (!bankrollId) { setError("Sélectionne d'abord une bankroll."); return; }
    setLoading(true);
    setError("");
    setPreview(null);
    try {
      const { bets: rawBets, failures } = await extractBetsFromImages(files, (i, total) => setProgress({ i: i + 1, total }));
      if (rawBets.length === 0) {
        setError(failures.length > 0
          ? `Aucun pari extrait. ${failures.length} image(s) en échec — réessaie ou vérifie que la capture montre bien un ticket de pari.`
          : "Aucun pari détecté sur ces images.");
        setLoading(false);
        return;
      }

      // Dedup by ticket reference: against bets already in the app, and within this batch itself.
      // If a bet was already imported as "En attente" and this screen now shows a settled result, update it instead of skipping.
      const existingByRef = {};
      (existingBets || []).forEach((eb) => { if (eb.ticketRef) existingByRef[eb.ticketRef] = eb; });
      const seenInBatch = new Set();
      let duplicateCount = 0;

      const bets = [];
      const updates = [];
      rawBets.forEach((b) => {
        const ref = (b.ticketRef || "").toString().trim() || null;
        const result = RESULTS.includes(b.result) ? b.result : "En attente";
        const existing = ref ? existingByRef[ref] : null;

        if (existing && existing.result === "En attente" && result !== "En attente") {
          updates.push({
            id: existing.id,
            patch: {
              result,
              odds: Number(b.odds) || existing.odds,
              stake: Number(b.stake) || existing.stake,
              boosted: !!b.boosted,
              originalOdds: b.originalOdds ? Number(b.originalOdds) : existing.originalOdds,
              freebet: !!b.freebet,
              live: !!b.live,
              description: (b.description || existing.description || "").toString(),
              cashOutAmount: result === "Cashé" ? (Number(b.cashOutAmount) || 0) : null,
            },
          });
          return;
        }

        if (ref && (existingByRef[ref] || seenInBatch.has(ref))) {
          duplicateCount += 1;
          return;
        }
        if (ref) seenInBatch.add(ref);
        const newBet = {
          id: uid(),
          bankrollId,
          ticketRef: ref,
          date: b.date || new Date().toISOString().slice(0, 10),
          sport: (b.sport || "Autre sport").toString(),
          betType: (b.betType || "Autre").toString(),
          description: (b.description || "").toString(),
          stake: Number(b.stake) || 0,
          odds: Number(b.odds) || 0,
          boosted: !!b.boosted,
          originalOdds: b.originalOdds ? Number(b.originalOdds) : null,
          freebet: !!b.freebet,
          live: !!b.live,
          result,
          cashOutAmount: result === "Cashé" ? (Number(b.cashOutAmount) || 0) : null,
        };
        // Sans référence, filet de sécurité : signale (sans exclure) un pari qui ressemble fortement à un pari déjà présent
        if (!ref && (looksLikeDuplicate(newBet, existingBets || []) || looksLikeDuplicate(newBet, bets))) {
          newBet.possibleDuplicate = true;
        }
        bets.push(newBet);
      });

      if (bets.length === 0 && updates.length === 0) {
        setError(`Les ${duplicateCount} pari(s) détecté(s) sont tous des doublons déjà importés (référence identique).`);
        setLoading(false);
        return;
      }

      setPreview({ bets, updates, failures, duplicateCount });
    } catch (e) {
      setError("Erreur pendant l'extraction : " + e.message);
    }
    setLoading(false);
    setProgress(null);
  };

  const handleConfirm = () => {
    if (!preview) return;
    onImport(preview.bets, [], preview.updates || []);
    setPreview(null);
    setFiles([]);
  };

  const updateBetField = (index, field, value) => {
    setPreview((prev) => {
      const bets = [...prev.bets];
      bets[index] = { ...bets[index], [field]: value };
      return { ...prev, bets };
    });
  };

  const removeBet = (index) => {
    setPreview((prev) => {
      const bets = prev.bets.filter((_, i) => i !== index);
      return { ...prev, bets };
    });
  };

  if (bankrolls.length === 0) {
    return <p className="text-zinc-500 text-sm">Crée d'abord une bankroll dans l'onglet "Bankrolls".</p>;
  }

  return (
    <div className="max-w-2xl space-y-4">
      <Card className="p-4">
        <h3 className="text-sm font-semibold text-zinc-300 mb-2 flex items-center gap-1.5"><ImagePlus size={15} /> Importer depuis des captures d'écran</h3>
        <p className="text-xs text-zinc-500 mb-3">
          Choisis les screens de tickets de paris (une ou plusieurs images à la fois). Une IA lit chaque image et en extrait les paris automatiquement — y compris les paris "en cours" (pas encore réglés, utile pour le long terme). Si tu rescannes plus tard un ticket déjà importé en attente et qu'il est désormais réglé, son résultat est mis à jour automatiquement plutôt que dupliqué.
        </p>
        <div>
          <Label>Bankroll de destination</Label>
          <Select value={bankrollId} onChange={(e) => setBankrollId(e.target.value)}>
            {bankrolls.map((br) => <option key={br.id} value={br.id}>{br.name} ({br.bookmaker})</option>)}
          </Select>
        </div>

        <div className="mt-3">
          <Label>Captures d'écran</Label>
          <label className="flex flex-col items-center justify-center gap-2 border-2 border-dashed border-zinc-800 rounded-lg py-6 cursor-pointer hover:border-zinc-700 transition-colors">
            <ImagePlus size={22} className="text-zinc-600" />
            <span className="text-xs text-zinc-500">{files.length > 0 ? `${files.length} image(s) sélectionnée(s)` : "Clique pour choisir des images"}</span>
            <input type="file" accept="image/*" multiple className="hidden" onChange={(e) => handleFiles(e.target.files)} />
          </label>
        </div>

        {error && (
          <div className="mt-2 flex items-center gap-1.5 text-xs text-rose-400"><AlertCircle size={13} /> {error}</div>
        )}

        <div className="mt-3 flex gap-2">
          <button
            onClick={handleExtract}
            disabled={loading || files.length === 0}
            className="bg-zinc-800 hover:bg-zinc-700 disabled:opacity-40 disabled:cursor-not-allowed text-zinc-200 text-sm font-medium px-4 py-2 rounded-lg transition-colors flex items-center gap-1.5"
          >
            {loading ? (
              <>
                <Loader2 size={15} className="animate-spin" />
                {progress ? `Analyse ${progress.i}/${progress.total}...` : "Analyse en cours..."}
              </>
            ) : (
              <>Analyser les images</>
            )}
          </button>
          {preview && (
            <button
              onClick={handleConfirm}
              disabled={preview.bets.length === 0 && (!preview.updates || preview.updates.length === 0)}
              className="bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 disabled:cursor-not-allowed text-zinc-950 font-semibold text-sm px-4 py-2 rounded-lg transition-colors flex items-center gap-1.5"
            >
              <CheckCircle2 size={15} /> {preview.bets.length > 0 ? `Importer ${preview.bets.length} pari(s)` : "Confirmer"}{preview.updates?.length > 0 ? ` + ${preview.updates.length} mise(s) à jour` : ""}
            </button>
          )}
        </div>
      </Card>

      {preview && (
        <Card className="p-4">
          <div className="text-sm text-zinc-300 mb-2">{preview.bets.length} nouveau(x) pari(s) détecté(s) — vérifie avant de confirmer</div>
          {preview.updates?.length > 0 && (
            <div className="text-xs text-emerald-400 mb-2">{preview.updates.length} pari(s) "En attente" désormais réglé(s) — leur résultat sera mis à jour automatiquement (résultat déjà connu détecté sur cette capture).</div>
          )}
          {preview.duplicateCount > 0 && (
            <div className="text-xs text-sky-400 mb-2">{preview.duplicateCount} doublon(s) ignoré(s) automatiquement (référence déjà importée).</div>
          )}
          {preview.bets.some((b) => b.description.startsWith("[Type suggéré")) && (
            <div className="text-xs text-amber-400 mb-2 flex items-center gap-1.5"><AlertCircle size={12} /> Certains paris n'ont pas de type existant qui correspond bien — repère-les ci-dessous (préfixe "[Type suggéré...]") et dis-moi si tu veux l'ajouter à la liste.</div>
          )}
          {preview.bets.some((b) => b.possibleDuplicate) && (
            <div className="text-xs text-orange-400 mb-2 flex items-center gap-1.5"><AlertCircle size={12} /> Paris entourés en orange : pas de référence sur le ticket, mais date/mise/cote/description identiques à un pari déjà connu — vérifie qu'il ne s'agit pas d'un doublon avant de confirmer.</div>
          )}
          {preview.failures && preview.failures.length > 0 && (
            <div className="text-xs text-amber-400 mb-2">{preview.failures.length} image(s) n'ont pas pu être analysées : {preview.failures.join(", ")}</div>
          )}
          <div className="max-h-96 overflow-y-auto space-y-2">
            {preview.bets.map((b, i) => (
              <div key={b.id} className={`border rounded-lg p-2.5 bg-zinc-950/50 ${b.possibleDuplicate ? "border-orange-500/50" : "border-zinc-800"}`}>
                <div className="flex items-center gap-2 mb-1.5">
                  {b.possibleDuplicate && <AlertCircle size={13} className="text-orange-400 shrink-0" />}
                  <input
                    value={b.description}
                    onChange={(e) => updateBetField(i, "description", e.target.value)}
                    className={`flex-1 bg-transparent text-xs focus:outline-none focus:bg-zinc-900 rounded px-1 py-0.5 ${b.description.startsWith("[Type suggéré") ? "text-amber-400" : "text-zinc-300"}`}
                  />
                  <button onClick={() => removeBet(i)} title="Exclure ce pari" className="text-zinc-600 hover:text-rose-400 shrink-0">
                    <X size={14} />
                  </button>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <input
                    type="date"
                    value={b.date}
                    onChange={(e) => updateBetField(i, "date", e.target.value)}
                    className="bg-zinc-900 border border-zinc-800 rounded px-1.5 py-1 text-xs text-zinc-400 w-32"
                  />
                  <span className="text-xs text-zinc-500 w-16 truncate">{b.sport}</span>
                  {b.boosted && <Zap size={12} className="text-amber-400 shrink-0" />}
                  {b.freebet && <Gift size={12} className="text-fuchsia-400 shrink-0" />}
                  {b.live && <Radio size={12} className="text-sky-400 shrink-0" />}
                  <div className="flex items-center gap-1 ml-auto">
                    <input
                      type="number" step="0.01"
                      value={b.stake}
                      onChange={(e) => updateBetField(i, "stake", Number(e.target.value))}
                      className="bg-zinc-900 border border-zinc-800 rounded px-1.5 py-1 text-xs font-mono text-zinc-300 w-16 text-right"
                    />
                    <span className="text-xs text-zinc-600">€</span>
                  </div>
                  <input
                    type="number" step="0.01"
                    value={b.odds}
                    onChange={(e) => updateBetField(i, "odds", Number(e.target.value))}
                    className="bg-zinc-900 border border-zinc-800 rounded px-1.5 py-1 text-xs font-mono text-zinc-300 w-16 text-right"
                    title="Cote"
                  />
                  <select
                    value={b.result}
                    onChange={(e) => updateBetField(i, "result", e.target.value)}
                    className={`bg-zinc-900 border border-zinc-800 rounded px-1.5 py-1 text-xs w-24 ${RESULT_COLOR[b.result]}`}
                  >
                    {RESULTS.map((r) => <option key={r} value={r}>{r}</option>)}
                  </select>
                  {b.result === "Cashé" && (
                    <input
                      type="number" step="0.01"
                      value={b.cashOutAmount || ""}
                      onChange={(e) => updateBetField(i, "cashOutAmount", Number(e.target.value))}
                      placeholder="encaissé"
                      className="bg-zinc-900 border border-sky-500/40 rounded px-1.5 py-1 text-xs font-mono text-sky-400 w-20 text-right"
                    />
                  )}
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}


function ImportModeToggle({ mode, setMode }) {
  return (
    <div className="flex gap-1.5 mb-4">
      <button
        onClick={() => setMode("screenshot")}
        className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-medium transition-colors ${
          mode === "screenshot" ? "bg-emerald-500 text-zinc-950" : "bg-zinc-900 text-zinc-400 hover:text-zinc-200 border border-zinc-800"
        }`}
      >
        <ImagePlus size={14} /> Capture d'écran (IA)
      </button>
      <button
        onClick={() => setMode("json")}
        className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-medium transition-colors ${
          mode === "json" ? "bg-emerald-500 text-zinc-950" : "bg-zinc-900 text-zinc-400 hover:text-zinc-200 border border-zinc-800"
        }`}
      >
        <FileJson size={14} /> Coller du JSON
      </button>
    </div>
  );
}

function ImportTab({ bankrolls, bets, onImport }) {
  const [mode, setMode] = useState("screenshot");
  const [text, setText] = useState("");
  const [preview, setPreview] = useState(null);
  const [error, setError] = useState("");

  const handleParse = () => {
    setError("");
    setPreview(null);
    if (!text.trim()) { setError("Colle d'abord du JSON."); return; }
    const res = parseImportJson(text, bankrolls, bets);
    if (res.error) { setError(res.error); return; }
    setPreview(res);
  };

  const handleConfirm = () => {
    if (!preview) return;
    onImport(preview.bets, preview.newBankrolls, preview.updates || []);
    setText("");
    setPreview(null);
  };

  return (
    <div className="max-w-2xl">
      <ImportModeToggle mode={mode} setMode={setMode} />
      {mode === "screenshot" && <ScreenshotImport bankrolls={bankrolls} bets={bets} onImport={onImport} />}
      {mode === "json" && (
    <div className="space-y-4">
      <Card className="p-4">
        <h3 className="text-sm font-semibold text-zinc-300 mb-2 flex items-center gap-1.5"><Upload size={15} /> Importer des paris</h3>
        <p className="text-xs text-zinc-500 mb-3">
          Envoie tes screens de paris dans la conversation, Claude en extrait les infos et te génère le JSON correspondant.
          Colle-le ci-dessous. Les bookmakers inconnus créent automatiquement une nouvelle bankroll (capital de départ à 0,
          à ajuster ensuite dans l'onglet Bankrolls). Les champs <code className="text-zinc-400">freebet</code> et <code className="text-zinc-400">live</code> sont optionnels
          (par défaut <code className="text-zinc-400">false</code>) : un freebet perdu ne compte pas comme une perte réelle.
        </p>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={IMPORT_EXAMPLE}
          rows={10}
          className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs font-mono text-zinc-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50"
        />
        {error && (
          <div className="mt-2 flex items-center gap-1.5 text-xs text-rose-400"><AlertCircle size={13} /> {error}</div>
        )}
        <div className="mt-3 flex gap-2">
          <button onClick={handleParse} className="bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-sm font-medium px-4 py-2 rounded-lg transition-colors">
            Vérifier
          </button>
          {preview && (
            <button onClick={handleConfirm} className="bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-semibold text-sm px-4 py-2 rounded-lg transition-colors flex items-center gap-1.5">
              <CheckCircle2 size={15} /> Importer {preview.bets.length} pari(s){preview.updates?.length > 0 ? ` + ${preview.updates.length} mise(s) à jour` : ""}
            </button>
          )}
        </div>
      </Card>

      {preview && (
        <Card className="p-4">
          <div className="text-sm text-zinc-300 mb-2">
            {preview.bets.length} pari(s) prêts à importer
            {preview.newBankrolls.length > 0 && `, ${preview.newBankrolls.length} nouvelle(s) bankroll(s) : ${preview.newBankrolls.map((b) => b.bookmaker).join(", ")}`}
          </div>
          {preview.updates?.length > 0 && (
            <div className="text-xs text-emerald-400 mb-2">{preview.updates.length} pari(s) "En attente" désormais réglé(s) — leur résultat sera mis à jour automatiquement.</div>
          )}
          {preview.duplicateCount > 0 && (
            <div className="text-xs text-sky-400 mb-2">{preview.duplicateCount} doublon(s) ignoré(s) automatiquement (référence déjà importée).</div>
          )}
          {preview.bets.some((b) => b.possibleDuplicate) && (
            <div className="text-xs text-orange-400 mb-2 flex items-center gap-1.5"><AlertCircle size={12} /> Paris signalés en orange : pas de référence, mais date/mise/cote/description identiques à un pari déjà connu — vérifie avant d'importer.</div>
          )}
          {preview.warnings && preview.warnings.length > 0 && (
            <div className="text-xs text-amber-400 mb-2 space-y-0.5">
              {preview.warnings.map((w, i) => <div key={i}>{w}</div>)}
            </div>
          )}
          <div className="max-h-64 overflow-y-auto space-y-1.5">
            {preview.bets.map((b) => (
              <div key={b.id} className={`text-xs flex items-center gap-2 border-b pb-1.5 ${b.possibleDuplicate ? "text-orange-300 border-orange-500/30" : "text-zinc-400 border-zinc-900"}`}>
                {b.possibleDuplicate && <AlertCircle size={12} className="text-orange-400 shrink-0" />}
                <span className="text-zinc-600 w-20 shrink-0">{b.date}</span>
                <span className="w-20 shrink-0 truncate">{b.sport}</span>
                <span className="flex-1 truncate">{b.description || b.betType}</span>
                {b.boosted && <Zap size={12} className="text-amber-400 shrink-0" />}
                {b.freebet && <Gift size={12} className="text-fuchsia-400 shrink-0" />}
                {b.live && <Radio size={12} className="text-sky-400 shrink-0" />}
                <span className="font-mono w-16 text-right shrink-0">{Number(b.stake).toFixed(2)}€</span>
                <span className="font-mono w-14 text-right shrink-0">{Number(b.odds).toFixed(2)}</span>
                <span className={`w-16 text-right shrink-0 ${RESULT_COLOR[b.result]}`}>{b.result}</span>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
      )}
    </div>
  );
}

// ---------- App ----------

const TABS = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "add", label: "Ajouter un pari", icon: Plus },
  { id: "import", label: "Importer", icon: Upload },
  { id: "history", label: "Historique", icon: HistoryIcon },
  { id: "stats", label: "Statistiques", icon: BarChart3 },
  { id: "bankrolls", label: "Bankrolls", icon: Wallet },
];

export default function App() {
  const [tab, setTab] = useState("dashboard");
  const [bankrolls, setBankrolls] = useState([]);
  const [bets, setBets] = useState([]);
  const [goals, setGoals] = useState({ monthlyProfitGoal: 0, monthlyLossLimit: 0 });
  const [insights, setInsights] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingBankroll, setEditingBankroll] = useState(null);

  useEffect(() => {
    loadData().then((d) => {
      setBankrolls(d.bankrolls || []);
      setBets(d.bets || []);
      setGoals(d.goals || { monthlyProfitGoal: 0, monthlyLossLimit: 0 });
      setInsights(d.insights || null);
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    if (!loading) saveData({ bankrolls, bets, goals, insights });
  }, [bankrolls, bets, goals, insights, loading]);

  const updateGoals = (g) => setGoals(g);
  const updateInsights = (i) => setInsights(i);

  const exportData = () => {
    const payload = { bankrolls, bets, goals, insights, exportedAt: new Date().toISOString() };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `bankroll-tracker-export-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const addBankroll = (br) => setBankrolls((prev) => [...prev, br]);
  const updateBankroll = (br) => setBankrolls((prev) => prev.map((b) => (b.id === br.id ? br : b)));
  const saveBankroll = (br) => {
    if (editingBankroll) updateBankroll(br);
    else addBankroll(br);
  };
  const openNewBankrollModal = () => { setEditingBankroll(null); setShowModal(true); };
  const openEditBankrollModal = (br) => { setEditingBankroll(br); setShowModal(true); };
  const deleteBankroll = (id) => {
    setBankrolls((prev) => prev.filter((b) => b.id !== id));
    setBets((prev) => prev.filter((b) => b.bankrollId !== id));
  };
  const addBet = (bet) => setBets((prev) => [...prev, bet]);
  const deleteBet = (id) => setBets((prev) => prev.filter((b) => b.id !== id));
  const deleteManyBets = (ids) => {
    const idSet = new Set(ids);
    setBets((prev) => prev.filter((b) => !idSet.has(b.id)));
  };
  const updateResult = (id, result) => setBets((prev) => prev.map((b) => (b.id === id ? { ...b, result } : b)));
  const importBets = (newBets, newBankrolls, updates) => {
    if (newBankrolls && newBankrolls.length > 0) setBankrolls((prev) => [...prev, ...newBankrolls]);
    setBets((prev) => {
      let next = prev;
      if (updates && updates.length > 0) {
        const patchById = new Map(updates.map((u) => [u.id, u.patch]));
        next = next.map((b) => (patchById.has(b.id) ? { ...b, ...patchById.get(b.id) } : b));
      }
      return [...next, ...newBets];
    });
  };

  if (loading) {
    return <div className="min-h-screen bg-zinc-950 flex items-center justify-center text-zinc-500 text-sm">Chargement...</div>;
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 font-sans">
      <div className="max-w-5xl mx-auto px-4 py-6">
        <div className="flex items-center gap-2.5 mb-6">
          <div className="w-9 h-9 rounded-lg bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center">
            <TrendingUp size={18} className="text-emerald-400" />
          </div>
          <div>
            <h1 className="font-bold text-lg leading-none">BankTrack</h1>
            <p className="text-xs text-zinc-500 mt-0.5">Suivi de bankroll paris sportifs</p>
          </div>
        </div>

        <div className="flex gap-1.5 mb-6 overflow-x-auto pb-1">
          {TABS.map((t) => {
            const Icon = t.icon;
            const active = tab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                  active ? "bg-emerald-500 text-zinc-950" : "bg-zinc-900 text-zinc-400 hover:text-zinc-200 border border-zinc-800"
                }`}
              >
                <Icon size={15} /> {t.label}
              </button>
            );
          })}
        </div>

        {tab === "dashboard" && <Dashboard bankrolls={bankrolls} bets={bets} goals={goals} onUpdateGoals={updateGoals} onNewBankroll={openNewBankrollModal} />}
        {tab === "add" && <AddBet bankrolls={bankrolls} onAdd={addBet} />}
        {tab === "import" && <ImportTab bankrolls={bankrolls} bets={bets} onImport={importBets} />}
        {tab === "history" && <HistoryTab bets={bets} bankrolls={bankrolls} onDelete={deleteBet} onDeleteMany={deleteManyBets} onUpdateResult={updateResult} />}
        {tab === "stats" && <StatsTab bets={bets} bankrolls={bankrolls} insights={insights} onUpdateInsights={updateInsights} />}
        {tab === "bankrolls" && <BankrollsTab bankrolls={bankrolls} bets={bets} onNew={openNewBankrollModal} onEdit={openEditBankrollModal} onDelete={deleteBankroll} onExport={exportData} />}

        <div className="mt-10 pt-4 border-t border-zinc-900 text-center text-xs text-zinc-600">
          Jouer comporte des risques : endettement, isolement, dépendance.{" "}
          <a href="https://www.joueurs-info-service.fr" target="_blank" rel="noopener noreferrer" className="text-zinc-500 hover:text-zinc-300 underline">
            joueurs-info-service.fr
          </a>{" "}
          — 09 74 75 13 13 (appel non surtaxé)
        </div>
      </div>

      {showModal && (
        <BankrollModal
          onClose={() => { setShowModal(false); setEditingBankroll(null); }}
          onSave={saveBankroll}
          editingBankroll={editingBankroll}
        />
      )}
    </div>
  );
}
