import type { ReactNode } from 'react';
import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { hasSupabaseConfig, supabase } from '../lib/supabase';

export type OrgConfig = {
  id: string;
  name: string;
  slug: string;
  logo_url: string;
  colors: {
    primary: string;
    secondary: string;
    bg: string;
    text: string;
    accent: string;
    gold: string;
    red: string;
    surface: string;
    card: string;
    sub: string;
  };
  titles: {
    org_owner: string;
    manager: string;
    agent: string;
    trainee: string;
  };
  features: {
    vision_board: boolean;
    ai_coach: boolean;
    campaigns: boolean;
    social_sharing: boolean;
    notetaker: boolean;
  };
  weekly_goal_window_days: number;
};

type OrgContextValue = {
  org: OrgConfig;
  loading: boolean;
  error: string;
};

const fallbackOrg: OrgConfig = {
  id: '00000000-0000-0000-0000-000000000001',
  name: 'Fuel Your Legacy',
  slug: 'fuelyourlegacy',
  logo_url: '',
  colors: {
    primary: '#38B249',
    secondary: '#3860AF',
    bg: '#000000',
    text: '#FFFFFF',
    accent: '#E9EEE9',
    gold: '#F4B942',
    red: '#ff5252',
    surface: '#0b1e36',
    card: '#0f2440',
    sub: '#8aa0bb',
  },
  titles: {
    org_owner: 'Senior Marketing Director',
    manager: 'Manager',
    agent: 'Associate',
    trainee: 'Training Associate',
  },
  features: {
    vision_board: true,
    ai_coach: true,
    campaigns: true,
    social_sharing: true,
    notetaker: false,
  },
  weekly_goal_window_days: 7,
};

const OrgContext = createContext<OrgContextValue>({
  org: fallbackOrg,
  loading: true,
  error: '',
});

function getHostSlug(hostname: string): string {
  if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname.length === 0) {
    return import.meta.env.VITE_DEFAULT_ORG_SLUG || fallbackOrg.slug;
  }

  const parts = hostname.split('.');
  if (parts.length > 2) return parts[0];
  return import.meta.env.VITE_DEFAULT_ORG_SLUG || fallbackOrg.slug;
}

function applyOrgColors(org: OrgConfig) {
  const root = document.documentElement;
  root.style.setProperty('--color-primary', org.colors.primary);
  root.style.setProperty('--color-secondary', org.colors.secondary);
  root.style.setProperty('--color-bg', org.colors.bg);
  root.style.setProperty('--color-text', org.colors.text);
  root.style.setProperty('--color-accent', org.colors.accent);
  root.style.setProperty('--color-gold', org.colors.gold);
  root.style.setProperty('--color-red', org.colors.red);
  root.style.setProperty('--color-surface', org.colors.surface);
  root.style.setProperty('--color-card', org.colors.card);
  root.style.setProperty('--color-sub', org.colors.sub);
}

function mapOrgRecord(record: Record<string, unknown>): OrgConfig {
  return {
    id: String(record.id || fallbackOrg.id),
    name: String(record.name || fallbackOrg.name),
    slug: String(record.slug || fallbackOrg.slug),
    logo_url: String(record.logo_url || ''),
    colors: {
      primary: String(record.color_primary || fallbackOrg.colors.primary),
      secondary: String(record.color_secondary || fallbackOrg.colors.secondary),
      bg: String(record.color_bg || fallbackOrg.colors.bg),
      text: String(record.color_text || fallbackOrg.colors.text),
      accent: String(record.color_accent || fallbackOrg.colors.accent),
      gold: fallbackOrg.colors.gold,
      red: fallbackOrg.colors.red,
      surface: fallbackOrg.colors.surface,
      card: fallbackOrg.colors.card,
      sub: fallbackOrg.colors.sub,
    },
    titles: {
      org_owner: String(record.title_org_owner || fallbackOrg.titles.org_owner),
      manager: String(record.title_manager || fallbackOrg.titles.manager),
      agent: String(record.title_agent || fallbackOrg.titles.agent),
      trainee: String(record.title_trainee || fallbackOrg.titles.trainee),
    },
    features: {
      vision_board: record.feature_vision_board !== false,
      ai_coach: record.feature_ai_coach !== false,
      campaigns: record.feature_campaigns !== false,
      social_sharing: record.feature_social_sharing !== false,
      notetaker: record.feature_notetaker === true,
    },
    weekly_goal_window_days: Number(record.weekly_goal_window_days || fallbackOrg.weekly_goal_window_days),
  };
}

export function OrgProvider({ children }: { children: ReactNode }) {
  const [org, setOrg] = useState<OrgConfig>(fallbackOrg);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;

    async function loadOrg() {
      const hostname = window.location.hostname;
      const slug = getHostSlug(hostname);

      if (!hasSupabaseConfig || !supabase) {
        applyOrgColors(fallbackOrg);
        setLoading(false);
        return;
      }

      const query = supabase
        .from('organizations')
        .select('*')
        .or('domain.eq.' + hostname + ',subdomain.eq.' + hostname + ',slug.eq.' + slug)
        .limit(1)
        .maybeSingle();

      const { data, error: orgError } = await query;
      if (!active) return;

      if (orgError) {
        setError(orgError.message);
        applyOrgColors(fallbackOrg);
        setLoading(false);
        return;
      }

      if (data) {
        const mapped = mapOrgRecord(data as Record<string, unknown>);
        setOrg(mapped);
        applyOrgColors(mapped);
      } else {
        applyOrgColors(fallbackOrg);
      }
      setLoading(false);
    }

    loadOrg();

    return () => {
      active = false;
    };
  }, []);

  const value = useMemo(() => ({ org, loading, error }), [org, loading, error]);

  return <OrgContext.Provider value={value}>{children}</OrgContext.Provider>;
}

export function useOrg() {
  return useContext(OrgContext);
}
