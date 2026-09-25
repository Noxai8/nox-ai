import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/AuthContext';
import {
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  Sparkles,
} from 'lucide-react';

const BG = '#F7F8F4';
const WHITE = '#FFFFFF';
const BLACK = '#0B0B0B';
const MUTED = '#7A7F76';
const BORDER = '#E8EAE4';
const ACCENT = '#C8FF00';

type ProfileData = {
  date_of_birth: string | null;
  sex: string | null;
  height_cm: number | null;
  starting_weight_kg: number | null;
  activity_level: string | null;
  goal_type: string | null;
};

type GoalData = {
  goal_type: string | null;
  target_weight_kg: number | null;
  target_date: string | null;
  days_per_week: number | null;
  is_active: boolean | null;
};

type ExistingTargets = {
  calories: number | null;
  protein_g: number | null;
  carbs_g: number | null;
  fat_g: number | null;
};

type Recommendation = {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  maintenance: number;
  age: number;
  objective: 'loss' | 'gain' | 'maintain';
};

const roundTo5 = (value: number) => Math.round(value / 5) * 5;
const roundTo10 = (value: number) => Math.round(value / 10) * 10;

const normalize = (value?: string | null) =>
  (value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const calculateAge = (dateOfBirth: string) => {
  const birth = new Date(`${dateOfBirth}T00:00:00`);

  if (Number.isNaN(birth.getTime())) return null;

  const today = new Date();

  let age = today.getFullYear() - birth.getFullYear();

  const monthDifference = today.getMonth() - birth.getMonth();

  if (
    monthDifference < 0 ||
    (monthDifference === 0 && today.getDate() < birth.getDate())
  ) {
    age -= 1;
  }

  if (age < 14 || age > 100) return null;

  return age;
};

const getObjective = (
  goalType?: string | null
): 'loss' | 'gain' | 'maintain' => {
  const goal = normalize(goalType);

  if (
    goal.includes('perdre') ||
    goal.includes('perte') ||
    goal.includes('gras') ||
    goal.includes('seche') ||
    goal.includes('mincir') ||
    goal.includes('weight loss') ||
    goal.includes('fat loss')
  ) {
    return 'loss';
  }

  if (
    goal.includes('prise') ||
    goal.includes('muscle') ||
    goal.includes('masse') ||
    goal.includes('gain') ||
    goal.includes('bulk')
  ) {
    return 'gain';
  }

  return 'maintain';
};

const getObjectiveLabel = (
  objective: 'loss' | 'gain' | 'maintain'
) => {
  if (objective === 'loss') return 'Perte de gras';
  if (objective === 'gain') return 'Prise de muscle';
  return 'Maintien';
};

const getActivityFactor = (
  activityLevel?: string | null,
  daysPerWeek?: number | null
) => {
  const activity = normalize(activityLevel);
  const days = Number(daysPerWeek || 0);

  /*
   * On privilégie la fréquence d'entraînement réelle
   * lorsqu'elle existe dans goals.
   */
  if (days >= 6) return 1.725;
  if (days >= 4) return 1.55;
  if (days >= 2) return 1.375;
  if (days === 1) return 1.3;

  if (
    activity.includes('tres actif') ||
    activity.includes('very active') ||
    activity.includes('intense')
  ) {
    return 1.725;
  }

  if (
    activity.includes('actif') ||
    activity.includes('active') ||
    activity.includes('modere')
  ) {
    return 1.55;
  }

  if (
    activity.includes('leger') ||
    activity.includes('light')
  ) {
    return 1.375;
  }

  if (
    activity.includes('sedentaire') ||
    activity.includes('sedentary')
  ) {
    return 1.2;
  }

  return 1.375;
};

const getSexOffset = (sex?: string | null) => {
  const normalizedSex = normalize(sex);

  if (
    normalizedSex === 'homme' ||
    normalizedSex === 'male' ||
    normalizedSex === 'masculin' ||
    normalizedSex === 'man'
  ) {
    return 5;
  }

  if (
    normalizedSex === 'femme' ||
    normalizedSex === 'female' ||
    normalizedSex === 'feminin' ||
    normalizedSex === 'woman'
  ) {
    return -161;
  }

  return null;
};

const calculateRecommendation = (
  profile: ProfileData,
  goal: GoalData | null
): Recommendation | null => {
  const height = Number(profile.height_cm);
  const weight = Number(profile.starting_weight_kg);

  if (
    !profile.date_of_birth ||
    !Number.isFinite(height) ||
    height <= 0 ||
    !Number.isFinite(weight) ||
    weight <= 0
  ) {
    return null;
  }

  const age = calculateAge(profile.date_of_birth);
  const sexOffset = getSexOffset(profile.sex);

  if (age == null || sexOffset == null) {
    return null;
  }

  /*
   * Mifflin-St Jeor :
   * BMR = 10W + 6.25H - 5A + sexe
   */
  const bmr =
    10 * weight +
    6.25 * height -
    5 * age +
    sexOffset;

  const activityFactor = getActivityFactor(
    profile.activity_level,
    goal?.days_per_week
  );

  const maintenance = bmr * activityFactor;

  const objective = getObjective(
    goal?.goal_type || profile.goal_type
  );

  /*
   * Ajustement volontairement modéré :
   * - perte : ~15 %
   * - maintien : maintenance
   * - prise : ~8 %
   */
  let targetCalories = maintenance;

  if (objective === 'loss') {
    targetCalories = maintenance * 0.85;
  }

  if (objective === 'gain') {
    targetCalories = maintenance * 1.08;
  }

  /*
   * Protéines :
   * perte -> 2 g/kg
   * prise -> 1.8 g/kg
   * maintien -> 1.7 g/kg
   */
  let proteinPerKg = 1.7;

  if (objective === 'loss') proteinPerKg = 2;
  if (objective === 'gain') proteinPerKg = 1.8;

  const protein = roundTo5(weight * proteinPerKg);

  /*
   * Lipides :
   * base simple à 0.8 g/kg.
   */
  const fat = Math.max(45, roundTo5(weight * 0.8));

  /*
   * Les glucides remplissent les calories restantes.
   */
  const calories = Math.max(1200, roundTo10(targetCalories));

  const caloriesFromProtein = protein * 4;
  const caloriesFromFat = fat * 9;

  const remainingCalories = Math.max(
    0,
    calories - caloriesFromProtein - caloriesFromFat
  );

  const carbs = Math.max(0, roundTo5(remainingCalories / 4));

  return {
    calories,
    protein,
    carbs,
    fat,
    maintenance: roundTo10(maintenance),
    age,
    objective,
  };
};

export default function NutritionGoals() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [goal, setGoal] = useState<GoalData | null>(null);

  const [calories, setCalories] = useState('');
  const [protein, setProtein] = useState('');
  const [carbs, setCarbs] = useState('');
  const [fat, setFat] = useState('');

  const [existingTargets, setExistingTargets] =
    useState<ExistingTargets | null>(null);

  const [manualOpen, setManualOpen] = useState(false);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  /* =========================================================
     LOAD NOX PROFILE + ACTIVE GOAL + EXISTING TARGETS
  ========================================================= */

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    let cancelled = false;

    const loadData = async () => {
      setLoading(true);
      setError('');

      try {
        const [
          profileResult,
          goalResult,
          targetResult,
        ] = await Promise.all([
          supabase
            .from('profiles')
            .select(
              `
              date_of_birth,
              sex,
              height_cm,
              starting_weight_kg,
              activity_level,
              goal_type
              `
            )
            .eq('id', user.id)
            .maybeSingle(),

          supabase
            .from('goals')
            .select(
              `
              goal_type,
              target_weight_kg,
              target_date,
              days_per_week,
              is_active
              `
            )
            .eq('user_id', user.id)
            .eq('is_active', true)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle(),

          supabase
            .from('nutrition_targets')
            .select('calories, protein_g, carbs_g, fat_g')
            .eq('user_id', user.id)
            .maybeSingle(),
        ]);

        if (cancelled) return;

        if (profileResult.error) {
          console.error(
            'NutritionGoals profile:',
            profileResult.error
          );

          setError(
            'Impossible de charger les informations de ton profil.'
          );

          return;
        }

        /*
         * Une absence de goal n'empêche pas la page de fonctionner :
         * on pourra utiliser profile.goal_type.
         */
        if (goalResult.error) {
          console.error(
            'NutritionGoals goal:',
            goalResult.error
          );
        }

        if (targetResult.error) {
          console.error(
            'NutritionGoals targets:',
            targetResult.error
          );
        }

        const loadedProfile =
          (profileResult.data as ProfileData | null) || null;

        const loadedGoal =
          !goalResult.error && goalResult.data
            ? (goalResult.data as GoalData)
            : null;

        const loadedTargets =
          !targetResult.error && targetResult.data
            ? (targetResult.data as ExistingTargets)
            : null;

        setProfile(loadedProfile);
        setGoal(loadedGoal);
        setExistingTargets(loadedTargets);

        /*
         * Si l'utilisateur possède déjà un cap,
         * on le précharge dans l'éditeur manuel.
         */
        if (loadedTargets) {
          setCalories(
            loadedTargets.calories != null
              ? String(loadedTargets.calories)
              : ''
          );

          setProtein(
            loadedTargets.protein_g != null
              ? String(loadedTargets.protein_g)
              : ''
          );

          setCarbs(
            loadedTargets.carbs_g != null
              ? String(loadedTargets.carbs_g)
              : ''
          );

          setFat(
            loadedTargets.fat_g != null
              ? String(loadedTargets.fat_g)
              : ''
          );
        }
      } catch (err) {
        console.error(
          'NutritionGoals unexpected load:',
          err
        );

        if (!cancelled) {
          setError(
            'Impossible de préparer ta recommandation nutritionnelle.'
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    loadData();

    return () => {
      cancelled = true;
    };
  }, [user]);

  /* =========================================================
     AUTOMATIC NOX RECOMMENDATION
  ========================================================= */

  const recommendation = useMemo(() => {
    if (!profile) return null;

    return calculateRecommendation(profile, goal);
  }, [profile, goal]);

  /* =========================================================
     MISSING PROFILE DATA
  ========================================================= */

  const missingData = useMemo(() => {
    if (!profile) return ['profil'];

    const missing: string[] = [];

    if (!profile.date_of_birth) {
      missing.push('date de naissance');
    }

    if (!profile.sex) {
      missing.push('sexe');
    }

    if (
      profile.height_cm == null ||
      Number(profile.height_cm) <= 0
    ) {
      missing.push('taille');
    }

    if (
      profile.starting_weight_kg == null ||
      Number(profile.starting_weight_kg) <= 0
    ) {
      missing.push('poids');
    }

    return missing;
  }, [profile]);

  /* =========================================================
     MANUAL VALIDATION
  ========================================================= */

  const caloriesNumber = Number(calories);
  const proteinNumber = Number(protein);
  const carbsNumber = Number(carbs);
  const fatNumber = Number(fat);

  const manualValid =
    calories.trim() !== '' &&
    protein.trim() !== '' &&
    carbs.trim() !== '' &&
    fat.trim() !== '' &&
    Number.isFinite(caloriesNumber) &&
    Number.isFinite(proteinNumber) &&
    Number.isFinite(carbsNumber) &&
    Number.isFinite(fatNumber) &&
    caloriesNumber > 0 &&
    proteinNumber > 0 &&
    carbsNumber >= 0 &&
    fatNumber >= 0;

  /* =========================================================
     DATABASE SAVE
  ========================================================= */

  const savePayload = async ({
    targetCalories,
    targetProtein,
    targetCarbs,
    targetFat,
  }: {
    targetCalories: number;
    targetProtein: number;
    targetCarbs: number;
    targetFat: number;
  }) => {
    if (!user || saving) return;

    setSaving(true);
    setSaved(false);
    setError('');

    try {
      const payload = {
        user_id: user.id,
        calories: Math.round(targetCalories),
        protein_g: Math.round(targetProtein),
        carbs_g: Math.round(targetCarbs),
        fat_g: Math.round(targetFat),
      };

      const { error: saveError } = await supabase
        .from('nutrition_targets')
        .upsert(payload, {
          onConflict: 'user_id',
        });

      if (saveError) {
        console.error(
          'NutritionGoals save:',
          saveError
        );

        setError(
          saveError.message ||
            'Impossible d’enregistrer ton cap nutritionnel.'
        );

        return;
      }

      /*
       * Vérification réelle en base avant retour Fuel.
       */
      const {
        data: verify,
        error: verifyError,
      } = await supabase
        .from('nutrition_targets')
        .select(
          'calories, protein_g, carbs_g, fat_g'
        )
        .eq('user_id', user.id)
        .maybeSingle();

      if (verifyError) {
        console.error(
          'NutritionGoals verify:',
          verifyError
        );

        setError(
          verifyError.message ||
            'Ton cap a été enregistré, mais la vérification a échoué.'
        );

        return;
      }

      if (!verify) {
        setError(
          'Aucun cap nutritionnel n’a été retrouvé après l’enregistrement.'
        );

        return;
      }

      setExistingTargets(verify);

      setCalories(String(verify.calories ?? ''));
      setProtein(String(verify.protein_g ?? ''));
      setCarbs(String(verify.carbs_g ?? ''));
      setFat(String(verify.fat_g ?? ''));

      setSaved(true);

      window.setTimeout(() => {
        navigate('/fuel', {
          replace: true,
        });
      }, 500);
    } catch (err) {
      console.error(
        'NutritionGoals unexpected save:',
        err
      );

      setError(
        'Une erreur inattendue est survenue.'
      );
    } finally {
      setSaving(false);
    }
  };

  /* =========================================================
     USE NOX RECOMMENDATION
  ========================================================= */

  const useRecommendation = async () => {
    if (!recommendation) return;

    await savePayload({
      targetCalories: recommendation.calories,
      targetProtein: recommendation.protein,
      targetCarbs: recommendation.carbs,
      targetFat: recommendation.fat,
    });
  };

  /* =========================================================
     MANUAL SAVE
  ========================================================= */

  const saveManualTargets = async () => {
    if (!manualValid) return;

    await savePayload({
      targetCalories: caloriesNumber,
      targetProtein: proteinNumber,
      targetCarbs: carbsNumber,
      targetFat: fatNumber,
    });
  };

  /* =========================================================
     OPEN MANUAL EDITOR
  ========================================================= */

  const openManualEditor = () => {
    /*
     * S'il n'existe pas encore de cap,
     * on préremplit avec la recommandation NOX.
     */
    if (!existingTargets && recommendation) {
      setCalories(
        String(recommendation.calories)
      );

      setProtein(
        String(recommendation.protein)
      );

      setCarbs(
        String(recommendation.carbs)
      );

      setFat(
        String(recommendation.fat)
      );
    }

    setManualOpen(true);
  };

  /* =========================================================
     UI HELPERS
  ========================================================= */

  const inputStyle = {
    width: '100%',
    height: 68,
    borderRadius: 18,
    border: `1px solid ${BORDER}`,
    background: WHITE,
    padding: '0 54px 0 18px',
    fontSize: 19,
    fontWeight: 850,
    color: BLACK,
    outline: 'none',
    boxSizing: 'border-box' as const,
  };

  const Field = ({
    label,
    value,
    onChange,
    unit,
  }: {
    label: string;
    value: string;
    onChange: (value: string) => void;
    unit: string;
  }) => (
    <div style={{ marginBottom: 18 }}>
      <div
        style={{
          fontSize: 14,
          fontWeight: 900,
          color: BLACK,
          marginBottom: 9,
        }}
      >
        {label}
      </div>

      <div
        style={{
          position: 'relative',
        }}
      >
        <input
          type="number"
          inputMode="numeric"
          min="0"
          value={value}
          disabled={saving}
          onChange={(e) =>
            onChange(e.target.value)
          }
          style={{
            ...inputStyle,
            opacity: saving ? 0.65 : 1,
          }}
        />

        <div
          style={{
            position: 'absolute',
            right: 18,
            top: '50%',
            transform: 'translateY(-50%)',
            color: MUTED,
            fontSize: 13,
            fontWeight: 800,
            pointerEvents: 'none',
          }}
        >
          {unit}
        </div>
      </div>
    </div>
  );

  const activityLabel = (() => {
    if (goal?.days_per_week) {
      return `${goal.days_per_week} jour${
        goal.days_per_week > 1 ? 's' : ''
      } / semaine`;
    }

    if (profile?.activity_level) {
      const activity =
        normalize(profile.activity_level);

      if (activity.includes('sedentaire')) {
        return 'Sédentaire';
      }

      if (activity.includes('leger')) {
        return 'Activité légère';
      }

      if (
        activity.includes('actif') ||
        activity.includes('active')
      ) {
        return 'Actif';
      }
    }

    return 'Activité estimée';
  })();

  /* =========================================================
     RENDER
  ========================================================= */

  return (
    <div
      style={{
        minHeight: '100vh',
        background: BG,
        color: BLACK,
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 620,
          margin: '0 auto',
          padding: '24px 18px 52px',
          boxSizing: 'border-box',
        }}
      >
        {/* HEADER */}

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 14,
            marginBottom: 28,
          }}
        >
          <button
            type="button"
            onClick={() => navigate('/fuel')}
            style={{
              width: 44,
              height: 44,
              borderRadius: 15,
              border: `1px solid ${BORDER}`,
              background: WHITE,
              display: 'grid',
              placeItems: 'center',
              cursor: 'pointer',
              flexShrink: 0,
            }}
            aria-label="Retour à Nutrition"
          >
            <ArrowLeft
              size={20}
              strokeWidth={2.4}
            />
          </button>

          <div>
            <div
              style={{
                fontSize: 12,
                fontWeight: 900,
                letterSpacing: '0.08em',
                color: MUTED,
                marginBottom: 3,
              }}
            >
              NUTRITION
            </div>

            <h1
              style={{
                margin: 0,
                fontSize: 29,
                lineHeight: 1.05,
                letterSpacing: '-0.045em',
                fontWeight: 950,
              }}
            >
              Ton cap nutritionnel
            </h1>
          </div>
        </div>

        <p
          style={{
            margin: '0 0 26px',
            color: MUTED,
            fontSize: 15,
            lineHeight: 1.55,
          }}
        >
          NOX utilise ton profil et ton
          objectif pour te proposer un cap
          adapté à ta journée.
        </p>

        {/* LOADING */}

        {loading && (
          <div
            style={{
              background: WHITE,
              border: `1px solid ${BORDER}`,
              borderRadius: 22,
              padding: 24,
              color: MUTED,
              fontSize: 14,
            }}
          >
            NOX prépare ta recommandation...
          </div>
        )}

        {/* RECOMMENDATION */}

        {!loading &&
          recommendation &&
          profile && (
            <>
              <div
                style={{
                  borderRadius: 26,
                  background: ACCENT,
                  padding: 22,
                  marginBottom: 14,
                }}
              >
                {/* BADGE */}

                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    marginBottom: 22,
                  }}
                >
                  <div
                    style={{
                      width: 30,
                      height: 30,
                      borderRadius: 999,
                      background: BLACK,
                      color: ACCENT,
                      display: 'grid',
                      placeItems: 'center',
                    }}
                  >
                    <Sparkles size={15} />
                  </div>

                  <div
                    style={{
                      fontSize: 12,
                      fontWeight: 950,
                      letterSpacing: '0.07em',
                    }}
                  >
                    RECOMMANDÉ PAR NOX
                  </div>
                </div>

                {/* CALORIES */}

                <div
                  style={{
                    textAlign: 'center',
                    marginBottom: 22,
                  }}
                >
                  <div
                    style={{
                      fontSize: 46,
                      fontWeight: 950,
                      letterSpacing: '-0.055em',
                      lineHeight: 1,
                    }}
                  >
                    {recommendation.calories.toLocaleString(
                      'fr-FR'
                    )}
                  </div>

                  <div
                    style={{
                      fontSize: 14,
                      fontWeight: 850,
                      marginTop: 6,
                      opacity: 0.72,
                    }}
                  >
                    kcal / jour
                  </div>
                </div>

                {/* MACROS */}

                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns:
                      'repeat(3, 1fr)',
                    gap: 8,
                    marginBottom: 20,
                  }}
                >
                  {[
                    {
                      value:
                        recommendation.protein,
                      label: 'Protéines',
                    },
                    {
                      value:
                        recommendation.carbs,
                      label: 'Glucides',
                    },
                    {
                      value:
                        recommendation.fat,
                      label: 'Lipides',
                    },
                  ].map((macro) => (
                    <div
                      key={macro.label}
                      style={{
                        background:
                          'rgba(255,255,255,0.45)',
                        borderRadius: 17,
                        padding: '14px 8px',
                        textAlign: 'center',
                      }}
                    >
                      <div
                        style={{
                          fontSize: 20,
                          fontWeight: 950,
                        }}
                      >
                        {macro.value} g
                      </div>

                      <div
                        style={{
                          fontSize: 11,
                          fontWeight: 800,
                          marginTop: 3,
                          opacity: 0.65,
                        }}
                      >
                        {macro.label}
                      </div>
                    </div>
                  ))}
                </div>

                {/* CONTEXT */}

                <div
                  style={{
                    borderTop:
                      '1px solid rgba(0,0,0,0.12)',
                    paddingTop: 17,
                    marginBottom: 19,
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      justifyContent:
                        'space-between',
                      gap: 15,
                      marginBottom: 8,
                      fontSize: 13,
                    }}
                  >
                    <span
                      style={{
                        opacity: 0.65,
                      }}
                    >
                      Objectif
                    </span>

                    <strong>
                      {getObjectiveLabel(
                        recommendation.objective
                      )}
                    </strong>
                  </div>

                  <div
                    style={{
                      display: 'flex',
                      justifyContent:
                        'space-between',
                      gap: 15,
                      marginBottom: 8,
                      fontSize: 13,
                    }}
                  >
                    <span
                      style={{
                        opacity: 0.65,
                      }}
                    >
                      Activité
                    </span>

                    <strong>
                      {activityLabel}
                    </strong>
                  </div>

                  <div
                    style={{
                      display: 'flex',
                      justifyContent:
                        'space-between',
                      gap: 15,
                      fontSize: 13,
                    }}
                  >
                    <span
                      style={{
                        opacity: 0.65,
                      }}
                    >
                      Profil utilisé
                    </span>

                    <strong
                      style={{
                        textAlign: 'right',
                      }}
                    >
                      {profile.height_cm} cm ·{' '}
                      {profile.starting_weight_kg}{' '}
                      kg · {recommendation.age} ans
                    </strong>
                  </div>
                </div>

                {/* CTA */}

                <button
                  type="button"
                  disabled={saving}
                  onClick={useRecommendation}
                  style={{
                    width: '100%',
                    minHeight: 58,
                    border: 0,
                    borderRadius: 18,
                    background: BLACK,
                    color: WHITE,
                    fontSize: 14,
                    fontWeight: 950,
                    letterSpacing: '0.025em',
                    cursor: saving
                      ? 'wait'
                      : 'pointer',
                    opacity: saving ? 0.7 : 1,
                  }}
                >
                  {saving
                    ? 'ENREGISTREMENT...'
                    : existingTargets
                      ? 'UTILISER CE NOUVEAU CAP'
                      : 'UTILISER CE CAP'}
                </button>
              </div>

              <div
                style={{
                  textAlign: 'center',
                  color: MUTED,
                  fontSize: 12,
                  lineHeight: 1.45,
                  marginBottom: 18,
                }}
              >
                Estimation basée sur ton profil
                NOX. Elle pourra évoluer avec
                tes données et ta progression.
              </div>
            </>
          )}

        {/* PROFILE INCOMPLETE */}

        {!loading &&
          !recommendation && (
            <div
              style={{
                background: WHITE,
                border: `1px solid ${BORDER}`,
                borderRadius: 24,
                padding: 22,
                marginBottom: 16,
              }}
            >
              <div
                style={{
                  fontSize: 12,
                  fontWeight: 950,
                  letterSpacing: '0.07em',
                  color: MUTED,
                  marginBottom: 8,
                }}
              >
                PROFIL INCOMPLET
              </div>

              <div
                style={{
                  fontSize: 21,
                  fontWeight: 950,
                  letterSpacing: '-0.025em',
                  marginBottom: 8,
                }}
              >
                NOX ne peut pas encore calculer
                ton cap.
              </div>

              <div
                style={{
                  color: MUTED,
                  fontSize: 14,
                  lineHeight: 1.55,
                }}
              >
                {missingData.length > 0
                  ? `Information${
                      missingData.length > 1
                        ? 's'
                        : ''
                    } manquante${
                      missingData.length > 1
                        ? 's'
                        : ''
                    } : ${missingData.join(', ')}.`
                  : 'Certaines informations de ton profil sont incomplètes.'}
              </div>

              <button
                type="button"
                onClick={openManualEditor}
                style={{
                  width: '100%',
                  minHeight: 52,
                  borderRadius: 16,
                  border: `1px solid ${BORDER}`,
                  background: BG,
                  color: BLACK,
                  fontWeight: 900,
                  marginTop: 18,
                  cursor: 'pointer',
                }}
              >
                RÉGLER MANUELLEMENT
              </button>
            </div>
          )}

        {/* EXISTING TARGET */}

        {!loading &&
          existingTargets &&
          recommendation && (
            <div
              style={{
                background: WHITE,
                border: `1px solid ${BORDER}`,
                borderRadius: 20,
                padding: '15px 17px',
                marginBottom: 14,
              }}
            >
              <div
                style={{
                  color: MUTED,
                  fontSize: 11,
                  fontWeight: 900,
                  letterSpacing: '0.06em',
                  marginBottom: 5,
                }}
              >
                CAP ACTUEL
              </div>

              <div
                style={{
                  fontSize: 14,
                  fontWeight: 850,
                }}
              >
                {existingTargets.calories ??
                  '—'}{' '}
                kcal ·{' '}
                {existingTargets.protein_g ??
                  '—'}{' '}
                g protéines ·{' '}
                {existingTargets.carbs_g ??
                  '—'}{' '}
                g glucides ·{' '}
                {existingTargets.fat_g ?? '—'}{' '}
                g lipides
              </div>
            </div>
          )}

        {/* MANUAL TOGGLE */}

        {!loading &&
          recommendation &&
          !manualOpen && (
            <button
              type="button"
              onClick={openManualEditor}
              style={{
                width: '100%',
                minHeight: 52,
                borderRadius: 17,
                border: `1px solid ${BORDER}`,
                background: WHITE,
                color: BLACK,
                fontSize: 13,
                fontWeight: 900,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 7,
              }}
            >
              AJUSTER MANUELLEMENT
              <ChevronDown size={17} />
            </button>
          )}

        {/* MANUAL EDITOR */}

        {!loading && manualOpen && (
          <div
            style={{
              background: WHITE,
              border: `1px solid ${BORDER}`,
              borderRadius: 24,
              padding: 19,
              marginTop: 14,
            }}
          >
            <button
              type="button"
              onClick={() =>
                setManualOpen(false)
              }
              style={{
                width: '100%',
                border: 0,
                background: 'transparent',
                padding: '0 0 18px',
                display: 'flex',
                justifyContent:
                  'space-between',
                alignItems: 'center',
                cursor: 'pointer',
                color: BLACK,
              }}
            >
              <span
                style={{
                  fontSize: 17,
                  fontWeight: 950,
                }}
              >
                Réglage manuel
              </span>

              <ChevronUp size={19} />
            </button>

            <Field
              label="Calories"
              value={calories}
              onChange={setCalories}
              unit="kcal"
            />

            <Field
              label="Protéines"
              value={protein}
              onChange={setProtein}
              unit="g"
            />

            <Field
              label="Glucides"
              value={carbs}
              onChange={setCarbs}
              unit="g"
            />

            <Field
              label="Lipides"
              value={fat}
              onChange={setFat}
              unit="g"
            />

            <button
              type="button"
              disabled={
                !manualValid || saving
              }
              onClick={saveManualTargets}
              style={{
                width: '100%',
                minHeight: 56,
                border: 0,
                borderRadius: 18,
                background:
                  manualValid && !saving
                    ? BLACK
                    : '#DADDD5',
                color:
                  manualValid && !saving
                    ? WHITE
                    : '#92978E',
                fontSize: 14,
                fontWeight: 950,
                cursor:
                  manualValid && !saving
                    ? 'pointer'
                    : 'not-allowed',
              }}
            >
              {saving
                ? 'ENREGISTREMENT...'
                : 'ENREGISTRER CE CAP'}
            </button>
          </div>
        )}

        {/* ERROR */}

        {error && (
          <div
            style={{
              borderRadius: 18,
              background: '#FFF0ED',
              border:
                '1px solid #FFD2CA',
              padding: '15px 17px',
              color: '#C43D2F',
              fontSize: 13,
              lineHeight: 1.5,
              marginTop: 16,
              wordBreak: 'break-word',
            }}
          >
            {error}
          </div>
        )}

        {/* SUCCESS */}

        {saved && (
          <div
            style={{
              borderRadius: 18,
              background: '#F1FFD9',
              border: `1px solid ${ACCENT}`,
              padding: '15px 17px',
              color: '#53651B',
              fontSize: 13,
              fontWeight: 800,
              marginTop: 16,
            }}
          >
            Cap enregistré ✓ Retour vers
            Nutrition...
          </div>
        )}
      </div>
    </div>
  );
}
