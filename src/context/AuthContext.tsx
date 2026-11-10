import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabaseClient';
import { INITIAL_WAREHOUSE } from '../utils/calculations';

export interface AuthenticatedProfile {
  id: string;
  email: string;
  fullName: string;
  role: 'owner' | 'manager' | 'operator';
  organizationId: string;
  organizationName: string;
  jib: string;
  pdv: string;
  address: string;
  logoUrl?: string;
}

export interface SignUpPayload {
  email: string;
  password: string;
  fullName: string;
  organizationName: string;
  jib: string;
  pdv: string;
  address: string;
}

interface AuthContextValue {
  user: AuthenticatedProfile | null;
  loading: boolean;
  isSupabaseReady: boolean;
  signIn: (
    email: string,
    password: string
  ) => Promise<{ error: string | null }>;
  signUp: (payload: SignUpPayload) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  signInDemoTenant: (tenantName?: string) => void;
}

const DEMO_AUTH_STORAGE_KEY = 'roletnapro_saas_session_v4';

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<AuthenticatedProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const loadSupabaseUserProfile = useCallback(
    async (userId: string, email: string) => {
      try {
        const { data: profile, error: profError } = await supabase
          .from('profiles')
          .select('id, organization_id, full_name, role')
          .eq('id', userId)
          .single();

        if (profError || !profile) {
          setLoading(false);
          return;
        }

        const { data: org } = await supabase
          .from('organizations')
          .select('id, name, jib, pdv, address, logo_url')
          .eq('id', profile.organization_id)
          .single();

        setUser({
          id: userId,
          email,
          fullName: profile.full_name,
          role: (profile.role as 'owner' | 'manager' | 'operator') || 'owner',
          organizationId: profile.organization_id,
          organizationName: org?.name || 'RoletnaPro Firma d.o.o.',
          jib: org?.jib || '4201948510006',
          pdv: org?.pdv || '201948510006',
          address: org?.address || 'Rajlovačka cesta bb, Sarajevo',
          logoUrl: org?.logo_url || '',
        });
      } finally {
        setLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    if (!isSupabaseConfigured) {
      try {
        const saved = localStorage.getItem(DEMO_AUTH_STORAGE_KEY);
        if (saved) {
          setUser(JSON.parse(saved) as AuthenticatedProfile);
        } else {
          // Podrazumijevana aktivna sesija za trenutni pregled ako korisnik još nije podesio .env
          const defaultSession: AuthenticatedProfile = {
            id: 'usr-owner-01',
            email: 'emir.hadzic@roletnapro.ba',
            fullName: 'Ing. Emir Hadžić, dipl. maš.',
            role: 'owner',
            organizationId: 'org-sarajevo-01',
            organizationName: 'ROLETNAPRO d.o.o. Sarajevo',
            jib: '4201948510006',
            pdv: '201948510006',
            address: 'Rajlovačka cesta bb, 71000 Sarajevo',
            logoUrl: '',
          };
          setUser(defaultSession);
          localStorage.setItem(
            DEMO_AUTH_STORAGE_KEY,
            JSON.stringify(defaultSession)
          );
        }
      } catch {
        // ignore
      }
      setLoading(false);
      return;
    }

    // Prava Supabase sesija
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        loadSupabaseUserProfile(session.user.id, session.user.email || '');
      } else {
        setLoading(false);
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        loadSupabaseUserProfile(session.user.id, session.user.email || '');
      } else {
        setUser(null);
        setLoading(false);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [loadSupabaseUserProfile]);

  const signIn = async (
    email: string,
    password: string
  ): Promise<{ error: string | null }> => {
    if (!isSupabaseConfigured) {
      const demoProfile: AuthenticatedProfile = {
        id: crypto.randomUUID(),
        email: email.trim(),
        fullName: 'Ing. Emir Hadžić',
        role: 'owner',
        organizationId: 'org-sarajevo-01',
        organizationName: 'ROLETNAPRO d.o.o. Sarajevo',
        jib: '4201948510006',
        pdv: '201948510006',
        address: 'Rajlovačka cesta bb, 71000 Sarajevo',
      };
      setUser(demoProfile);
      localStorage.setItem(DEMO_AUTH_STORAGE_KEY, JSON.stringify(demoProfile));
      return { error: null };
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (error) {
      return { error: error.message };
    }

    if (data.user) {
      await loadSupabaseUserProfile(data.user.id, data.user.email || '');
    }
    return { error: null };
  };

  const signUp = async (
    payload: SignUpPayload
  ): Promise<{ error: string | null }> => {
    if (!isSupabaseConfigured) {
      const newProfile: AuthenticatedProfile = {
        id: crypto.randomUUID(),
        email: payload.email.trim(),
        fullName: payload.fullName.trim(),
        role: 'owner',
        organizationId: crypto.randomUUID(),
        organizationName: payload.organizationName.trim(),
        jib: payload.jib.trim(),
        pdv: payload.pdv.trim(),
        address: payload.address.trim(),
      };
      setUser(newProfile);
      localStorage.setItem(DEMO_AUTH_STORAGE_KEY, JSON.stringify(newProfile));
      return { error: null };
    }

    // 1. Kreiraj korisnika u Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: payload.email.trim(),
      password: payload.password,
    });

    if (authError || !authData.user) {
      return {
        error: authError?.message || 'Greška pri registraciji korisnika.',
      };
    }

    const userId = authData.user.id;

    // 2. Kreiraj zapis u tabeli `organizations`
    const { data: orgData, error: orgError } = await supabase
      .from('organizations')
      .insert({
        name: payload.organizationName.trim(),
        jib: payload.jib.trim(),
        pdv: payload.pdv.trim(),
        address: payload.address.trim(),
        email: payload.email.trim(),
        authorized_person: payload.fullName.trim(),
      })
      .select()
      .single();

    if (orgError || !orgData) {
      return {
        error:
          orgError?.message ||
          'Greška pri kreiranju organizacije u bazi podataka.',
      };
    }

    // 3. Kreiraj zapis u tabeli `profiles` sa ulogom `owner`
    const { error: profileError } = await supabase.from('profiles').insert({
      id: userId,
      organization_id: orgData.id,
      full_name: payload.fullName.trim(),
      role: 'owner',
    });

    if (profileError) {
      return { error: profileError.message };
    }

    // 4. Inicijalizuj početne artikle u skladištu za novu firmu
    const initialWarehouseRows = INITIAL_WAREHOUSE.map((item) => ({
      organization_id: orgData.id,
      code: item.sifra,
      name: item.naziv,
      type: item.kategorija,
      ral_color: item.boja,
      quantity: item.stanje,
      unit: item.jedinica,
      min_stock: item.minZaliha,
      price_per_unit: item.cijenaPoJediniciKM,
    }));

    await supabase.from('warehouse_items').insert(initialWarehouseRows);

    await loadSupabaseUserProfile(userId, payload.email.trim());
    return { error: null };
  };

  const signOut = async () => {
    if (isSupabaseConfigured) {
      await supabase.auth.signOut();
    }
    localStorage.removeItem(DEMO_AUTH_STORAGE_KEY);
    setUser(null);
  };

  const signInDemoTenant = (tenantName?: string) => {
    const demoProfile: AuthenticatedProfile = {
      id: crypto.randomUUID(),
      email: 'direktor@roletnapro.ba',
      fullName: 'Ing. Emir Hadžić, dipl. maš.',
      role: 'owner',
      organizationId: 'org-sarajevo-01',
      organizationName: tenantName || 'ROLETNAPRO d.o.o. Sarajevo',
      jib: '4201948510006',
      pdv: '201948510006',
      address: 'Rajlovačka cesta bb, 71000 Sarajevo',
    };
    setUser(demoProfile);
    localStorage.setItem(DEMO_AUTH_STORAGE_KEY, JSON.stringify(demoProfile));
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isSupabaseReady: isSupabaseConfigured,
        signIn,
        signUp,
        signOut,
        signInDemoTenant,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth mora biti korišten unutar AuthProvider-a');
  }
  return ctx;
}
