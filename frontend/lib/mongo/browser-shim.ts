/**
 * Browser-side query shim — sends a serialized "ops chain" to /api/db.
 * The server reconstructs the chain on top of the real MongoDB shim.
 *
 * Operation list shape: [["eq", "col", "val"], ["order", "col", true], ...]
 */

type SupaResponse<T> = { data: T | null; error: { message: string; code?: string } | null; count?: number }

class BrowserQuery<T = any> implements PromiseLike<SupaResponse<T>> {
  private mode: "select" | "insert" | "update" | "upsert" | "delete" = "select"
  private payload: any = null
  private selectStr?: string
  private upsertOnConflict?: string
  private isSingle = false
  private isMaybeSingle = false
  private countMode?: string
  private headOnly = false
  private chain: any[] = []

  constructor(private table: string) {}

  select(cols?: string, opts?: { count?: any; head?: boolean }) {
    // .select() called AFTER insert/update/upsert/delete is a "RETURNING" hint,
    // not a query mode change. Only set mode if we're still in default state.
    if (this.mode === "select") this.selectStr = cols
    else this.selectStr = cols
    if (this.mode === "select" || (!this.payload && this.mode !== "delete")) {
      this.mode = "select"
    }
    if (opts?.count) this.countMode = opts.count
    if (opts?.head) this.headOnly = true
    return this
  }
  insert(values: any | any[]) {
    this.mode = "insert"
    this.payload = Array.isArray(values) ? values : [values]
    return this
  }
  update(values: any) {
    this.mode = "update"
    this.payload = values
    return this
  }
  upsert(values: any | any[], opts?: { onConflict?: string }) {
    this.mode = "upsert"
    this.payload = Array.isArray(values) ? values : [values]
    this.upsertOnConflict = opts?.onConflict
    return this
  }
  delete() {
    this.mode = "delete"
    return this
  }

  // filters / modifiers — pushed onto chain as ["op", ...args]
  eq(c: string, v: any) {
    this.chain.push(["eq", c, v])
    return this
  }
  neq(c: string, v: any) {
    this.chain.push(["neq", c, v])
    return this
  }
  gt(c: string, v: any) {
    this.chain.push(["gt", c, v])
    return this
  }
  gte(c: string, v: any) {
    this.chain.push(["gte", c, v])
    return this
  }
  lt(c: string, v: any) {
    this.chain.push(["lt", c, v])
    return this
  }
  lte(c: string, v: any) {
    this.chain.push(["lte", c, v])
    return this
  }
  in(c: string, arr: any[]) {
    this.chain.push(["in", c, arr])
    return this
  }
  is(c: string, v: any) {
    this.chain.push(["is", c, v])
    return this
  }
  ilike(c: string, p: string) {
    this.chain.push(["ilike", c, p])
    return this
  }
  like(c: string, p: string) {
    this.chain.push(["like", c, p])
    return this
  }
  contains(c: string, v: any) {
    this.chain.push(["contains", c, v])
    return this
  }
  not(c: string, op: string, v: any) {
    this.chain.push(["not", c, op, v])
    return this
  }
  or(filterStr: string) {
    this.chain.push(["or", filterStr])
    return this
  }
  match(o: Record<string, any>) {
    for (const k of Object.keys(o)) this.chain.push(["eq", k, o[k]])
    return this
  }
  order(column: string, opts?: { ascending?: boolean }) {
    this.chain.push(["order", column, opts?.ascending !== false])
    return this
  }
  limit(n: number) {
    this.chain.push(["limit", n])
    return this
  }
  range(from: number, to: number) {
    this.chain.push(["range", from, to])
    return this
  }
  single() {
    this.isSingle = true
    return this
  }
  maybeSingle() {
    this.isMaybeSingle = true
    return this
  }

  private serialize() {
    return {
      table: this.table,
      mode: this.mode,
      chain: this.chain,
      payload: this.payload,
      selectStr: this.selectStr,
      upsertOnConflict: this.upsertOnConflict,
      isSingle: this.isSingle,
      isMaybeSingle: this.isMaybeSingle,
      countMode: this.countMode,
      headOnly: this.headOnly,
    }
  }

  async _exec(): Promise<SupaResponse<any>> {
    try {
      const res = await fetch("/api/db", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(this.serialize()),
      })
      const json = await res.json()
      return json
    } catch (e: any) {
      return { data: null, error: { message: e?.message || "Network error" } }
    }
  }

  then<R1 = SupaResponse<T>, R2 = never>(
    onfulfilled?: ((v: SupaResponse<T>) => R1 | PromiseLike<R1>) | null,
    onrejected?: ((r: any) => R2 | PromiseLike<R2>) | null
  ): PromiseLike<R1 | R2> {
    return this._exec().then(onfulfilled as any, onrejected)
  }
}

class BrowserAuth {
  private listeners: Array<(event: string, session: any) => void> = []
  private cachedUser: any = null

  async getUser() {
    try {
      const res = await fetch("/api/auth/me", { credentials: "include" })
      if (!res.ok) return { data: { user: null }, error: null }
      const u = await res.json()
      this.cachedUser = u
      return { data: { user: u }, error: null }
    } catch {
      return { data: { user: null }, error: null }
    }
  }

  async getSession() {
    const r = await this.getUser()
    return { data: { session: r.data.user ? { user: r.data.user } : null }, error: null }
  }

  async signInWithPassword({ email, password }: { email: string; password: string }) {
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ email, password }),
    })
    const json = await res.json()
    if (!res.ok) return { data: { user: null, session: null }, error: { message: json.error || "Login failed" } }
    this.cachedUser = json
    this.listeners.forEach((cb) => cb("SIGNED_IN", { user: json }))
    return { data: { user: json, session: { user: json } }, error: null }
  }

  async signUp({
    email,
    password,
    options,
  }: {
    email: string
    password: string
    options?: { data?: any; emailRedirectTo?: string }
  }) {
    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ email, password, username: options?.data?.username }),
    })
    const json = await res.json()
    if (!res.ok)
      return { data: { user: null, session: null }, error: { message: json.error || "Signup failed" } }
    this.cachedUser = json
    this.listeners.forEach((cb) => cb("SIGNED_IN", { user: json }))
    return { data: { user: json, session: { user: json } }, error: null }
  }

  async signOut() {
    await fetch("/api/auth/logout", { method: "POST", credentials: "include" })
    this.cachedUser = null
    this.listeners.forEach((cb) => cb("SIGNED_OUT", null))
    return { error: null }
  }

  onAuthStateChange(cb: (event: string, session: any) => void) {
    this.listeners.push(cb)
    this.getUser().then((r) => {
      if (r.data.user) cb("SIGNED_IN", { user: r.data.user })
      else cb("SIGNED_OUT", null)
    })
    return {
      data: { subscription: { unsubscribe: () => { this.listeners = this.listeners.filter((c) => c !== cb) } } },
    }
  }

  async resetPasswordForEmail(_email: string) {
    return { data: null, error: null }
  }
  async updateUser(_attrs: any) {
    return { data: { user: this.cachedUser }, error: null }
  }
}

export class BrowserSupabaseClient {
  auth = new BrowserAuth()
  from(table: string) {
    return new BrowserQuery(table)
  }
  async rpc(fn: string, args: any = {}) {
    const res = await fetch("/api/rpc", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ fn, args }),
    })
    const json = await res.json()
    return json
  }
}

export function createBrowserClient() {
  return new BrowserSupabaseClient()
}
