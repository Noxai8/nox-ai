import { useEffect, useRef, useState } from "react";
import { createClient, type Session } from "@supabase/supabase-js";

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL as string,
  import.meta.env.VITE_SUPABASE_ANON_KEY as string,
);

// =====================================================================
// Helpers
// =====================================================================
const DAYS = ["LUN", "MAR", "MER", "JEU", "VEN", "SAM", "DIM"];
const todayISO = () => new Date().toISOString().slice(0, 10);
const epley = (w: number, r: number) => Math.round(w * (1 + r / 30) * 10) / 10;

function Logo({ big }: { big?: boolean }) {
  return (
    <div className="flex items-center gap-2">
      <div className="nox-gradient" style={{ width: big ? 40 : 26, height: big ? 40 : 26, borderRadius: 10 }} />
      <span className={`font-display font-bold nox-gradient-text ${big ? "text-3xl" : "text-xl"}`}>NOX</span>
    </div>
  );
}

function Field(p: { label: string; value: string; onChange: (v: string) => void; type?: string; placeholder?: string }) {
  return (
    <label className="block mb-3">
      <span className="block text-sm mb-1 text-white/70">{p.label}</span>
      <input className="nox-input" type={p.type ?? "text"} value={p.value} placeholder={p.placeholder}
        onChange={(e) => p.onChange(e.target.value)} />
    </label>
  );
}

function Choice(p: { options: { v: string; l: string }[]; value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex flex-col gap-2">
      {p.options.map((o) => (
        <button key={o.v}
          className="text-left p-3 rounded-xl border transition"
          style={{
            background: p.value === o.v ? "rgba(124,92,255,0.15)" : "#0f0f18",
            borderColor: p.value === o.v ? "#7c5cff" : "#262636",
          }}
          onClick={() => p.onChange(o.v)}>
          {o.l}
        </button>
      ))}
    </div>
  );
}

// =====================================================================
// AUTH (landing + form)
// =====================================================================
function Auth() {
  const [screen, setScreen] = useState<"landing" | "form">("landing");
  const [mode, setMode] = useState<"signin" | "signup">("signup");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit() {
    setLoading(true); setMsg("");
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        setMsg("Compte créé ! Connecte-toi.");
        setMode("signin");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
    } catch (e: any) { setMsg(e.message ?? "Erreur"); }
    finally { setLoading(false); }
  }

  if (screen === "landing") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center">
        <Logo big />
        <h1 className="font-display text-3xl font-bold mt-8 mb-3 leading-tight">
          DEVIENS LA VERSION<br />DE TOI QUE TU VEUX<br /><span className="nox-gradient-text">CONSTRUIRE.</span>
        </h1>
        <p className="text-white/50 mb-10">Ton système personnel de transformation physique.</p>
        <button className="nox-btn nox-gradient w-full max-w-xs mb-3"
          onClick={() => { setMode("signup"); setScreen("form"); }}>COMMENCER</button>
        <button className="nox-btn w-full max-w-xs" style={{ background: "#262636" }}
          onClick={() => { setMode("signin"); setScreen("form"); }}>J'AI DÉJÀ UN COMPTE</button>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="nox-card p-6 w-full max-w-sm">
        <div className="mb-6 flex justify-center"><Logo /></div>
        <h1 className="text-2xl font-bold mb-6 text-center">{mode === "signin" ? "Connexion" : "Créer un compte"}</h1>
        <Field label="Email" value={email} onChange={setEmail} type="email" placeholder="toi@email.com" />
        <Field label="Mot de passe" value={password} onChange={setPassword} type="password" placeholder="••••••••" />
        <button className="nox-btn nox-gradient w-full mt-2" onClick={submit} disabled={loading}>
          {loading ? "..." : mode === "signin" ? "Se connecter" : "S'inscrire"}
        </button>
        {msg && <p className="text-sm mt-3 text-center text-cyan-300">{msg}</p>}
        <button className="text-sm text-white/60 w-full mt-4 underline"
          onClick={() => setMode(mode === "signin" ? "signup" : "signin")}>
          {mode === "signin" ? "Pas de compte ? Inscris-toi" : "Déjà un compte ? Connecte-toi"}
        </button>
      </div>
    </div>
  );
}

// =====================================================================
// ONBOARDING
// =====================================================================
function Onboarding({ userId, onDone }: { userId: string; onDone: () => void }) {
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  const [goalType, setGoalType] = useState("perte_gras");
  const [motivation, setMotivation] = useState("");
  const [name, setName] = useState("");
  const [sex, setSex] = useState("homme");
  const [age, setAge] = useState("");
  const [height, setHeight] = useState("");
  const [weight, setWeight] = useState("");
  const [experience, setExperience] = useState("debutant");
  const [seniority, setSeniority] = useState("moins_6m");
  const [location, setLocation] = useState("salle");
  const [equipment, setEquipment] = useState<string[]>([]);
  const [perWeek, setPerWeek] = useState("4");
  const [sessionLen, setSessionLen] = useState("60");
  const [days, setDays] = useState<number[]>([1, 2, 4, 6]);
  const [diet, setDiet] = useState("plutot_correcte");
  const [calories, setCalories] = useState("");
  const [protein, setProtein] = useState("");
  const [sport, setSport] = useState("");
  const [targetWeight, setTargetWeight] = useState("");
  const [targetDate, setTargetDate] = useState("");

  const EQUIP = ["Barre", "Haltères", "Banc", "Rack", "Disques", "Câbles", "Machines", "Kettlebells", "Élastiques", "Cardio", "Poids du corps"];
  const toggle = <T,>(arr: T[], v: T) => (arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);

  // ---- Goal Safety Engine (déterministe) ----
  const safety = (() => {
    const cur = Number(weight), tgt = Number(targetWeight);
    if (!cur || !tgt || !targetDate) return { level: "none", text: "Pas d'objectif de poids précis — trajectoire libre." };
    const weeks = Math.max(1, (new Date(targetDate).getTime() - Date.now()) / (7 * 864e5));
    const delta = Math.abs(cur - tgt);
    const loss = tgt < cur;
    const ratePerWeek = delta / weeks;
    let level: string, suggest = "";
    if (loss) {
      const pct = (ratePerWeek / cur) * 100;
      level = pct <= 0.75 ? "green" : pct <= 1.25 ? "orange" : "red";
      if (level === "red") {
        const safeWeeks = delta / (0.0075 * cur);
        const d = new Date(Date.now() + safeWeeks * 7 * 864e5);
        suggest = ` Date plus sûre : ~${d.toISOString().slice(0, 10)}.`;
      }
    } else {
      level = ratePerWeek <= 0.25 ? "green" : ratePerWeek <= 0.5 ? "orange" : "red";
      if (level === "red") {
        const safeWeeks = delta / 0.25;
        const d = new Date(Date.now() + safeWeeks * 7 * 864e5);
        suggest = ` Date plus sûre : ~${d.toISOString().slice(0, 10)}.`;
      }
    }
    const txt = level === "green" ? "🟢 OBJECTIF RÉALISTE — la trajectoire paraît raisonnable."
      : level === "orange" ? "🟠 OBJECTIF AMBITIEUX — trajectoire agressive, restons prudents."
      : "🔴 OBJECTIF À AJUSTER — ce délai n'est pas recommandé." + suggest;
    return { level, text: txt };
  })();

  async function finish() {
    setSaving(true); setErr("");
    try {
      await supabase.from("profiles").update({
        display_name: name, sex, height_cm: height ? Number(height) : null,
        starting_weight_kg: weight ? Number(weight) : null, experience_level: experience,
        training_experience: seniority, training_location: location, equipment,
        available_days: days, session_length_min: Number(sessionLen), motivation,
        diet_description: diet, onboarding_completed: true,
      }).eq("id", userId);

      await supabase.from("goals").insert({
        user_id: userId, goal_type: goalType, goal_reason: motivation || null,
        target_weight_kg: targetWeight ? Number(targetWeight) : null,
        target_date: targetDate || null, days_per_week: Number(perWeek), is_active: true,
      });

      if (sport.trim()) await supabase.from("user_sports").insert({ user_id: userId, sport: sport.trim() });
      if (calories || protein) await supabase.from("nutrition_targets").insert({
        user_id: userId, calories: calories ? Number(calories) : null,
        protein_g: protein ? Number(protein) : null, is_active: true,
      });
      localStorage.setItem("nox_days_per_week", perWeek);
      onDone();
    } catch (e: any) { setErr(e.message ?? "Erreur"); }
    finally { setSaving(false); }
  }

  const steps: { title: string; body: any }[] = [
    { title: "CONSTRUISONS TON NOX", body:
      <p className="text-white/60">Pour construire ton plan, NOX doit comprendre ton corps, ton objectif et ton mode de vie. ≈ 3 minutes.</p> },
    { title: "Ton objectif principal", body:
      <Choice value={goalType} onChange={setGoalType} options={[
        { v: "perte_gras", l: "Perdre du gras" }, { v: "prise_muscle", l: "Prendre du muscle" },
        { v: "recomposition", l: "Recomposition corporelle" }, { v: "force", l: "Devenir plus fort" },
        { v: "performance", l: "Améliorer mes performances" }, { v: "maintien", l: "Maintenir mon physique" }]} /> },
    { title: "Pourquoi ? (facultatif)", body:
      <Field label="Ta motivation" value={motivation} onChange={setMotivation} placeholder="Me sentir mieux, un événement..." /> },
    { title: "Ton profil", body: <>
      <Field label="Prénom" value={name} onChange={setName} />
      <label className="block mb-3"><span className="block text-sm mb-1 text-white/70">Sexe biologique (pour les estimations)</span>
        <select className="nox-input" value={sex} onChange={(e) => setSex(e.target.value)}>
          <option value="homme">Homme</option><option value="femme">Femme</option><option value="autre">Autre</option></select></label>
      <Field label="Âge" value={age} onChange={setAge} type="number" />
      <Field label="Taille (cm)" value={height} onChange={setHeight} type="number" />
      <Field label="Poids actuel (kg)" value={weight} onChange={setWeight} type="number" /></> },
    { title: "Ton niveau", body: <>
      <Choice value={experience} onChange={setExperience} options={[
        { v: "debutant", l: "Débutant" }, { v: "intermediaire", l: "Intermédiaire" }, { v: "avance", l: "Avancé" }]} />
      <div className="h-3" />
      <label className="block"><span className="block text-sm mb-1 text-white/70">Depuis combien de temps ?</span>
        <select className="nox-input" value={seniority} onChange={(e) => setSeniority(e.target.value)}>
          <option value="jamais">Jamais</option><option value="moins_6m">Moins de 6 mois</option>
          <option value="6m_2a">6 mois à 2 ans</option><option value="2a_5a">2 à 5 ans</option>
          <option value="5a_plus">5 ans et +</option></select></label></> },
    { title: "Où t'entraînes-tu ?", body:
      <Choice value={location} onChange={setLocation} options={[
        { v: "salle", l: "Salle" }, { v: "maison", l: "Maison" }, { v: "exterieur", l: "Extérieur" },
        { v: "plusieurs", l: "Plusieurs lieux" }]} /> },
    { title: "Matériel disponible", body:
      <div className="flex flex-wrap gap-2">{EQUIP.map((e) => (
        <button key={e} onClick={() => setEquipment((p) => toggle(p, e))}
          className="px-3 py-2 rounded-full text-sm border"
          style={{ background: equipment.includes(e) ? "rgba(124,92,255,0.2)" : "#0f0f18",
            borderColor: equipment.includes(e) ? "#7c5cff" : "#262636" }}>{e}</button>))}</div> },
    { title: "Tes disponibilités", body: <>
      <label className="block mb-3"><span className="block text-sm mb-1 text-white/70">Séances par semaine</span>
        <select className="nox-input" value={perWeek} onChange={(e) => setPerWeek(e.target.value)}>
          {[2,3,4,5,6].map((n) => <option key={n} value={n}>{n}</option>)}</select></label>
      <label className="block"><span className="block text-sm mb-1 text-white/70">Durée d'une séance (min)</span>
        <select className="nox-input" value={sessionLen} onChange={(e) => setSessionLen(e.target.value)}>
          {[30,45,60,75,90].map((n) => <option key={n} value={n}>{n}</option>)}</select></label></> },
    { title: "Tes jours d'entraînement", body:
      <div className="flex flex-wrap gap-2">{DAYS.map((d, i) => (
        <button key={d} onClick={() => setDays((p) => toggle(p, i + 1))}
          className="px-4 py-3 rounded-xl text-sm border"
          style={{ background: days.includes(i + 1) ? "rgba(47,217,255,0.15)" : "#0f0f18",
            borderColor: days.includes(i + 1) ? "#2fd9ff" : "#262636" }}>{d}</button>))}</div> },
    { title: "Nutrition & sport", body: <>
      <label className="block mb-3"><span className="block text-sm mb-1 text-white/70">Ton alimentation aujourd'hui</span>
        <select className="nox-input" value={diet} onChange={(e) => setDiet(e.target.value)}>
          <option value="structuree">Très structurée</option><option value="plutot_correcte">Plutôt correcte</option>
          <option value="irreguliere">Irrégulière</option><option value="je_sais_pas">Je ne sais pas trop</option></select></label>
      <Field label="Un sport pratiqué (optionnel)" value={sport} onChange={setSport} placeholder="foot, boxe, course..." />
      <Field label="Calories visées/jour (optionnel)" value={calories} onChange={setCalories} type="number" />
      <Field label="Protéines visées/jour g (optionnel)" value={protein} onChange={setProtein} type="number" /></> },
    { title: "Ta date cible", body: <>
      <Field label="Poids cible kg (optionnel)" value={targetWeight} onChange={setTargetWeight} type="number" />
      <Field label="Quand veux-tu l'atteindre ?" value={targetDate} onChange={setTargetDate} type="date" />
      <div className="nox-card p-3 mt-2 text-sm"
        style={{ borderColor: safety.level === "red" ? "#ff5c7c" : safety.level === "orange" ? "#ffb15c" : "#2fd9ff" }}>
        {safety.text}</div></> },
    { title: "TON OBJECTIF NOX", body: <div className="text-sm text-white/80 space-y-1">
      <p>Objectif : <b>{goalType}</b></p>
      <p>Poids : <b>{weight || "?"} kg</b>{targetWeight ? <> → <b>{targetWeight} kg</b></> : ""}</p>
      <p>Date cible : <b>{targetDate || "libre"}</b></p>
      <p>Séances : <b>{perWeek}/sem</b> · {sessionLen} min</p>
      <p>Jours : <b>{[...days].sort((a,b)=>a-b).map((d) => DAYS[d-1]).join(" ")}</b></p>
      <p>Niveau : <b>{experience}</b> · Lieu : <b>{location}</b></p>
      <div className="nox-card p-3 mt-2">{safety.text}</div></div> },
  ];

  const cur = steps[step];
  const isLast = step === steps.length - 1;
  const pct = ((step + 1) / steps.length) * 100;

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="nox-card p-6 w-full max-w-sm">
        <div className="mb-4 flex justify-between items-center"><Logo />
          <span className="text-xs text-white/40">{step + 1}/{steps.length}</span></div>
        <div className="h-1.5 rounded-full mb-5" style={{ background: "#262636" }}>
          <div className="h-1.5 rounded-full nox-gradient" style={{ width: `${pct}%` }} /></div>
        <h2 className="font-display text-xl font-bold mb-4">{cur.title}</h2>
        {cur.body}
        {err && <p className="text-sm text-red-400 mt-3">{err}</p>}
        <div className="flex gap-2 mt-6">
          {step > 0 && <button className="nox-btn flex-1" style={{ background: "#262636" }} onClick={() => setStep(step - 1)}>Retour</button>}
          {!isLast
            ? <button className="nox-btn nox-gradient flex-1" onClick={() => setStep(step + 1)}>Continuer</button>
            : <button className="nox-btn nox-gradient flex-1" onClick={finish} disabled={saving}>{saving ? "..." : "CONSTRUIRE MON PLAN"}</button>}
        </div>
      </div>
    </div>
  );
}

// =====================================================================
// PLAN BUILDER (animation + génération)
// =====================================================================
function PlanBuilder({ onDone }: { onDone: () => void }) {
  const [msg, setMsg] = useState("Analyse de ton objectif...");
  const [err, setErr] = useState("");
  const steps = ["Analyse de ton objectif...", "Construction de ton entraînement...",
    "Sélection des exercices...", "Calcul de ta progression...", "Estimation nutritionnelle..."];

  useEffect(() => {
    let i = 0;
    const t = setInterval(() => { i = Math.min(i + 1, steps.length - 1); setMsg(steps[i]); }, 1200);
    (async () => {
      try {
        const days = localStorage.getItem("nox_days_per_week") ?? "4";
        const { error } = await supabase.functions.invoke("training-engine", { body: { days_per_week: Number(days) } });
        if (error) throw error;
        clearInterval(t); onDone();
      } catch (e: any) { clearInterval(t); setErr("Erreur : " + (e.message ?? "génération impossible")); }
    })();
    return () => clearInterval(t);
  }, []);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center">
      <div className="nox-gradient mb-6" style={{ width: 56, height: 56, borderRadius: 16, animation: "pulse 1.2s infinite" }} />
      <Logo />
      {!err ? <p className="text-white/70 mt-6">{msg}</p>
        : <><p className="text-red-400 mt-6">{err}</p>
          <button className="nox-btn nox-gradient mt-4" onClick={onDone}>Continuer quand même</button></>}
      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}`}</style>
    </div>
  );
}

// =====================================================================
// SESSION PLAYER
// =====================================================================
function SessionPlayer({ workout, profile, onExit }: { workout: any; profile: any; onExit: () => void }) {
  const [exos, setExos] = useState<any[]>([]);
  const [idx, setIdx] = useState(0);
  const [wkg, setWkg] = useState("");
  const [reps, setReps] = useState("");
  const [rest, setRest] = useState(0);
  const [pr, setPr] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [logged, setLogged] = useState<any[]>([]);
  const [prev, setPrev] = useState<any[]>([]);

  useEffect(() => {
    supabase.from("workout_exercises").select("*").eq("workout_id", workout.id)
      .order("order_index", { ascending: true }).then(({ data }) => setExos(data ?? []));
  }, [workout.id]);

  const exo = exos[idx];

  useEffect(() => {
    if (!exo) return;
    supabase.from("exercise_logs").select("*").eq("workout_exercise_id", exo.id)
      .order("logged_at", { ascending: false }).limit(5).then(({ data }) => setPrev(data ?? []));
  }, [exo?.id]);

  useEffect(() => {
    if (rest <= 0) return;
    const t = setTimeout(() => setRest((r) => r - 1), 1000);
    return () => clearTimeout(t);
  }, [rest]);

  async function validate() {
    if (!exo) return;
    const W = Number(wkg), R = Number(reps);
    const setNum = logged.filter((l) => l.exId === exo.id).length + 1;
    await supabase.from("exercise_logs").insert({
      user_id: profile.id, workout_exercise_id: exo.id, set_number: setNum,
      reps: R || null, weight_kg: W || null,
    });
    setLogged((l) => [...l, { exId: exo.id, W, R }]);

    if (W && R) {
      const e1 = epley(W, R);
      const { data: best } = await supabase.from("personal_records").select("value")
        .eq("exercise_name", exo.exercise_name).eq("record_type", "1rm")
        .order("value", { ascending: false }).limit(1).maybeSingle();
      if (!best || e1 > Number(best.value)) {
        await supabase.from("personal_records").insert({
          user_id: profile.id, exercise_name: exo.exercise_name, record_type: "1rm",
          value: e1, unit: "kg",
        });
        setPr(`🏆 NOUVEAU RECORD — ${exo.exercise_name} · 1RM estimé ${e1} kg`);
        setTimeout(() => setPr(null), 4000);
      }
    }
    setRest(exo.rest_seconds || 90);
    setWkg(""); setReps("");
  }

  async function finishSession() {
    await supabase.from("workouts").update({ status: "completed" }).eq("id", workout.id);
    const xpGain = 50 + logged.length * 5;
    await supabase.from("xp_transactions").insert({ user_id: profile.id, amount: xpGain, reason: "séance terminée" });
    const newXp = (profile.xp ?? 0) + xpGain;
    await supabase.from("profiles").update({
      xp: newXp, level: Math.floor(newXp / 500) + 1, streak_days: (profile.streak_days ?? 0) + 1,
    }).eq("id", profile.id);
    setDone(true);
  }

  if (done) {
    return (
      <div className="p-4 text-center">
        <h2 className="font-display text-2xl font-bold mt-6 mb-2">SÉANCE TERMINÉE 💪</h2>
        <p className="text-white/60 mb-6">{workout.name}</p>
        <div className="nox-card p-5 mb-4 flex justify-around">
          <div><div className="text-2xl font-bold nox-gradient-text">{exos.length}</div><div className="text-xs text-white/50">Exercices</div></div>
          <div><div className="text-2xl font-bold nox-gradient-text">{logged.length}</div><div className="text-xs text-white/50">Séries</div></div>
          <div><div className="text-2xl font-bold nox-gradient-text">+{50 + logged.length * 5}</div><div className="text-xs text-white/50">XP</div></div>
        </div>
        <button className="nox-btn nox-gradient w-full" onClick={onExit}>Retour à l'accueil</button>
      </div>
    );
  }

  if (!exo) return <div className="p-4"><p className="text-white/50">Chargement de la séance...</p>
    <button className="nox-btn mt-4" style={{ background: "#262636" }} onClick={onExit}>Retour</button></div>;

  return (
    <div className="p-4">
      {pr && <div className="nox-card p-3 mb-3 text-center" style={{ borderColor: "#2fd9ff" }}>{pr}</div>}
      <div className="flex justify-between items-center mb-1">
        <span className="text-xs text-white/40">Exercice {idx + 1}/{exos.length}</span>
        <button className="text-xs text-white/50 underline" onClick={onExit}>Quitter</button>
      </div>
      <h2 className="font-display text-2xl font-bold mb-1">{exo.exercise_name}</h2>
      <p className="text-white/60 mb-4">Objectif : {exo.sets ?? "?"} × {exo.reps ?? "?"} · repos {exo.rest_seconds ?? 90}s</p>

      {prev.length > 0 && (
        <div className="nox-card p-3 mb-4 text-sm text-white/60">
          <div className="mb-1 text-white/40">Dernières séries :</div>
          {prev.map((p) => <span key={p.id} className="mr-3">{p.weight_kg ?? "-"}×{p.reps ?? "-"}</span>)}
        </div>
      )}

      {rest > 0 && (
        <div className="nox-card p-4 mb-4 text-center" style={{ borderColor: "#7c5cff" }}>
          <div className="text-3xl font-bold nox-gradient-text">{rest}s</div>
          <div className="flex gap-2 justify-center mt-2">
            <button className="nox-btn text-sm" style={{ background: "#262636" }} onClick={() => setRest((r) => r + 15)}>+15s</button>
            <button className="nox-btn text-sm" style={{ background: "#262636" }} onClick={() => setRest(0)}>Passer</button>
          </div>
        </div>
      )}

      <div className="flex gap-2 mb-3">
        <label className="flex-1"><span className="block text-sm mb-1 text-white/70">Charge (kg)</span>
          <input className="nox-input" type="number" value={wkg} onChange={(e) => setWkg(e.target.value)} /></label>
        <label className="flex-1"><span className="block text-sm mb-1 text-white/70">Répétitions</span>
          <input className="nox-input" type="number" value={reps} onChange={(e) => setReps(e.target.value)} /></label>
      </div>
      <button className="nox-btn nox-gradient w-full mb-3" onClick={validate}>VALIDER LA SÉRIE</button>
      <p className="text-center text-sm text-white/40 mb-4">
        {logged.filter((l) => l.exId === exo.id).length} série(s) enregistrée(s)</p>

      <div className="flex gap-2">
        {idx < exos.length - 1
          ? <button className="nox-btn nox-gradient flex-1" onClick={() => { setIdx(idx + 1); setRest(0); }}>Exercice suivant →</button>
          : <button className="nox-btn nox-gradient flex-1" onClick={finishSession}>Terminer la séance</button>}
      </div>
    </div>
  );
}

// =====================================================================
// HOME
// =====================================================================
function Home({ profile, onStart }: { profile: any; onStart: (w: any) => void }) {
  const [today, setToday] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [building, setBuilding] = useState(false);

  async function load() {
    setLoading(true);
    const { data } = await supabase.from("workouts").select("*, workout_exercises(count)")
      .eq("scheduled_date", todayISO()).limit(1).maybeSingle();
    setToday(data); setLoading(false);
  }
  useEffect(() => { load(); }, []);

  if (building) return <PlanBuilder onDone={() => { setBuilding(false); load(); }} />;

  const exCount = today?.workout_exercises?.[0]?.count ?? 0;

  return (
    <div>
      <div className="nox-card p-5 mb-4">
        <p className="text-white/60 text-sm">Salut</p>
        <h2 className="font-display text-2xl font-bold mb-3">{profile?.display_name || "Champion"} 👋</h2>
        <div className="flex gap-5">
          <Stat label="Niveau" value={profile?.level ?? 1} />
          <Stat label="XP" value={profile?.xp ?? 0} />
          <Stat label="Série" value={`${profile?.streak_days ?? 0} j`} />
        </div>
      </div>

      {loading ? <p className="text-white/50">Chargement...</p>
        : today && today.workout_type !== "repos" ? (
          <div className="nox-card p-5 mb-4" style={{ borderColor: "#7c5cff" }}>
            <p className="text-xs text-white/40 mb-1">AUJOURD'HUI</p>
            <h3 className="font-display text-xl font-bold mb-1">{today.name || today.workout_type}</h3>
            <p className="text-white/60 text-sm mb-4">{today.duration_min ?? "—"} min · {exCount} exercices · {today.status === "completed" ? "✅ terminée" : "à faire"}</p>
            {today.status !== "completed"
              ? <button className="nox-btn nox-gradient w-full" onClick={() => onStart(today)}>COMMENCER LA SÉANCE</button>
              : <p className="text-center text-cyan-300 text-sm">Séance terminée, bravo 🎉</p>}
          </div>
        ) : today && today.workout_type === "repos" ? (
          <div className="nox-card p-5 mb-4">
            <p className="text-xs text-white/40 mb-1">AUJOURD'HUI</p>
            <h3 className="font-display text-xl font-bold mb-1">JOUR DE RÉCUPÉRATION</h3>
            <p className="text-white/60 text-sm">Repos, marche légère, bonne nutrition. On ne s'entraîne pas tous les jours.</p>
          </div>
        ) : (
          <div className="nox-card p-5 mb-4">
            <p className="text-white/60 text-sm mb-3">Aucune séance prévue aujourd'hui. Génère ou régénère ton programme.</p>
            <button className="nox-btn nox-gradient w-full" onClick={() => setBuilding(true)}>CONSTRUIRE MON PLAN</button>
          </div>
        )}

      <button className="nox-card p-4 w-full text-left mb-3" onClick={() => setBuilding(true)}>
        <span className="font-semibold">🔄 Régénérer mon programme</span>
        <p className="text-white/50 text-sm">Recalcule la semaine complète.</p>
      </button>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: any }) {
  return <div><div className="text-xl font-bold nox-gradient-text">{value}</div><div className="text-xs text-white/50">{label}</div></div>;
}

// =====================================================================
// HISTORY
// =====================================================================
function History() {
  const [items, setItems] = useState<any[]>([]);
  const [prs, setPrs] = useState<any[]>([]);
  useEffect(() => {
    supabase.from("workouts").select("*").order("scheduled_date", { ascending: false }).limit(30)
      .then(({ data }) => setItems(data ?? []));
    supabase.from("personal_records").select("*").order("created_at", { ascending: false }).limit(10)
      .then(({ data }) => setPrs(data ?? []));
  }, []);
  return (
    <div>
      <h3 className="font-display text-lg font-bold mb-3">Tes records</h3>
      {prs.length === 0 ? <p className="text-white/50 text-sm mb-5">Pas encore de PR. Ça arrive vite 💪</p>
        : <div className="flex flex-col gap-2 mb-6">{prs.map((p) => (
          <div key={p.id} className="nox-card p-3 text-sm">🏆 <b>{p.exercise_name}</b> — 1RM estimé {p.value} {p.unit}</div>))}</div>}
      <h3 className="font-display text-lg font-bold mb-3">Historique des séances</h3>
      {items.length === 0 ? <p className="text-white/50 text-sm">Aucune séance pour l'instant.</p>
        : <div className="flex flex-col gap-2">{items.map((w) => (
          <div key={w.id} className="nox-card p-3 flex justify-between text-sm">
            <span>{w.name || w.workout_type}</span>
            <span className="text-white/40">{w.scheduled_date} · {w.status === "completed" ? "✅" : w.status}</span>
          </div>))}</div>}
    </div>
  );
}

// =====================================================================
// COACH
// =====================================================================
function Coach() {
  const [messages, setMessages] = useState<{ role: string; content: string }[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [convId, setConvId] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, loading]);

  async function send() {
    const text = input.trim(); if (!text || loading) return;
    setInput(""); setMessages((m) => [...m, { role: "user", content: text }]); setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("coach-engine", { body: { message: text, conversation_id: convId } });
      if (error) throw error;
      if (data?.conversation_id) setConvId(data.conversation_id);
      setMessages((m) => [...m, { role: "assistant", content: data?.reply ?? "..." }]);
    } catch (e: any) {
      setMessages((m) => [...m, { role: "assistant", content: "Erreur : " + (e.message ?? "réponse impossible") }]);
    } finally { setLoading(false); }
  }

  return (
    <div className="flex flex-col" style={{ height: "calc(100vh - 160px)" }}>
      <h3 className="font-display text-lg font-bold mb-3">Coach NOX</h3>
      <div className="flex-1 overflow-y-auto flex flex-col gap-3 pb-3">
        {messages.length === 0 && <div className="nox-card p-4 text-white/60 text-sm">
          "Je suis fatigué aujourd'hui", "Pourquoi je stagne ?", "Que manger après ma séance ?"...</div>}
        {messages.map((m, i) => (
          <div key={i} className="p-3 rounded-2xl max-w-[85%] text-sm whitespace-pre-wrap"
            style={m.role === "user" ? { alignSelf: "flex-end", background: "#7c5cff" }
              : { alignSelf: "flex-start", background: "#14141f", border: "1px solid #262636" }}>{m.content}</div>))}
        {loading && <div className="text-white/40 text-sm">NOX écrit...</div>}
        <div ref={endRef} />
      </div>
      <div className="flex gap-2 pt-2">
        <input className="nox-input" value={input} placeholder="Écris à ton coach..."
          onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && send()} />
        <button className="nox-btn nox-gradient" onClick={send} disabled={loading}>Envoyer</button>
      </div>
    </div>
  );
}

// =====================================================================
// APP
// =====================================================================
export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<any>(null);
  const [ready, setReady] = useState(false);
  const [justOnboarded, setJustOnboarded] = useState(false);
  const [tab, setTab] = useState<"home" | "history" | "coach">("home");
  const [activeWorkout, setActiveWorkout] = useState<any>(null);

  async function loadProfile(uid: string) {
    const { data } = await supabase.from("profiles").select("*").eq("id", uid).maybeSingle();
    setProfile(data);
  }

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      setSession(data.session);
      if (data.session) await loadProfile(data.session.user.id);
      setReady(true);
    });
    const { data: sub } = supabase.auth.onAuthStateChange(async (_e, s) => {
      setSession(s);
      if (s) await loadProfile(s.user.id); else setProfile(null);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  if (!import.meta.env.VITE_SUPABASE_URL)
    return <div className="min-h-screen flex items-center justify-center p-6 text-center text-white/70">
      Variables d'environnement manquantes (VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY) dans Vercel.</div>;

  if (!ready) return <div className="min-h-screen flex items-center justify-center text-white/50">Chargement...</div>;
  if (!session) return <Auth />;

  if (profile && !profile.onboarding_completed && !justOnboarded)
    return <Onboarding userId={session.user.id} onDone={async () => { setJustOnboarded(true); await loadProfile(session.user.id); }} />;

  if (justOnboarded)
    return <PlanBuilder onDone={async () => { setJustOnboarded(false); await loadProfile(session.user.id); }} />;

  if (activeWorkout)
    return <div className="max-w-md mx-auto"><SessionPlayer workout={activeWorkout} profile={profile}
      onExit={async () => { setActiveWorkout(null); await loadProfile(session.user.id); }} /></div>;

  return (
    <div className="max-w-md mx-auto p-4 pb-24">
      <header className="flex justify-between items-center mb-5">
        <Logo />
        <button className="text-sm text-white/50 underline" onClick={() => supabase.auth.signOut()}>Déconnexion</button>
      </header>

      {tab === "home" ? <Home profile={profile} onStart={setActiveWorkout} />
        : tab === "history" ? <History /> : <Coach />}

      <nav className="fixed bottom-0 left-0 right-0 flex justify-around p-3 border-t"
        style={{ background: "#0b0b12", borderColor: "#262636" }}>
        {([["home", "Accueil"], ["history", "Séances"], ["coach", "Coach"]] as const).map(([k, l]) => (
          <button key={k} className={tab === k ? "font-semibold nox-gradient-text" : "text-white/50"}
            onClick={() => setTab(k)}>{l}</button>))}
      </nav>
    </div>
  );
}
