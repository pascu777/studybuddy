/**
 * Client Supabase finto per la modalità demo. Implementa il sottoinsieme di API
 * usato dagli hook, su un dataset in memoria. Le scritture aggiornano lo stato
 * (perso al reload). Nessuna rete.
 */
import {
  buildDemoStore,
  DEMO_ADMIN_ID,
  DEMO_STUDENT_ID,
  DEMO_TUTOR_ID,
  type DemoStore,
} from './dataset';

const store: DemoStore = buildDemoStore();

let actingAs: string = DEMO_STUDENT_ID;
export function demoActingAs() {
  return actingAs;
}
export function demoSetActingAs(id: string) {
  actingAs = id;
}
export function demoStore() {
  return store;
}

let idc = 1;
const genId = () => `demo-gen-${Date.now()}-${idc++}`;

type Filter = [string, string, any];

function applyFilters(rows: any[], filters: Filter[]): any[] {
  return rows.filter((r) =>
    filters.every(([op, k, v]) => {
      const cur = r[k];
      switch (op) {
        case 'eq':
          return cur === v;
        case 'neq':
          return cur !== v;
        case 'in':
          return Array.isArray(v) && v.includes(cur);
        case 'gte':
          return cur >= v;
        case 'lte':
          return cur <= v;
        case 'is':
          return v === null ? cur == null : cur === v;
        default:
          return true;
      }
    }),
  );
}

class DemoQuery {
  private table: string;
  private op: 'select' | 'insert' | 'update' | 'upsert' | 'delete' = 'select';
  private payload: any = null;
  private onConflict: string | undefined;
  private filters: Filter[] = [];
  private orderBy: [string, boolean] | null = null;
  private lim: number | null = null;
  private singleMode: 'one' | 'maybe' | null = null;

  constructor(table: string) {
    this.table = table;
  }

  select() {
    return this;
  }
  insert(p: any) {
    this.op = 'insert';
    this.payload = p;
    return this;
  }
  update(p: any) {
    this.op = 'update';
    this.payload = p;
    return this;
  }
  upsert(p: any, o?: { onConflict?: string }) {
    this.op = 'upsert';
    this.payload = p;
    this.onConflict = o?.onConflict;
    return this;
  }
  delete() {
    this.op = 'delete';
    return this;
  }
  eq(k: string, v: any) {
    this.filters.push(['eq', k, v]);
    return this;
  }
  neq(k: string, v: any) {
    this.filters.push(['neq', k, v]);
    return this;
  }
  in(k: string, v: any[]) {
    this.filters.push(['in', k, v]);
    return this;
  }
  gte(k: string, v: any) {
    this.filters.push(['gte', k, v]);
    return this;
  }
  lte(k: string, v: any) {
    this.filters.push(['lte', k, v]);
    return this;
  }
  is(k: string, v: any) {
    this.filters.push(['is', k, v]);
    return this;
  }
  order(k: string, o?: { ascending?: boolean }) {
    this.orderBy = [k, o?.ascending !== false];
    return this;
  }
  limit(n: number) {
    this.lim = n;
    return this;
  }
  maybeSingle() {
    this.singleMode = 'maybe';
    return this.run();
  }
  singleRow() {
    this.singleMode = 'one';
    return this.run();
  }
  // supabase-js usa .single()
  single() {
    return this.singleRow();
  }
  then(res: (v: any) => any, rej?: (e: any) => any) {
    return this.run().then(res, rej);
  }

  private table_rows(): any[] {
    if (!(store as any)[this.table]) (store as any)[this.table] = [];
    return (store as any)[this.table];
  }

  private run(): Promise<{ data: any; error: any }> {
    const rows = this.table_rows();
    try {
      if (this.op === 'insert' || this.op === 'upsert') {
        const items = Array.isArray(this.payload) ? this.payload : [this.payload];
        const inserted: any[] = [];
        for (const raw of items) {
          const item = { ...raw };
          if (this.op === 'upsert' && this.onConflict) {
            const keys = this.onConflict.split(',').map((k) => k.trim());
            const idx = rows.findIndex((r) => keys.every((k) => r[k] === item[k]));
            if (idx >= 0) {
              rows[idx] = { ...rows[idx], ...item, updated_at: new Date().toISOString() };
              inserted.push(rows[idx]);
              continue;
            }
          }
          if (!item.id && rows.length && 'id' in (rows[0] ?? {})) item.id = genId();
          if (!item.created_at) item.created_at = new Date().toISOString();
          rows.push(item);
          inserted.push(item);
        }
        return Promise.resolve({ data: this.singleMode ? inserted[0] : inserted, error: null });
      }

      if (this.op === 'update') {
        const target = applyFilters(rows, this.filters);
        target.forEach((r) => Object.assign(r, this.payload, { updated_at: new Date().toISOString() }));
        return Promise.resolve({ data: this.singleMode ? (target[0] ?? null) : target, error: null });
      }

      if (this.op === 'delete') {
        const keep = rows.filter((r) => !applyFilters([r], this.filters).length);
        (store as any)[this.table] = keep;
        return Promise.resolve({ data: null, error: null });
      }

      // select
      let out = applyFilters(rows, this.filters).map((r) => ({ ...r }));
      if (this.orderBy) {
        const [k, asc] = this.orderBy;
        out.sort((a, b) => (a[k] > b[k] ? 1 : a[k] < b[k] ? -1 : 0) * (asc ? 1 : -1));
      }
      if (this.lim != null) out = out.slice(0, this.lim);
      if (this.singleMode === 'maybe') return Promise.resolve({ data: out[0] ?? null, error: null });
      if (this.singleMode === 'one')
        return Promise.resolve(
          out[0] ? { data: out[0], error: null } : { data: null, error: { message: 'No rows' } },
        );
      return Promise.resolve({ data: out, error: null });
    } catch (e) {
      return Promise.resolve({ data: null, error: e });
    }
  }
}

/* ------------------------------- auth ---------------------------------- */
const demoSession = {
  access_token: 'demo',
  refresh_token: 'demo',
  user: { id: DEMO_STUDENT_ID, email: 'demo@studybuddy.app' },
};

const authListeners: ((event: string, session: any) => void)[] = [];

function currentSession() {
  return { ...demoSession, user: { ...demoSession.user, id: actingAs } };
}

/** Alterna il ruolo demo (studente ⇄ tutor) e rinfresca la sessione. */
export function demoSwitchRole() {
  actingAs = actingAs === DEMO_STUDENT_ID ? DEMO_TUTOR_ID : DEMO_STUDENT_ID;
  authListeners.forEach((cb) => cb('SIGNED_IN', currentSession()));
}

/** Passa a un utente demo specifico (studente / tutor / admin) e rinfresca la sessione. */
export function demoActAs(id: string) {
  actingAs = id;
  authListeners.forEach((cb) => cb('SIGNED_IN', currentSession()));
}

const auth = {
  async getSession() {
    return { data: { session: currentSession() }, error: null };
  },
  onAuthStateChange(cb: (event: string, session: any) => void) {
    authListeners.push(cb);
    setTimeout(() => cb('SIGNED_IN', currentSession()), 0);
    return { data: { subscription: { unsubscribe() {} } } };
  },
  async signInWithPassword() {
    return { data: { session: demoSession }, error: null };
  },
  async signUp() {
    return { data: { session: demoSession, user: demoSession.user }, error: null };
  },
  async signOut() {
    return { error: null };
  },
  async resetPasswordForEmail() {
    return { data: {}, error: null };
  },
  async updateUser() {
    return { data: { user: demoSession.user }, error: null };
  },
};

/* ------------------------------ storage -------------------------------- */
const storage = {
  from() {
    return {
      async upload(path: string) {
        return { data: { path }, error: null };
      },
      getPublicUrl(path: string) {
        return { data: { publicUrl: path } };
      },
    };
  },
};

/* ------------------------------ realtime ------------------------------- */
function channel() {
  const ch: any = {
    on() {
      return ch;
    },
    subscribe() {
      return ch;
    },
    unsubscribe() {
      return Promise.resolve('ok');
    },
  };
  return ch;
}

/* -------------------------------- rpc --------------------------------- */
import { demoRpc } from './rpc';

export const demoClient: any = {
  from: (table: string) => new DemoQuery(table),
  rpc: (name: string, params: any) => {
    const p = Promise.resolve(demoRpc(name, params ?? {}, store, actingAs));
    return p.then((data) => ({ data, error: null }));
  },
  auth,
  storage,
  channel,
  removeChannel() {},
};

export { DEMO_ADMIN_ID, DEMO_STUDENT_ID, DEMO_TUTOR_ID };
