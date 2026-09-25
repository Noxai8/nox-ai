import { useEffect, useState } from 'react';
import { supabase } from './supabase';
import { useAuth } from './AuthContext';

export type Plan = 'free' | 'pro' | 'pro_plus';

export function usePlan() {
  const { user } = useAuth();
  const [plan, setPlan]       = useState<Plan>('free');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) { setLoading(false); return; }
    supabase.from('profiles').select('subscription_plan, trial_ends_at')
      .eq('id', user.id).maybeSingle()
      .then(({ data }) => {
        if (!data) { setPlan('free'); setLoading(false); return; }
        const raw = data.subscription_plan as string | null;
        // Vérifier si le trial est encore valide
        const trialActive = data.trial_ends_at && new Date(data.trial_ends_at) > new Date();
        if (trialActive || raw === 'pro' || raw === 'nox' || raw === 'pro_plus' || raw === 'ultra') {
          setPlan(raw === 'pro_plus' || raw === 'ultra' ? 'pro_plus' : 'pro');
        } else {
          setPlan('free');
        }
        setLoading(false);
      });
  }, [user]);

  return {
    plan,
    loading,
    isPro:     plan === 'pro' || plan === 'pro_plus',
    isProPlus: plan === 'pro_plus',
    isFree:    plan === 'free',
  };
}

// Fonctionnalités verrouillées par plan
export const PLAN_FEATURES = {
  // FREE — toujours accessible
  nutrition_manual:   'free',
  water:              'free',
  weight_tracking:    'free',
  habits:             'free',
  progress_basic:     'free',
  training_basic:     'free',
  // PRO
  ai_coach:           'pro',
  nox_future:         'pro',
  meal_scan_ai:       'pro',
  program_ai:         'pro',
  weekly_review:      'pro',
  meal_ideas_ai:      'pro',
  // PRO+
  advanced_analytics: 'pro_plus',
  photo_analysis:     'pro_plus',
} as const;
