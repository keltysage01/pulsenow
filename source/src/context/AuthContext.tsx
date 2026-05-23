import type { ReactNode } from 'react';
import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { hasSupabaseConfig, supabase } from '../lib/supabase';
import { useOrg } from './OrgContext';

export type UserSession = {
  id: string;
  name: string;
  org_id: string;
  role: 'org_owner' | 'manager' | 'licensing_coordinator' | 'agent' | 'trainee';
  level: string;
  agent_code: string | null;
  leader_code: string | null;
  is_manager: boolean;
};

type RegisterInput = {
  name: string;
  agentCode: string;
  leaderCode: string;
  pin: string;
};

type AuthContextValue = {
  user: UserSession | null;
  loading: boolean;
  error: string;
  login: (name: string, pin: string) => Promise<boolean>;
  registerUser: (input: RegisterInput) => Promise<boolean>;
  signOut: () => void;
  clearError: () => void;
};

const SESSION_KEY = 'pulsenow_session';
const PIN_SALT = '_pulse_salt_2026';

const AuthContext = createContext<AuthContextValue>({
  user: null,
  loading: true,
  error: '',
  login: async () => false,
  registerUser: async () => false,
  signOut: () => {},
  clearError: () => {},
});

function hashPin(pin: string): string {
  return btoa(pin + PIN_SALT);
}

function isManagerRole(role: string): boolean {
  return role === 'org_owner' || role === 'manager' || role === 'licensing_coordinator';
}

function mapUserRecord(record: Record<string, unknown>): UserSession {
  const role = String(record.role || 'agent') as UserSession['role'];
  return {
    id: String(record.id || 'demo-user'),
    name: String(record.name || 'Demo Agent'),
    org_id: String(record.org_id || ''),
    role,
    level: String(record.level || 'TA'),
    agent_code: record.agent_code ? String(record.agent_code) : null,
    leader_code: record.leader_code ? String(record.leader_code) : null,
    is_manager: isManagerRole(role),
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const { org } = useOrg();
  const [user, setUser] = useState<UserSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (raw) {
      try {
        const parsed = JSON.parse(raw) as UserSession;
        setUser(parsed);
      } catch {
        sessionStorage.removeItem(SESSION_KEY);
      }
    }
    setLoading(false);
  }, []);

  function persist(session: UserSession) {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
    setUser(session);
  }

  async function login(name: string, pin: string): Promise<boolean> {
    setError('');
    const trimmedName = name.trim();
    const trimmedPin = pin.trim();

    if (trimmedName.length < 2 || trimmedPin.length !== 4) {
      setError('Enter your name and 4-digit PIN.');
      return false;
    }

    if (!hasSupabaseConfig || !supabase) {
      const session: UserSession = {
        id: 'demo-user',
        name: trimmedName,
        org_id: org.id,
        role: 'agent',
        level: 'TA',
        agent_code: 'DEMO',
        leader_code: null,
        is_manager: false,
      };
      persist(session);
      return true;
    }

    const { data, error: loginError } = await supabase
      .from('users')
      .select('id,name,org_id,role,level,agent_code,leader_code')
      .eq('org_id', org.id)
      .ilike('name', trimmedName)
      .eq('pin_hash', hashPin(trimmedPin))
      .eq('is_active', true)
      .limit(1)
      .maybeSingle();

    if (loginError) {
      setError(loginError.message);
      return false;
    }

    if (!data) {
      setError('Name or PIN did not match.');
      return false;
    }

    persist(mapUserRecord(data as Record<string, unknown>));
    return true;
  }

  async function registerUser(input: RegisterInput): Promise<boolean> {
    setError('');
    const name = input.name.trim();
    const agentCode = input.agentCode.trim();
    const leaderCode = input.leaderCode.trim();
    const pin = input.pin.trim();

    if (name.length < 2 || agentCode.length < 2 || pin.length !== 4) {
      setError('Name, agent code, and a 4-digit PIN are required.');
      return false;
    }

    if (!hasSupabaseConfig || !supabase) {
      persist({
        id: 'demo-user',
        name,
        org_id: org.id,
        role: 'agent',
        level: 'TA',
        agent_code: agentCode,
        leader_code: leaderCode.length > 0 ? leaderCode : null,
        is_manager: false,
      });
      return true;
    }

    const { data: existingName } = await supabase
      .from('users')
      .select('id')
      .eq('org_id', org.id)
      .ilike('name', name)
      .limit(1);

    if (existingName && existingName.length > 0) {
      setError('That name already exists in this organization.');
      return false;
    }

    const { data: existingCode } = await supabase
      .from('users')
      .select('id')
      .eq('org_id', org.id)
      .eq('agent_code', agentCode)
      .limit(1);

    if (existingCode && existingCode.length > 0) {
      setError('That agent code is already taken.');
      return false;
    }

    const payload = {
      org_id: org.id,
      name,
      pin_hash: hashPin(pin),
      role: 'agent',
      level: 'TA',
      agent_code: agentCode,
      leader_code: leaderCode.length > 0 ? leaderCode : null,
    };

    const { data, error: registerError } = await supabase
      .from('users')
      .insert(payload)
      .select('id,name,org_id,role,level,agent_code,leader_code')
      .single();

    if (registerError) {
      setError(registerError.message);
      return false;
    }

    persist(mapUserRecord(data as Record<string, unknown>));
    return true;
  }

  function signOut() {
    sessionStorage.removeItem(SESSION_KEY);
    setUser(null);
  }

  function clearError() {
    setError('');
  }

  const value = useMemo(
    () => ({ user, loading, error, login, registerUser, signOut, clearError }),
    [user, loading, error, org.id],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
