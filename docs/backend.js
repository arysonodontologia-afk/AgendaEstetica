// Camada de dados: Firebase (Auth + Firestore), carregado direto do CDN oficial do Google.
const V = '10.14.1', CDN = `https://www.gstatic.com/firebasejs/${V}/`;

export async function makeBackend(cfg) {
  if (!cfg || !cfg.apiKey || !cfg.projectId) return { demo: true };
  const [A, Au, F] = await Promise.all([
    import(CDN + 'firebase-app.js'),
    import(CDN + 'firebase-auth.js'),
    import(CDN + 'firebase-firestore.js'),
  ]);
  const app = A.initializeApp(cfg), auth = Au.getAuth(app), fs = F.getFirestore(app);
  const wrap = s => ({ docs: s.docs.map(d => ({ id: d.id, data: () => d.data() })) });
  const snap1 = s => ({ exists: s.exists(), data: () => s.data() });

  const docApi = path => {
    const r = F.doc(fs, path);
    return {
      set: d => F.setDoc(r, d),
      update: d => F.updateDoc(r, d),
      delete: () => F.deleteDoc(r),
      get: async () => snap1(await F.getDoc(r)),
      onSnapshot: (ok, err) => F.onSnapshot(r, s => ok(snap1(s)), err),
      // "trava" curta usada para impedir dois agendamentos simultâneos no mesmo dia
      acquire: async ({ holder, ttlMs }) => {
        try {
          return await F.runTransaction(fs, async t => {
            const s = await t.get(r), d = s.exists() ? s.data() : null;
            if (d && d.exp > Date.now() && d.holder !== holder) return { acquired: false };
            t.set(r, { holder, exp: Date.now() + ttlMs });
            return { acquired: true };
          });
        } catch (e) { return { acquired: false }; }
      },
    };
  };
  const colApi = path => {
    const c = F.collection(fs, path);
    return {
      doc: id => docApi(path + '/' + id),
      onSnapshot: (ok, err) => F.onSnapshot(c, s => ok(wrap(s)), err),
      get: async () => wrap(await F.getDocs(c)),
      where: (f, op, v) => ({ get: async () => wrap(await F.getDocs(F.query(c, F.where(f, op, v)))) }),
    };
  };

  const be = {
    demo: false,
    nomeNovo: '',
    db: { collection: colApi, doc: docApi },
    onUser: cb => Au.onAuthStateChanged(auth, cb),
    signIn: (email, senha) => Au.signInWithEmailAndPassword(auth, email, senha),
    signUp: async (nome, email, senha) => { be.nomeNovo = nome; return Au.createUserWithEmailAndPassword(auth, email, senha); },
    reset: email => Au.sendPasswordResetEmail(auth, email),
    signOut: () => Au.signOut(auth),
  };
  return be;
}
