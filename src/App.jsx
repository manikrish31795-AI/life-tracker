import React, { useState, useEffect, useMemo } from "react";
import { Wallet, HeartPulse, LayoutDashboard, Plus, Trash2, Droplet, Footprints, Utensils, Dumbbell, TrendingUp, TrendingDown, Lightbulb, MessageCircleMore } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, CartesianGrid, PieChart, Pie, Cell } from "recharts";

const CATEGORY_COLORS = {
  Food: "#D97757", Transport: "#4A90D9", Shopping: "#B968C7", Bills: "#E0A030",
  Health: "#3AA76D", Salary: "#2E7D32", Entertainment: "#E0555C", Other: "#8A8A8A",
};
const EXPENSE_CATEGORIES = ["Food", "Transport", "Shopping", "Bills", "Health", "Entertainment", "Other"];
const INCOME_CATEGORIES = ["Salary", "Other"];

const TIPS = [
  "Drink a glass of water right after waking up — it kickstarts your metabolism.",
  "Aim for at least 30 minutes of movement today, even a brisk walk counts.",
  "Add one extra vegetable to your next meal for a fiber boost.",
  "Try to finish dinner at least 2 hours before you sleep.",
  "Take a 2-minute stretch break every hour if you're at a desk.",
  "Swap one sugary drink today for water or unsweetened tea.",
  "Get 15 minutes of sunlight in the morning to help your sleep cycle.",
  "Track your spending today before it slips your mind.",
];

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}
function uid() {
  return Math.random().toString(36).slice(2, 10);
}
function formatINR(n) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n || 0);
}

export default function LifeTracker() {
  const [tab, setTab] = useState("overview");
  const [loading, setLoading] = useState(true);
  const [transactions, setTransactions] = useState([]);
  const [healthLogs, setHealthLogs] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    (async () => {
      try {
        try {
          const t = await window.storage.get("ft-transactions", false);
          setTransactions(t ? JSON.parse(t.value) : []);
        } catch { setTransactions([]); }
        try {
          const h = await window.storage.get("ft-health", false);
          setHealthLogs(h ? JSON.parse(h.value) : []);
        } catch { setHealthLogs([]); }
      } catch (e) {
        setError("Could not load saved data.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  async function saveTransactions(next) {
    setTransactions(next);
    try { await window.storage.set("ft-transactions", JSON.stringify(next), false); } catch {}
  }
  async function saveHealth(next) {
    setHealthLogs(next);
    try { await window.storage.set("ft-health", JSON.stringify(next), false); } catch {}
  }

  const totals = useMemo(() => {
    const credit = transactions.filter(t => t.type === "credit").reduce((s, t) => s + Number(t.amount), 0);
    const debit = transactions.filter(t => t.type === "debit").reduce((s, t) => s + Number(t.amount), 0);
    return { credit, debit, balance: credit - debit };
  }, [transactions]);

  const monthKey = todayStr().slice(0, 7);
  const monthTx = transactions.filter(t => t.date.slice(0, 7) === monthKey);
  const monthSpend = monthTx.filter(t => t.type === "debit").reduce((s, t) => s + Number(t.amount), 0);

  const categoryData = useMemo(() => {
    const map = {};
    monthTx.filter(t => t.type === "debit").forEach(t => {
      map[t.category] = (map[t.category] || 0) + Number(t.amount);
    });
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [monthTx]);

  const todayHealth = healthLogs.find(h => h.date === todayStr()) || { water: 0, steps: 0, weight: null, exercise: 0, meals: [] };

  const weightTrend = useMemo(() => {
    return healthLogs
      .filter(h => h.weight)
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(-14)
      .map(h => ({ date: h.date.slice(5), weight: Number(h.weight) }));
  }, [healthLogs]);

  const tipOfDay = TIPS[new Date().getDate() % TIPS.length];

  if (loading) {
    return <div className="p-8 text-gray-500 text-sm">Loading your tracker…</div>;
  }

  return (
    <div className="max-w-3xl mx-auto p-4 sm:p-6 font-sans text-gray-900">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Life Tracker</h1>
        <p className="text-sm text-gray-500 mt-1">Your finances and health, in one place. Data is saved on this device/account automatically.</p>
      </header>

      <nav className="flex gap-1 mb-6 border-b border-gray-200">
        {[
          { id: "overview", label: "Overview", icon: LayoutDashboard },
          { id: "finance", label: "Finance", icon: Wallet },
          { id: "health", label: "Health", icon: HeartPulse },
          { id: "tips", label: "Tips & Automation", icon: Lightbulb },
        ].map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`flex items-center gap-1.5 px-3 py-2 text-sm border-b-2 -mb-px transition-colors ${tab === id ? "border-gray-900 text-gray-900 font-medium" : "border-transparent text-gray-500 hover:text-gray-700"}`}
          >
            <Icon size={16} /> {label}
          </button>
        ))}
      </nav>

      {error && <div className="mb-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-3">{error}</div>}

      {tab === "overview" && (
        <Overview totals={totals} monthSpend={monthSpend} todayHealth={todayHealth} tipOfDay={tipOfDay} categoryData={categoryData} />
      )}

      {tab === "finance" && (
        <FinanceTab transactions={transactions} onAdd={(t) => saveTransactions([{ ...t, id: uid() }, ...transactions])} onDelete={(id) => saveTransactions(transactions.filter(t => t.id !== id))} categoryData={categoryData} />
      )}

      {tab === "health" && (
        <HealthTab healthLogs={healthLogs} onSave={(entry) => {
          const others = healthLogs.filter(h => h.date !== entry.date);
          saveHealth([entry, ...others]);
        }} weightTrend={weightTrend} />
      )}

      {tab === "tips" && <TipsTab />}
    </div>
  );
}

function StatCard({ label, value, icon: Icon, tone = "gray" }) {
  const tones = {
    gray: "bg-gray-50 text-gray-900",
    green: "bg-green-50 text-green-800",
    red: "bg-red-50 text-red-800",
    blue: "bg-blue-50 text-blue-800",
  };
  return (
    <div className={`rounded-xl p-4 ${tones[tone]}`}>
      <div className="flex items-center gap-2 text-xs opacity-70 mb-1">
        {Icon && <Icon size={14} />} {label}
      </div>
      <div className="text-xl font-semibold">{value}</div>
    </div>
  );
}

function Overview({ totals, monthSpend, todayHealth, tipOfDay, categoryData }) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard label="Balance" value={formatINR(totals.balance)} icon={Wallet} tone={totals.balance >= 0 ? "green" : "red"} />
        <StatCard label="This month spend" value={formatINR(monthSpend)} icon={TrendingDown} tone="red" />
        <StatCard label="Water today" value={`${todayHealth.water || 0} ml`} icon={Droplet} tone="blue" />
        <StatCard label="Exercise today" value={`${todayHealth.exercise || 0} min`} icon={Dumbbell} tone="green" />
      </div>

      <div className="rounded-xl border border-gray-200 p-4 flex items-start gap-3 bg-amber-50">
        <Lightbulb size={18} className="text-amber-600 mt-0.5 shrink-0" />
        <div>
          <div className="text-xs font-medium text-amber-800 mb-0.5">Today's health tip</div>
          <div className="text-sm text-amber-900">{tipOfDay}</div>
        </div>
      </div>

      {categoryData.length > 0 && (
        <div>
          <h3 className="text-sm font-medium text-gray-700 mb-2">Spend by category (this month)</h3>
          <div style={{ width: "100%", height: 220 }}>
            <ResponsiveContainer>
              <PieChart>
                <Pie data={categoryData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name }) => name}>
                  {categoryData.map((entry, i) => (
                    <Cell key={i} fill={CATEGORY_COLORS[entry.name] || "#999"} />
                  ))}
                </Pie>
                <Tooltip formatter={(v) => formatINR(v)} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
}

function FinanceTab({ transactions, onAdd, onDelete }) {
  const [form, setForm] = useState({ type: "debit", amount: "", category: "Food", note: "", date: todayStr() });

  function submit(e) {
    e.preventDefault();
    if (!form.amount || Number(form.amount) <= 0) return;
    onAdd({ ...form, amount: Number(form.amount) });
    setForm({ type: "debit", amount: "", category: "Food", note: "", date: todayStr() });
  }

  const cats = form.type === "debit" ? EXPENSE_CATEGORIES : INCOME_CATEGORIES;

  return (
    <div className="space-y-6">
      <form onSubmit={submit} className="rounded-xl border border-gray-200 p-4 space-y-3">
        <div className="flex gap-2">
          <button type="button" onClick={() => setForm(f => ({ ...f, type: "debit", category: "Food" }))}
            className={`flex-1 py-2 rounded-lg text-sm font-medium border ${form.type === "debit" ? "bg-red-50 border-red-300 text-red-700" : "border-gray-200 text-gray-500"}`}>
            Debit (money out)
          </button>
          <button type="button" onClick={() => setForm(f => ({ ...f, type: "credit", category: "Salary" }))}
            className={`flex-1 py-2 rounded-lg text-sm font-medium border ${form.type === "credit" ? "bg-green-50 border-green-300 text-green-700" : "border-gray-200 text-gray-500"}`}>
            Credit (money in)
          </button>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <input type="number" placeholder="Amount (₹)" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm" />
          <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm">
            {cats.map(c => <option key={c}>{c}</option>)}
          </select>
          <input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm" />
          <input type="text" placeholder="Note (optional)" value={form.note} onChange={e => setForm(f => ({ ...f, note: e.target.value }))}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm" />
        </div>
        <button type="submit" className="flex items-center gap-1.5 justify-center w-full bg-gray-900 text-white rounded-lg py-2 text-sm font-medium hover:bg-gray-800">
          <Plus size={16} /> Add transaction
        </button>
      </form>

      <div>
        <h3 className="text-sm font-medium text-gray-700 mb-2">Recent transactions</h3>
        {transactions.length === 0 && <p className="text-sm text-gray-400">No transactions yet. Add one above, or connect Gmail auto-import (see Tips & Automation tab).</p>}
        <ul className="divide-y divide-gray-100 border border-gray-200 rounded-xl overflow-hidden">
          {transactions.slice(0, 50).map(t => (
            <li key={t.id} className="flex items-center justify-between px-4 py-2.5 text-sm">
              <div className="flex items-center gap-2">
                {t.type === "credit" ? <TrendingUp size={15} className="text-green-600" /> : <TrendingDown size={15} className="text-red-600" />}
                <div>
                  <div className="font-medium">{t.category}{t.note ? ` · ${t.note}` : ""}</div>
                  <div className="text-xs text-gray-400">{t.date}{t.source === "gmail" ? " · from Gmail" : ""}</div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className={t.type === "credit" ? "text-green-700 font-medium" : "text-red-700 font-medium"}>
                  {t.type === "credit" ? "+" : "-"}{formatINR(t.amount)}
                </span>
                <button onClick={() => onDelete(t.id)} className="text-gray-300 hover:text-red-500">
                  <Trash2 size={15} />
                </button>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function HealthTab({ healthLogs, onSave, weightTrend }) {
  const existing = healthLogs.find(h => h.date === todayStr()) || {};
  const [water, setWater] = useState(existing.water || 0);
  const [steps, setSteps] = useState(existing.steps || 0);
  const [weight, setWeight] = useState(existing.weight || "");
  const [exercise, setExercise] = useState(existing.exercise || 0);
  const [mealName, setMealName] = useState("");
  const [meals, setMeals] = useState(existing.meals || []);

  function save(partial) {
    const entry = { date: todayStr(), water, steps, weight, exercise, meals, ...partial };
    onSave(entry);
  }

  function addMeal() {
    if (!mealName.trim()) return;
    const next = [...meals, mealName.trim()];
    setMeals(next);
    setMealName("");
    save({ meals: next });
  }

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-gray-200 p-4 space-y-4">
        <h3 className="text-sm font-medium text-gray-700">Today, {todayStr()}</h3>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs text-gray-500 flex items-center gap-1 mb-1"><Droplet size={13} /> Water (ml)</label>
            <input type="number" value={water} onChange={e => { setWater(e.target.value); }} onBlur={() => save({ water: Number(water) })}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm w-full" />
          </div>
          <div>
            <label className="text-xs text-gray-500 flex items-center gap-1 mb-1"><Footprints size={13} /> Steps</label>
            <input type="number" value={steps} onChange={e => setSteps(e.target.value)} onBlur={() => save({ steps: Number(steps) })}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm w-full" />
          </div>
          <div>
            <label className="text-xs text-gray-500 flex items-center gap-1 mb-1"><HeartPulse size={13} /> Weight (kg)</label>
            <input type="number" step="0.1" value={weight} onChange={e => setWeight(e.target.value)} onBlur={() => save({ weight: weight ? Number(weight) : null })}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm w-full" />
          </div>
          <div>
            <label className="text-xs text-gray-500 flex items-center gap-1 mb-1"><Dumbbell size={13} /> Exercise (min)</label>
            <input type="number" value={exercise} onChange={e => setExercise(e.target.value)} onBlur={() => save({ exercise: Number(exercise) })}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm w-full" />
          </div>
        </div>

        <div>
          <label className="text-xs text-gray-500 flex items-center gap-1 mb-1"><Utensils size={13} /> Meals today</label>
          <div className="flex gap-2">
            <input type="text" placeholder="e.g. Grilled chicken salad" value={mealName} onChange={e => setMealName(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm flex-1" />
            <button onClick={addMeal} className="px-3 py-2 bg-gray-900 text-white rounded-lg text-sm">Add</button>
          </div>
          {meals.length > 0 && (
            <ul className="mt-2 space-y-1">
              {meals.map((m, i) => <li key={i} className="text-sm text-gray-700">· {m}</li>)}
            </ul>
          )}
        </div>
      </div>

      {weightTrend.length > 1 && (
        <div>
          <h3 className="text-sm font-medium text-gray-700 mb-2">Weight trend</h3>
          <div style={{ width: "100%", height: 200 }}>
            <ResponsiveContainer>
              <LineChart data={weightTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
                <XAxis dataKey="date" fontSize={11} />
                <YAxis fontSize={11} domain={["auto", "auto"]} />
                <Tooltip />
                <Line type="monotone" dataKey="weight" stroke="#3AA76D" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
}

function TipsTab() {
  return (
    <div className="space-y-6 text-sm text-gray-700 leading-relaxed">
      <div className="rounded-xl border border-gray-200 p-4">
        <h3 className="font-medium text-gray-900 mb-2 flex items-center gap-2"><MessageCircleMore size={16} /> Daily WhatsApp health tips</h3>
        <p>This app can't send WhatsApp messages by itself — that needs a small automation outside this chat, using your own Twilio (or Meta WhatsApp Business) account. Ask me and I'll write you the script: it picks a tip and sends it to your WhatsApp number on a daily schedule.</p>
      </div>
      <div className="rounded-xl border border-gray-200 p-4">
        <h3 className="font-medium text-gray-900 mb-2 flex items-center gap-2"><Wallet size={16} /> Auto-import from Gmail</h3>
        <p>To pull debit/credit alerts from your Gmail automatically, you'll need a Google Apps Script (tied to your own Google account) that scans bank emails and logs them. Ask me and I'll write that script for you — you paste it into script.google.com under your account and run it on a trigger (e.g. every hour).</p>
      </div>
      <div className="rounded-xl border border-gray-200 p-4">
        <h3 className="font-medium text-gray-900 mb-2">Rotating tips</h3>
        <ul className="space-y-1.5">
          {TIPS.map((t, i) => <li key={i}>· {t}</li>)}
        </ul>
      </div>
    </div>
  );
}
