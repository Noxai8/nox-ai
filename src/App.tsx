import { useEffect, useRef, useState } from "react";
import { createClient, type Session } from "@supabase/supabase-js";

// =====================================================================
// Client Supabase
// =====================================================================
const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL as string,
  import.meta.env.VITE_SUPABASE_ANON_KEY as string,
);

// =====================================================================
// Petits composants UI
// =====================================================================
function Logo() {
  return (
    <div className="flex items-center gap-2">
      <div className="nox-gradient" style={{ width: 28, height: 28, borderRadius: 8 }} />
      <span className="font-display text-xl font-bold nox-gradient-text">nox.ai</span>
    </div>
  );
}

function Field(props: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
}) {
  return (
    <label className="block mb-3">
      <span className="block text-sm mb-1 text-white/70">{props.label}</span>
      <input
        className="nox-input"
        type={props.type ?? "text"}
        value={props.value}
        placeholder={props.placeholder}
        onChange={(e) => props.onChange(e.target.value)}
      />
    </label>
  );
}

// =====================================================================
// AUTH
// =====================================================================
function Auth() {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit() {
    setLoading(true);
    setMsg("");
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        setMsg("Compte créé ! Tu peux te connecter.");
        setMode("signin");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
    } catch (e: any) {
      setMsg(e.message ?? "Erreur");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="nox-card p-6 w-full max-w-sm">
        <div className="mb-6 flex justify-center">
          <Logo />
        </div>
        <h1 className="text-2xl font-bold mb-1 text-center">
          {mode === "signin" ? "Connexion" : "Créer un compte"}
        </h1>
        <p className="text-white/50 text-sm text-center mb-6">
          Ton coach de transformation physique
        </p>
        <Field label="Email" value={email} onChange={setEmail} type="email" placeholder="toi@email.com" />
        <Field label="Mot de passe" value={password} onChange={setPassword} type="password" placeholder="••••••••" />
        <button className="nox-btn nox-gradient w-full mt-2" onClick={submit} disabled={loading}>
          {loading ? "..." : mode === "signin" ? "Se connecter" : "S'inscrire"}
        </button>
        {msg && <p className="text-sm mt-3 text-center text-cyan-300">{msg}</p>}
        <button
          className="text-sm text-white/60 w-full mt-4 underline"
          onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
        >
          {mode === "signin" ? "Pas de compte ? Inscris-toi" : "Déjà un compte ? Connecte-toi"}
        </button>
      </div>
    </div>
  );
}

// =====================================================================
// ONBOARDING
// =====================================================================
function Onboarding(props: { userId: string; onDone: () => void }) {
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  // Profil
  const [name, setName] = useState("");
  const [sex, setSex] = useState("homme");
  const [height, setHeight] = useState("");
  const [weight, setWeight] = useState("");
  const [experience, setExperience] = useState("debutant");
  const [coachStyle, setCoachStyle] = useState("motivant");
  // Objectif
  const [goalType, setGoalType] = useState("perte_gras");
  const [targetWeight, setTargetWeight] = useState("");
  const [daysPerWeek, setDaysPerWeek] = useState("4");
  // Sport
  const [sport, setSport] = useState("");
  // Nutrition
  const [calories, setCalories] = useState("");
  const [protein, setProtein] = useState("");

  async function finish() {
    setSaving(true);
    setErr("");
    try {
      await supabase
        .from("profiles")
        .update({
          display_name: name,
          sex,
          height_cm: height ? Number(height) : null,
          starting_weight_kg: weight ? Number(weight) : null,
          experience_level: experience,
          coach_style: coachStyle,
          onboarding_completed: true,
        })
        .eq("id", props.userId);

      await supabase.from("goals").insert({
        user_id: props.userId,
        goal_type: goalType,
        target_weight_kg: targetWeight ? Number(targetWeight) : null,
        is_active: true,
      });

      if (sport.trim()) {
        await supabase.from("user_sports").insert({
          user_id: props.userId,
          sport: sport.trim(),
        });
      }

      if (calories || protein) {
        await supabase.from("nutrition_targets").insert({
          user_id: props.userId,
          calories: calories ? Number(calories) : null,
          protein_g: protein ? Number(protein) : null,
          is_active: true,
        });
      }

      // On mémorise les jours/semaine pour la génération du programme
      localStorage.setItem("nox_days_per_week", daysPerWeek);

      props.onDone();
    } catch (e: any) {
      setErr(e.message ?? "Erreur");
    } finally {
      setSaving(false);
    }
  }

  const steps = [
    // 0 — Profil
    <div key="p">
      <h2 className="text-xl font-bold mb-4">Ton profil</h2>
      <Field label="Prénom" value={name} onChange={setName} />
      <label className="block mb-3">
        <span className="block text-sm mb-1 text-white/70">Sexe</span>
        <select className="nox-input" value={sex} onChange={(e) => setSex(e.target.value)}>
          <option value="homme">Homme</option>
          <option value="femme">Femme</option>
          <option value="autre">Autre</option>
        </select>
      </label>
      <Field label="Taille (cm)" value={height} onChange={setHeight} type="number" />
      <Field label="Poids actuel (kg)" value={weight} onChange={setWeight} type="number" />
      <label className="block mb-3">
        <span className="block text-sm mb-1 text-white/70">Niveau</span>
        <select className="nox-input" value={experience} onChange={(e) => setExperience(e.target.value)}>
          <option value="debutant">Débutant</option>
          <option value="intermediaire">Intermédiaire</option>
          <option value="avance">Avancé</option>
        </select>
      </label>
      <label className="block mb-3">
        <span className="block text-sm mb-1 text-white/70">Style de coach</span>
        <select className="nox-input" value={coachStyle} onChange={(e) => setCoachStyle(e.target.value)}>
          <option value="motivant">Motivant</option>
          <option value="militaire">Militaire</option>
          <option value="bienveillant">Bienveillant</option>
          <option value="scientifique">Scientifique</option>
        </select>
      </label>
    </div>,
    // 1 — Objectif
    <div key="g">
      <h2 className="text-xl font-bold mb-4">Ton objectif</h2>
      <label className="block mb-3">
        <span className="block text-sm mb-1 text-white/70">Objectif principal</span>
        <select className="nox-input" value={goalType} onChange={(e) => setGoalType(e.target.value)}>
          <option value="perte_gras">Perdre du gras</option>
          <option value="prise_muscle">Prendre du muscle</option>
          <option value="recomposition">Recomposition</option>
          <option value="performance">Performance</option>
          <option value="maintien">Maintien</option>
        </select>
      </label>
      <Field label="Poids cible (kg)" value={targetWeight} onChange={setTargetWeight} type="number" />
      <label className="block mb-3">
        <span className="block text-sm mb-1 text-white/70">Jours d'entraînement / semaine</span>
        <select className="nox-input" value={daysPerWeek} onChange={(e) => setDaysPerWeek(e.target.value)}>
          {[2, 3, 4, 5, 6].map((n) => (
            <option key={n} value={n}>{n}</option>
          ))}
        </select>
      </label>
    </div>,
    // 2 — Sport + nutrition
    <div key="s">
      <h2 className="text-xl font-bold mb-4">Sport & nutrition</h2>
      <Field
        label="Un sport que tu pratiques (optionnel)"
        value={sport}
        onChange={setSport}
        placeholder="foot, boxe, course..."
      />
      <Field label="Calories visées / jour (optionnel)" value={calories} onChange={setCalories} type="number" />
      <Field label="Protéines visées / jour en g (optionnel)" value={protein} onChange={setProtein} type="number" />
    </div>,
  ];

  const isLast = step === steps.length - 1;

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="nox-card p-6 w-full max-w-sm">
        <div className="mb-4 flex justify-between items-center">
          <Logo />
          <span className="text-xs text-white/40">Étape {step + 1}/{steps.length}</span>
        </div>
        {steps[step]}
        {err && <p className="text-sm text-red-400 mb-2">{err}</p>}
        <div className="flex gap-2 mt-2">
          {step > 0 && (
            <button className="nox-btn flex-1" style={{ background: "#262636" }} onClick={() => setStep(step - 1)}>
              Retour
            </button>
          )}
          {!isLast ? (
            <button className="nox-btn nox-gradient flex-1" onClick={() => setStep(step + 1)}>
              Suivant
            </button>
          ) : (
            <button className="nox-btn nox-gradient flex-1" onClick={finish} disabled={saving}>
              {saving ? "..." : "Terminer"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// =====================================================================
// DASHBOARD
// =====================================================================
function Dashboard(props: { profile: any }) {
  const [workouts, setWorkouts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [msg, setMsg] = useState("");

  async function loadWeek() {
    setLoading(true);
    const { data } = await supabase
      .from("workouts")
      .select("*, workout_exercises(*)")
      .order("scheduled_date", { ascending: true });
    setWorkouts(data ?? []);
    setLoading(false);
  }

  useEffect(() => {
    loadWeek();
  }, []);

  async function generate() {
    setGenerating(true);
    setMsg("");
    try {
      const days = localStorage.getItem("nox_days_per_week") ?? "4";
      const { data, error } = await supabase.functions.invoke("training-engine", {
        body: { days_per_week: Number(days) },
      });
      if (error) throw error;
      setMsg(`Programme généré : ${data?.workouts_created ?? 0} séances.`);
      await loadWeek();
    } catch (e: any) {
      setMsg("Erreur : " + (e.message ?? "génération impossible"));
    } finally {
      setGenerating(false);
    }
  }

  return (
    <div>
      <div className="nox-card p-5 mb-4">
        <p className="text-white/60 text-sm">Bonjour</p>
        <h2 className="text-2xl font-bold mb-3">{props.profile?.display_name || "Champion"} 👋</h2>
        <div className="flex gap-4">
          <Stat label="Niveau" value={props.profile?.level ?? 1} />
          <Stat label="XP" value={props.profile?.xp ?? 0} />
          <Stat label="Série" value={`${props.profile?.streak_days ?? 0} j`} />
        </div>
      </div>

      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-bold">Ta semaine</h3>
        <button className="nox-btn nox-gradient text-sm" onClick={generate} disabled={generating}>
          {generating ? "Génération..." : "Générer mon programme"}
        </button>
      </div>
      {msg && <p className="text-sm text-cyan-300 mb-3">{msg}</p>}

      {loading ? (
        <p className="text-white/50">Chargement...</p>
      ) : workouts.length === 0 ? (
        <div className="nox-card p-5 text-white/60 text-sm">
          Aucune séance pour l'instant. Clique sur « Générer mon programme ».
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {workouts.map((w) => (
            <div key={w.id} className="nox-card p-4">
              <div className="flex justify-between items-center mb-1">
                <span className="font-semibold">{w.name || w.workout_type}</span>
                <span className="text-xs text-white/40">{w.scheduled_date}</span>
              </div>
              <span
                className="text-xs px-2 py-0.5 rounded-full"
                style={{ background: "#262636" }}
              >
                {w.workout_type}
              </span>
              {w.workout_exercises?.length > 0 && (
                <ul className="mt-3 text-sm text-white/70 space-y-1">
                  {w.workout_exercises
                    .sort((a: any, b: any) => (a.order_index ?? 0) - (b.order_index ?? 0))
                    .map((ex: any) => (
                      <li key={ex.id}>
                        • {ex.exercise_name}
                        {ex.sets ? ` — ${ex.sets}×${ex.reps ?? ""}` : ""}
                      </li>
                    ))}
                </ul>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Stat(props: { label: string; value: any }) {
  return (
    <div>
      <div className="text-xl font-bold nox-gradient-text">{props.value}</div>
      <div className="text-xs text-white/50">{props.label}</div>
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

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  async function send() {
    const text = input.trim();
    if (!text || loading) return;
    setInput("");
    setMessages((m) => [...m, { role: "user", content: text }]);
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("coach-engine", {
        body: { message: text, conversation_id: convId },
      });
      if (error) throw error;
      if (data?.conversation_id) setConvId(data.conversation_id);
      setMessages((m) => [...m, { role: "assistant", content: data?.reply ?? "..." }]);
    } catch (e: any) {
      setMessages((m) => [
        ...m,
        { role: "assistant", content: "Erreur : " + (e.message ?? "réponse impossible") },
      ]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col" style={{ height: "calc(100vh - 160px)" }}>
      <h3 className="text-lg font-bold mb-3">Coach nox</h3>
      <div className="flex-1 overflow-y-auto flex flex-col gap-3 pb-3">
        {messages.length === 0 && (
          <div className="nox-card p-4 text-white/60 text-sm">
            Pose-moi une question : "Que manger après ma séance ?", "Je suis fatigué aujourd'hui",
            "Explique-moi le développé couché"...
          </div>
        )}
        {messages.map((m, i) => (
          <div
            key={i}
            className="p-3 rounded-2xl max-w-[85%] text-sm whitespace-pre-wrap"
            style={
              m.role === "user"
                ? { alignSelf: "flex-end", background: "#7c5cff" }
                : { alignSelf: "flex-start", background: "#14141f", border: "1px solid #262636" }
            }
          >
            {m.content}
          </div>
        ))}
        {loading && <div className="text-white/40 text-sm">nox écrit...</div>}
        <div ref={endRef} />
      </div>
      <div className="flex gap-2 pt-2">
        <input
          className="nox-input"
          value={input}
          placeholder="Écris à ton coach..."
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send()}
        />
        <button className="nox-btn nox-gradient" onClick={send} disabled={loading}>
          Envoyer
        </button>
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
  const [tab, setTab] = useState<"dash" | "coach">("dash");

  async function loadProfile(userId: string) {
    const { data } = await supabase.from("profiles").select("*").eq("id", userId).maybeSingle();
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
      if (s) await loadProfile(s.user.id);
      else setProfile(null);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  if (!import.meta.env.VITE_SUPABASE_URL) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 text-center text-white/70">
        Variables d'environnement manquantes. Ajoute VITE_SUPABASE_URL et VITE_SUPABASE_ANON_KEY dans Vercel.
      </div>
    );
  }

  if (!ready) {
    return <div className="min-h-screen flex items-center justify-center text-white/50">Chargement...</div>;
  }

  if (!session) return <Auth />;

  if (profile && !profile.onboarding_completed) {
    return <Onboarding userId={session.user.id} onDone={() => loadProfile(session.user.id)} />;
  }

  return (
    <div className="max-w-md mx-auto p-4 pb-24">
      <header className="flex justify-between items-center mb-5">
        <Logo />
        <button className="text-sm text-white/50 underline" onClick={() => supabase.auth.signOut()}>
          Déconnexion
        </button>
      </header>

      {tab === "dash" ? <Dashboard profile={profile} /> : <Coach />}

      {/* Barre de navigation bas */}
      <nav
        className="fixed bottom-0 left-0 right-0 flex justify-around p-3 border-t"
        style={{ background: "#0b0b12", borderColor: "#262636" }}
      >
        <button
          className={tab === "dash" ? "font-semibold nox-gradient-text" : "text-white/50"}
          onClick={() => setTab("dash")}
        >
          Accueil
        </button>
        <button
          className={tab === "coach" ? "font-semibold nox-gradient-text" : "text-white/50"}
          onClick={() => setTab("coach")}
        >
          Coach
        </button>
      </nav>
    </div>
  );
}
