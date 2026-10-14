import { makeBackend } from './backend.js';

/* ---------- utilidades ---------- */
const $ = s => document.querySelector(s), pad = n => String(n).padStart(2, '0');
const iso = d => d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
const prs = s => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
const addD = (s, n) => { const d = prs(s); d.setDate(d.getDate() + n); return iso(d); };
const hoje = () => iso(new Date()), wk = s => addD(s, -((prs(s).getDay() + 6) % 7));
const DS = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
const DSC = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const MS = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
const MSC = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
const fd = s => { const d = prs(s); return DSC[d.getDay()] + ', ' + pad(d.getDate()) + '/' + pad(d.getMonth() + 1); };
const brl = v => 'R$ ' + Number(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const h2m = h => { const [a, b] = h.split(':').map(Number); return a * 60 + b; };
const m2h = m => pad(Math.floor(m / 60) % 24) + ':' + pad(m % 60);
const prim = n => String(n || '').trim().split(' ')[0], bday = s => s.slice(8) + '/' + s.slice(5, 7);
const byNome = (a, b) => (a.nome || '').localeCompare(b.nome || '', 'pt-BR');
const ST = { agendado: ['Agendado', 'wn'], confirmado: ['Confirmado', 'ok'], atendido: ['Atendido', 'in'], faltou: ['Faltou', 'er'], cancelado: ['Cancelado', 'mu'] };
const SUG = [['Drenagem linfática', 60, 150], ['Bioestimulador de colágeno', 60, 1200], ['Limpeza de pele', 75, 180], ['Peeling', 45, 200], ['Microagulhamento', 60, 350], ['Massagem modeladora', 50, 130], ['Radiofrequência', 45, 220]];

/* ---------- ícones ---------- */
const ic = p => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${p}</svg>`;
const IC = {
  cal: ic('<rect x="3.5" y="5" width="17" height="15.5" rx="3.5"/><path d="M8 3v4M16 3v4M3.5 10h17"/>'),
  users: ic('<circle cx="9" cy="8.5" r="3.5"/><path d="M2.8 20c.6-3.6 3-5.5 6.2-5.5s5.6 1.9 6.2 5.5"/><path d="M16 5.2a3.3 3.3 0 0 1 0 6.1M18.5 14.8c1.6.8 2.7 2.4 3 5.2"/>'),
  chart: ic('<path d="M4 20V10M10 20V4M16 20v-7M21 20H3"/>'),
  sliders: ic('<path d="M4 7h9M17 7h3M4 17h3M11 17h9"/><circle cx="15" cy="7" r="2"/><circle cx="9" cy="17" r="2"/>'),
  plus: ic('<path d="M12 5v14M5 12h14"/>'),
  prev: ic('<path d="m14.5 6-6 6 6 6"/>'),
  next: ic('<path d="m9.5 6 6 6-6 6"/>'),
  search: ic('<circle cx="11" cy="11" r="6.5"/><path d="m16 16 4 4"/>'),
  lotus: `<svg viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true">${[0, 1, 2, 3, 4, 5].map(k => `<ellipse cx="32" cy="19" rx="6" ry="13" transform="rotate(${k * 60} 32 32)"/>`).join('')}<circle cx="32" cy="32" r="3.5"/></svg>`,
};
const LOGO = `<svg class="logo" viewBox="0 0 100 100" aria-hidden="true"><defs><linearGradient id="lg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#cf7a91"/><stop offset="1" stop-color="#8e3a52"/></linearGradient></defs><rect width="100" height="100" rx="24" fill="url(#lg)"/>${[0, 1, 2, 3, 4, 5, 6, 7].map(k => `<ellipse cx="50" cy="31" rx="7.5" ry="17" fill="#fff" fill-opacity=".86" transform="rotate(${k * 45} 50 50)"/>`).join('')}<circle cx="50" cy="50" r="6.5" fill="#e3c08f"/></svg>`;

/* ---------- estado ---------- */
const S = { clientes: [], agendamentos: [], servicos: [], profissionais: [], claims: [], usuarios: [], config: { nome: '' } };
const V = { tab: 'agenda', mode: 'dia', date: hoje(), rm: hoje().slice(0, 7), q: '', prof: '', auth: 'login' };
const ME = { id: null, admin: true, nome: '', email: '' };
let DB = null, B = null, REC = {}, R = {}, recKey = '', recUn = [], UNS = [];
const LS = 'agendaEstetica';
const lsSave = () => { try { localStorage.setItem(LS, JSON.stringify(S)); } catch (e) { } };
const lim = (p, ms = 12000) => Promise.race([p, new Promise((_, r) => setTimeout(() => r(new Error('timeout')), ms))]);

let tt;
function note(t) { const e = $('#toast'); e.textContent = t; e.classList.add('on'); clearTimeout(tt); tt = setTimeout(() => e.classList.remove('on'), 3200); }
function toast(t) { const w = $('#wn'); if (w) w.textContent = t; else note(t); }

async function put(col, o) {
  o = JSON.parse(JSON.stringify(o));
  const id = o.id || ('i' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5)); delete o.id;
  try {
    if (DB) await lim(DB.collection(col).doc(id).set(o));
    else { const a = S[col], i = a.findIndex(x => x.id === id), n = Object.assign({ id }, o); if (i < 0) a.push(n); else a[i] = n; lsSave(); render(); }
  } catch (e) { toast('Não foi possível salvar. Verifique a conexão e tente de novo.'); throw e; }
  return id;
}
async function del(col, id) {
  try { if (DB) await lim(DB.collection(col).doc(id).delete()); else { S[col] = S[col].filter(x => x.id !== id); lsSave(); render(); } }
  catch (e) { note('Não foi possível excluir.'); }
}
async function saveCfg(nome) { S.config.nome = nome; try { if (DB) await lim(DB.doc('config/geral').set({ nome })); else lsSave(); } catch (e) { note('Não foi possível salvar.'); } }
const upd = async (id, p) => {
  if (DB) { try { await lim(DB.collection('agendamentos').doc(id).update(p)); } catch (e) { toast('Não foi possível salvar. Tente de novo.'); throw e; } return; }
  const a = S.agendamentos.find(x => x.id === id); if (a) await put('agendamentos', Object.assign({}, a, p));
};

const cli = id => S.clientes.find(c => c.id === id) || { nome: '(cliente removido)', tel: '' };
const myProf = () => (S.claims.find(c => c.id === ME.id) || {}).prof || '';
const claimUid = p => (S.claims.find(c => c.prof === p) || {}).id || '';
const canAct = a => !DB || ME.admin || (!!myProf() && a.profissionalId === myProf());
const vr = a => { const r = REC[a.id]; return r ? +r.valor || 0 : (+a.valorRecebido || 0); };

/* trava curta por dia: impede dois agendamentos no mesmo horário quando duas pessoas salvam juntas */
async function withLock(date, fn) {
  if (!DB) return await fn(S.agendamentos.filter(a => a.data === date));
  const key = 'locks/d' + date.replace(/-/g, ''), holder = (ME.id || 'x') + Math.random().toString(36).slice(2, 6);
  try {
    let got = false;
    for (let i = 0; i < 8 && !got; i++) { const r = await DB.doc(key).acquire({ holder, ttlMs: 10000 }); got = r.acquired; if (!got) await new Promise(z => setTimeout(z, 500)); }
    if (!got) return { err: 'A agenda está sendo alterada por outra pessoa. Tente de novo.' };
    try {
      const snap = await DB.collection('agendamentos').where('data', '==', date).get();
      return await fn(snap.docs.map(d => Object.assign({ id: d.id }, d.data())));
    } finally { try { await DB.doc(key).delete(); } catch (e) { } }
  } catch (e) { return { err: 'Não foi possível salvar. Verifique a conexão.' }; }
}

/* valores recebidos ficam em área privada de cada profissional (a administradora lê todas) */
function subRec() {
  if (!DB || !ME.id) return;
  const ids = ME.admin ? [...new Set(S.claims.map(c => c.id).concat(ME.id))] : [ME.id], k = ids.join(',');
  if (k === recKey) return; recKey = k; recUn.forEach(f => f()); recUn = []; R = {};
  ids.forEach(u => recUn.push(DB.collection('financeiro/' + u + '/recebimentos').onSnapshot(s => {
    R[u] = s.docs.map(d => Object.assign({ id: d.id }, d.data())); REC = {};
    Object.values(R).forEach(l => l.forEach(x => REC[x.id] = x)); render();
  }, () => { })));
}

/* ---------- peças de interface ---------- */
const apts = d => S.agendamentos.filter(a => a.data === d && (!V.prof || a.profissionalId === V.prof)).sort((a, b) => a.hora.localeCompare(b.hora));
const wa = (tel, txt) => { let d = String(tel || '').replace(/\D/g, ''); if (!d) return '#'; if (d.length <= 11) d = '55' + d; return 'https://wa.me/' + d + '?text=' + encodeURIComponent(txt); };
const msgC = (a, c) => `Olá, ${prim(c.nome)}! Aqui é do ${S.config.nome || 'nosso espaço'}. Passando para confirmar seu horário: ${a.servicoNome}${a.profissionalNome ? ' com ' + a.profissionalNome : ''}, ${fd(a.data)} às ${a.hora}. Responda *1* para CONFIRMAR ou *2* para REMARCAR. 💆‍♀️`;
const vazio = t => `<p class="vz">${t}</p>`;
const sheet = h => { $('#pn').innerHTML = h; $('#sh').hidden = false; };
const closeSheet = () => { $('#sh').hidden = true; V.del = null; };
const hello = () => { const h = new Date().getHours(); return h < 12 ? 'Bom dia' : h < 18 ? 'Boa tarde' : 'Boa noite'; };
const meuNome = () => prim((S.profissionais.find(p => p.id === myProf()) || {}).nome || ME.nome);
const mode = m => { document.body.dataset.mode = m; };

function chips() {
  if (!S.profissionais.length) return '';
  return `<div class="chips"><button data-a="fprof" data-v="" class="${!V.prof ? 'on' : ''}">Todas</button>${S.profissionais.slice().sort(byNome).map(p => `<button data-a="fprof" data-v="${p.id}" class="${V.prof === p.id ? 'on' : ''}">${esc(prim(p.nome))}</button>`).join('')}</div>`;
}
function card(a) {
  const c = cli(a.clienteId), st = ST[a.status] || ST.agendado;
  return `<article class="apt" style="--c:var(--${st[1]})" data-a="apt" data-v="${a.id}"><div class="t"><b>${a.hora}</b><span>${m2h(h2m(a.hora) + (a.dur || 60))}</span></div><i class="bar"></i><div class="i"><h4>${esc(c.nome)}</h4><p>${esc(a.servicoNome)}${a.profissionalNome && !V.prof ? ' · ' + esc(prim(a.profissionalNome)) : ''}${a.remarcacoes ? ' · remarcado' : ''}</p></div><span class="chip">${st[0]}</span>${!a.tcle && ['agendado', 'confirmado'].includes(a.status) ? '<i class="tcd" title="TCLE pendente"></i>' : ''}</article>`;
}
const empty = () => `<div class="empty">${IC.lotus}<h3>Dia livre</h3><p>Nenhum horário marcado.</p><button class="btn pr" data-a="fab">Agendar agora</button></div>`;
const lista = d => { const l = apts(d); return l.length ? l.map(card).join('') : empty(); };
const navRow = label => `<div class="nv"><button class="rb" data-a="prev" aria-label="Anterior">${IC.prev}</button><b>${label}</b><button class="rb" data-a="next" aria-label="Próximo">${IC.next}</button><button class="pill" data-a="hoje">Hoje</button></div>`;

function vAgenda() {
  const M = V.mode; let eyebrow, title, label, body;
  if (M === 'dia') {
    const d = prs(V.date), l = apts(V.date).filter(a => a.status !== 'cancelado'), cf = l.filter(a => ['confirmado', 'atendido'].includes(a.status)).length;
    eyebrow = DS[d.getDay()] + (V.date === hoje() ? ' · hoje' : ''); title = d.getDate() + ' de ' + MS[d.getMonth()].toLowerCase(); label = fd(V.date);
    body = (l.length ? `<div class="resumo"><span>${l.length} horário${l.length > 1 ? 's' : ''}</span><span>${cf} confirmado${cf === 1 ? '' : 's'}</span></div>` : '') + lista(V.date);
  } else if (M === 'semana') {
    const s = wk(V.date), e = addD(s, 6), p = prs(s), q = prs(e);
    eyebrow = 'Semana'; title = p.getDate() + ' – ' + q.getDate() + ' ' + MSC[q.getMonth()]; label = pad(p.getDate()) + '/' + pad(p.getMonth() + 1) + ' – ' + pad(q.getDate()) + '/' + pad(q.getMonth() + 1);
    body = [0, 1, 2, 3, 4, 5, 6].map(i => {
      const d = addD(s, i), l = apts(d), dd = prs(d);
      return `<div class="day"><div class="dh ${d === hoje() ? 'hj' : ''}" data-a="goDia" data-v="${d}"><span class="dn">${dd.getDate()}</span><span class="w">${DS[dd.getDay()]}</span><span class="ct">${l.length ? l.length + ' horário' + (l.length > 1 ? 's' : '') : 'livre'}</span></div>${l.map(card).join('')}</div>`;
    }).join('');
  } else {
    const b = prs(V.date), y = b.getFullYear(), m = b.getMonth(), off = (new Date(y, m, 1).getDay() + 6) % 7, n = new Date(y, m + 1, 0).getDate();
    eyebrow = y; title = MS[m]; label = MSC[m] + ' ' + y;
    let g = '<div class="mg">' + ['seg', 'ter', 'qua', 'qui', 'sex', 'sáb', 'dom'].map(x => `<div class="w">${x}</div>`).join('') + '<div class="c v"></div>'.repeat(off);
    for (let d = 1; d <= n; d++) {
      const s = y + '-' + pad(m + 1) + '-' + pad(d), k = apts(s).filter(a => a.status !== 'cancelado').length;
      g += `<button class="c ${s === hoje() ? 'hj' : ''} ${s === V.date ? 'sel' : ''}" data-a="pick" data-v="${s}">${d}${k ? `<i>${'<b></b>'.repeat(Math.min(k, 3))}</i>` : ''}</button>`;
    }
    body = g + '</div>' + `<h3 class="sub">${DS[prs(V.date).getDay()]}, ${prs(V.date).getDate()} de ${MS[prs(V.date).getMonth()].toLowerCase()}</h3>` + lista(V.date);
  }
  const hi = meuNome() && M === 'dia' ? `<p class="hello">${hello()}, ${esc(meuNome())}</p>` : '';
  return `<header class="top"><div>${hi}<p class="eyebrow">${eyebrow}</p><h1>${title}</h1></div></header>${chips()}<div class="seg">${['dia', 'semana', 'mes'].map(m => `<button data-a="mode" data-v="${m}" class="${M === m ? 'on' : ''}">${{ dia: 'Dia', semana: 'Semana', mes: 'Mês' }[m]}</button>`).join('')}</div>${navRow(label)}${body}`;
}
function mv(k) {
  if (V.mode === 'dia') V.date = addD(V.date, k); else if (V.mode === 'semana') V.date = addD(V.date, 7 * k);
  else { const d = prs(V.date); d.setDate(1); d.setMonth(d.getMonth() + k); V.date = iso(d); }
  render();
}

function aptSheet(id) {
  const a = S.agendamentos.find(x => x.id === id); if (!a) return; const c = cli(a.clienteId), st = ST[a.status] || ST.agendado;
  sheet(`<h3>${esc(c.nome)}</h3><div class="det"><span class="chip" style="--c:var(--${st[1]});align-self:flex-start">${st[0]}</span><p class="mu" style="margin:6px 0 0">${esc(a.servicoNome)}${a.profissionalNome ? ' · ' + esc(a.profissionalNome) : ''}</p><p class="mu" style="margin:0">${fd(a.data)} · ${a.hora} – ${m2h(h2m(a.hora) + (a.dur || 60))} · ${brl(a.valor)}</p>${a.msgEnviada && a.status === 'agendado' ? '<p class="mu" style="margin:0">Pedido de confirmação enviado — aguardando resposta</p>' : ''}${a.obs ? `<p style="margin:8px 0 0">${esc(a.obs)}</p>` : ''}</div>
  <a class="btn wa" href="${wa(c.tel, msgC(a, c))}" target="_blank" rel="noopener" data-a="sent" data-v="${id}">Pedir confirmação no WhatsApp</a>
  <button class="btn" data-a="tcle" data-v="${id}" style="margin-top:10px">${a.tcle ? '✓ TCLE assinado' : '📝 TCLE do procedimento · pendente'}</button><div class="acts" style="margin-top:10px"><button class="btn" data-a="st" data-v="${id}" data-s="confirmado">✓ Confirmou</button>${canAct(a) ? `<button class="btn" data-a="atend" data-v="${id}">✔ Atendido</button>` : ''}<button class="btn" data-a="editApt" data-v="${id}">Remarcar / editar</button><button class="btn" data-a="st" data-v="${id}" data-s="faltou">Faltou</button><button class="btn" data-a="st" data-v="${id}" data-s="cancelado">Cancelar</button><button class="btn dg" data-a="delApt" data-v="${id}">Excluir</button></div>`);
}

/* ---------- regra: nada de horário no passado ---------- */
const agoraHM = () => { const d = new Date(); return pad(d.getHours()) + ':' + pad(d.getMinutes()); };
const proxSlot = () => { const d = new Date(), m = Math.ceil((d.getHours() * 60 + d.getMinutes() + 1) / 15) * 15; return m; };
function slotsHora(data, atual) {
  const min = data === hoje() ? proxSlot() : 0, out = [];
  for (let m = 7 * 60; m <= 21 * 60 + 45; m += 15) if (m >= min) out.push(m2h(m));
  if (atual && !out.includes(atual)) out.push(atual); out.sort();
  return out;
}
function horaOpts(data, sel, atual) {
  const l = slotsHora(data, atual);
  if (!l.length) return '<option value="" disabled selected>Sem horários hoje — escolha outra data</option>';
  return l.map(h => `<option ${h === sel ? 'selected' : ''}>${h}</option>`).join('');
}
const noPassado = (data, hora) => data < hoje() || (data === hoje() && hora < agoraHM());

function aptForm(id, pre) {
  const sv = S.servicos;
  if (!sv.length) { sheet('<h3>Cadastre os procedimentos</h3><p class="mu">Antes de agendar, adicione os procedimentos em Ajustes.</p><button class="btn pr" data-a="tab" data-v="ajustes">Ir para Ajustes</button>'); return; }
  const o = id ? S.agendamentos.find(x => x.id === id) : null, f = sv.find(x => x.id === (o && o.servicoId)) || sv[0];
  const a = o || Object.assign({ data: V.date < hoje() ? hoje() : V.date, hora: '09:00', dur: f.dur, valor: f.valor, clienteId: '' }, pre || {});
  if (!o) { const ls = slotsHora(a.data); if (!ls.includes(a.hora)) a.hora = ls[0] || ''; }
  V.edit = id || null;
  const pf = a.profissionalId || V.prof || myProf() || '';
  const profField = S.profissionais.length ? `<label>Profissional</label><select id="fpr">${S.profissionais.slice().sort(byNome).map(p => `<option value="${p.id}" ${p.id === pf ? 'selected' : ''}>${esc(p.nome)}</option>`).join('')}</select>` : '';
  sheet(`<h3>${id ? 'Remarcar / editar' : 'Novo agendamento'}</h3><label>Cliente</label><select id="fc"><option value="">Selecione…</option><option value="__n">＋ Novo cliente</option>${S.clientes.slice().sort(byNome).map(c => `<option value="${c.id}" ${c.id === a.clienteId ? 'selected' : ''}>${esc(c.nome)}</option>`).join('')}</select>
  <div id="nc" hidden><input id="nn" placeholder="Nome completo"><input id="ncpf" inputmode="numeric" placeholder="CPF (000.000.000-00)"><input id="nt" type="tel" placeholder="WhatsApp com DDD"><label>Aniversário</label><input id="nb" type="date"></div>
  <label>Procedimento</label><select id="fs">${sv.map(s => `<option value="${s.id}" data-d="${s.dur}" data-v="${s.valor}" ${s.id === f.id ? 'selected' : ''}>${esc(s.nome)}</option>`).join('')}</select>
  ${profField}<div class="rw"><div><label>Data</label><input id="fdt" type="date" value="${a.data}" ${o && o.data < hoje() ? '' : `min="${hoje()}"`}></div><div><label>Hora</label><select id="fh">${horaOpts(a.data, a.hora, o && o.data === a.data ? o.hora : '')}</select></div></div>
  <div class="rw"><div><label>Duração (min)</label><input id="fu" type="number" inputmode="numeric" value="${a.dur}"></div><div><label>Valor (R$)</label><input id="fv" type="number" inputmode="decimal" step="0.01" value="${a.valor}"></div></div>
  <label>Observações</label><input id="fo" value="${esc(a.obs || '')}"><p id="wn" class="er"></p><button class="btn pr" id="svb" data-a="saveApt">Salvar</button>`);
}
async function saveApt() {
  let cid = $('#fc').value; const sid = $('#fs').value, data = $('#fdt').value, hora = $('#fh').value;
  if (!cid || !sid || !data || !hora) { toast('Preencha cliente, procedimento, data e hora.'); return; }
  { const o0 = V.edit ? S.agendamentos.find(x => x.id === V.edit) : null; if ((!o0 || o0.data !== data || o0.hora !== hora) && noPassado(data, hora)) { toast('Esse horário já passou. ' + (data === hoje() ? 'Escolha a partir de ' + (slotsHora(data)[0] || 'amanhã') + '.' : 'Escolha uma data a partir de hoje.')); return; } }
  const pid = ($('#fpr') || {}).value || '', dur = +$('#fu').value || 60, btn = $('#svb'), nn = ($('#nn') || { value: '' }).value.trim();
  if (cid === '__n' && !nn) { toast('Informe o nome do novo cliente.'); return; }
  const ncpf = ($('#ncpf') || { value: '' }).value.trim(); if (cid === '__n' && !ncpf) { toast('Informe o CPF do novo cliente.'); return; } if (cid === '__n' && !cpfOk(ncpf)) { toast('CPF inválido. Confira os números.'); return; }
  if (cid === '__n' && S.clientes.some(x => String(x.cpf || '').replace(/\D/g, '') === ncpf.replace(/\D/g, ''))) { toast('Este CPF já está cadastrado. Selecione a cliente na lista.'); return; }
  const old = V.edit ? S.agendamentos.find(x => x.id === V.edit) : null, s = S.servicos.find(x => x.id === sid) || { nome: '—' };
  if (btn) btn.disabled = true;
  const r = await withLock(data, async list => {
    const act = x => !['cancelado', 'faltou'].includes(x.status);
    const cf = list.filter(x => x.id !== V.edit && x.data === data && act(x) && h2m(x.hora) < h2m(hora) + dur && h2m(hora) < h2m(x.hora) + (x.dur || 60) && ((x.profissionalId || '') === pid || (cid !== '__n' && x.clienteId === cid)));
    if (cf.length) return { cf };
    if (cid === '__n') cid = await put('clientes', { nome: nn, cpf: ncpf.replace(/\D/g, ''), tel: ($('#nt') || { value: '' }).value.trim(), nasc: ($('#nb') || { value: '' }).value });
    const base = list.find(x => x.id === V.edit) || old;
    const o = Object.assign({ status: 'agendado', remarcacoes: 0 }, base || {}, { clienteId: cid, servicoId: sid, servicoNome: s.nome, profissionalId: pid, profissionalNome: (S.profissionais.find(p => p.id === pid) || {}).nome || '', data, hora, dur, valor: +$('#fv').value || 0, obs: $('#fo').value.trim() });
    if (base && (base.data !== data || base.hora !== hora)) { o.remarcacoes = (base.remarcacoes || 0) + 1; o.status = 'agendado'; o.msgEnviada = false; o.hist = (base.hist || []).concat(base.data + ' ' + base.hora); }
    await put('agendamentos', o); return { ok: 1 };
  });
  if (btn) btn.disabled = false;
  if (r && r.cf) { toast('Horário indisponível: já existe ' + r.cf.map(x => x.hora + ' ' + cli(x.clienteId).nome + (x.profissionalNome ? ' (' + x.profissionalNome + ')' : '')).join(', ') + '. Escolha outro horário.'); return; }
  if (!r || r.err) { toast((r && r.err) || 'Não foi possível salvar.'); return; }
  V.date = data; V.tab = 'agenda'; closeSheet(); render();
}

/* clientes */
function listaCli() {
  const q = V.q.toLowerCase();
  return S.clientes.filter(c => !q || (c.nome || '').toLowerCase().includes(q) || (c.tel || '').includes(q) || (c.cpf || '').includes(q.replace(/\D/g, '') || '§')).sort(byNome).map(c => {
    const n = S.agendamentos.filter(a => a.clienteId === c.id && a.status === 'atendido').length;
    return `<div class="row" data-a="cli" data-v="${c.id}"><div class="av">${esc((c.nome || '?').trim()[0].toUpperCase())}</div><div class="inf"><b>${esc(c.nome)}</b><div class="mu">${esc(c.tel || 'sem telefone')}${c.nasc ? ' · 🎂 ' + bday(c.nasc) : ''}</div></div><span class="mu">${n} atend.</span></div>`;
  }).join('') || vazio('Nenhum cliente cadastrado.');
}
function vClientes() {
  const m = new Date().getMonth() + 1, an = S.clientes.filter(c => c.nasc && +c.nasc.slice(5, 7) === m).sort((a, b) => a.nasc.slice(8) - b.nasc.slice(8));
  return `<header class="top"><div><p class="eyebrow">${S.clientes.length} cadastrada${S.clientes.length === 1 ? '' : 's'}</p><h1>Clientes</h1></div></header>${an.length ? `<div class="an">🎂 <b>Aniversariantes de ${MS[m - 1]}</b><br>${an.map(c => esc(prim(c.nome)) + ' (' + c.nasc.slice(8) + ')').join(' · ')}</div>` : ''}<div class="search">${IC.search}<input id="q" placeholder="Buscar nome, telefone ou CPF" value="${esc(V.q)}"></div><div id="lista">${listaCli()}</div>`;
}
const maskCpf = v => { const d = String(v || '').replace(/\D/g, '').slice(0, 11); return d.replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d{1,2})$/, '$1-$2'); };
const cpfOk = v => { const d = String(v || '').replace(/\D/g, ''); if (d.length !== 11 || /^(\d)\1+$/.test(d)) return false; const dv = n => { let s = 0; for (let i = 0; i < n; i++) s += +d[i] * (n + 1 - i); const r = (s * 10) % 11; return r === 10 ? 0 : r; }; return dv(9) === +d[9] && dv(10) === +d[10]; };
const maskCep = v => { const d = String(v || '').replace(/\D/g, '').slice(0, 8); return d.length > 5 ? d.slice(0, 5) + '-' + d.slice(5) : d; };
function cliForm(id) {
  const c = id ? S.clientes.find(x => x.id === id) || {} : {}; V.edit = id || null;
  const op = (l, cur) => l.map(x => `<option ${x === cur ? 'selected' : ''}>${x}</option>`).join('');
  sheet(`<h3>${id ? 'Editar' : 'Nova'} cliente</h3><label>Nome completo</label><input id="cn" value="${esc(c.nome || '')}" autocomplete="off"><label>CPF</label><input id="cc" inputmode="numeric" placeholder="000.000.000-00" value="${esc(maskCpf(c.cpf))}"><label>WhatsApp (com DDD)</label><input id="ct" type="tel" value="${esc(c.tel || '')}"><label>Data de nascimento</label><input id="cb" type="date" value="${esc(c.nasc || '')}">
  <label>E-mail</label><input id="ce" type="email" inputmode="email" autocapitalize="none" value="${esc(c.email || '')}"><label>Profissão</label><input id="cp" value="${esc(c.prof || '')}">
  <div class="g2"><div><label>Estado civil</label><select id="cec"><option value=""></option>${op(['Solteira(o)', 'Casada(o)', 'União estável', 'Divorciada(o)', 'Viúva(o)'], c.ec)}</select></div><div><label>Sexo</label><select id="cs"><option value=""></option>${op(['Feminino', 'Masculino', 'Outro'], c.sexo)}</select></div></div>
  <label>Endereço completo</label><input id="cend" value="${esc(c.end || '')}"><label>CEP</label><input id="ccep" inputmode="numeric" placeholder="00000-000" value="${esc(maskCep(c.cep))}"><label>Contato de emergência</label><input id="cem" placeholder="Nome e telefone" value="${esc(c.emerg || '')}">
  <p id="wn" class="er"></p><button class="btn pr" data-a="saveCli">Salvar</button>`);
}
async function saveCli() {
  const n = $('#cn').value.trim(); if (!n) { toast('Informe o nome.'); return; }
  const cpf = $('#cc').value.trim(); if (!cpf) { toast('Informe o CPF.'); return; } if (!cpfOk(cpf)) { toast('CPF inválido. Confira os números.'); return; }
  const dup = S.clientes.find(x => x.id !== V.edit && String(x.cpf || '').replace(/\D/g, '') === cpf.replace(/\D/g, '')); if (dup) { toast('Este CPF já está cadastrado para ' + dup.nome + '.'); return; }
  const old = V.edit ? S.clientes.find(x => x.id === V.edit) : {};
  try { await put('clientes', Object.assign({}, old, { nome: n, cpf: cpf.replace(/\D/g, ''), tel: $('#ct').value.trim(), nasc: $('#cb').value, email: $('#ce').value.trim(), prof: $('#cp').value.trim(), ec: $('#cec').value, sexo: $('#cs').value, end: $('#cend').value.trim(), cep: $('#ccep').value.replace(/\D/g, ''), emerg: $('#cem').value.trim() })); closeSheet(); } catch (e) { }
}


/* ---------- fotos antes e depois ---------- */
const FD = {}; // modo demonstração: fotos só em memória
const fotosRef = cid => DB.collection('clientes/' + cid + '/fotos'), grRef = cid => DB.collection('clientes/' + cid + '/fotosgrandes');
async function fotosGet(cid) {
  if (!DB) return (FD[cid] || []).map(f => ({ id: f.id, ...f.meta }));
  const s = await lim(fotosRef(cid).get(), 20000); return s.docs.map(d => ({ id: d.id, ...d.data() }));
}
async function fotoBig(cid, id) { if (!DB) return ((FD[cid] || []).find(f => f.id === id) || {}).img; const s = await lim(grRef(cid).doc(id).get(), 20000); return s.exists ? s.data().img : ''; }
async function fotoSave(cid, meta, img) {
  const id = 'f' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
  if (!DB) { (FD[cid] = FD[cid] || []).push({ id, meta, img }); return id; }
  await lim(grRef(cid).doc(id).set({ img }), 30000); await lim(fotosRef(cid).doc(id).set(meta), 15000); return id;
}
async function fotoRemove(cid, id) { if (!DB) { FD[cid] = (FD[cid] || []).filter(f => f.id !== id); return; } await lim(fotosRef(cid).doc(id).delete()); try { await lim(grRef(cid).doc(id).delete()); } catch (e) { } }
async function comprime(file, max, q) {
  let bmp; try { bmp = await createImageBitmap(file, { imageOrientation: 'from-image' }); }
  catch (e) { bmp = await new Promise((ok, no) => { const im = new Image(); im.onload = () => ok(im); im.onerror = no; im.src = URL.createObjectURL(file); }); }
  const w = bmp.width || bmp.naturalWidth, h = bmp.height || bmp.naturalHeight, k = Math.min(1, max / Math.max(w, h));
  const c = document.createElement('canvas'); c.width = Math.round(w * k); c.height = Math.round(h * k); c.getContext('2d').drawImage(bmp, 0, 0, c.width, c.height);
  return c.toDataURL('image/jpeg', q);
}
async function prepFoto(file) {
  let img = await comprime(file, 1280, .72); for (let q = .6; img.length > 880000 && q > .3; q -= .1) img = await comprime(file, 1100, q);
  return { img, th: await comprime(file, 360, .6) };
}
async function fotosAbrir(cid) {
  V.fc = cid; V.ff = V.ff || 'todas'; sheet('<h3>Fotos antes e depois</h3><p class="mu">Carregando…</p>');
  try { V.fl = await fotosGet(cid); } catch (e) { sheet('<h3>Fotos</h3><p class="er">Não foi possível carregar as fotos. Confira a conexão e se as regras do Firestore foram atualizadas.</p><button class="btn" data-a="cli" data-v="' + cid + '">‹ Voltar</button>'); return; }
  fotosGrade();
}
function fotosGrade() {
  const c = cli(V.fc), l = (V.fl || []).slice().sort((x, y) => (y.data + y.em).toString().localeCompare((x.data + x.em).toString())), f = V.ff, vis = l.filter(x => f === 'todas' || x.tipo === f);
  const na = l.filter(x => x.tipo === 'antes').length, nd = l.filter(x => x.tipo === 'depois').length;
  sheet(`<h3>Fotos · ${esc(prim(c.nome))}</h3><p class="mu" style="margin:2px 0 10px">${l.length} foto${l.length === 1 ? '' : 's'} · ${na} antes · ${nd} depois</p>
  ${c.termoImagem ? '' : `<p class="lgpd">⚠ Esta paciente ainda não assinou o termo de uso de imagem. <button class="lk" data-a="termo" data-v="${V.fc}" style="display:inline;margin:0">Abrir termo</button></p>`}<div class="acts"><label class="btn pr fl">📷 Tirar foto<input type="file" id="fcam" accept="image/*" capture="environment" hidden></label><label class="btn fl">🖼 Da galeria<input type="file" id="fgal" accept="image/*" multiple hidden></label></div>
  <div class="chips" style="margin-top:12px">${[['todas', 'Todas'], ['antes', 'Antes'], ['depois', 'Depois']].map(([k, t]) => `<button class="${f === k ? 'on' : ''}" data-a="ffil" data-v="${k}">${t}</button>`).join('')}</div>
  ${na && nd ? '<button class="btn" data-a="fcmp" style="margin-bottom:10px">⇄ Comparar antes e depois</button>' : ''}
  <div class="fg">${vis.map(x => `<button class="ft" data-a="fver" data-v="${x.id}"><img src="${x.th}" alt=""><span class="tg ${x.tipo}">${x.tipo === 'antes' ? 'Antes' : 'Depois'}</span><small>${esc(fd(x.data))}${x.proc ? '<br>' + esc(x.proc) : ''}</small></button>`).join('') || '<p class="mu" style="grid-column:1/-1">Nenhuma foto ainda. Use os botões acima.</p>'}</div>
  <button class="btn" data-a="cli" data-v="${V.fc}" style="margin-top:14px">‹ Voltar à ficha</button>`);
}
async function fotosEscolhidas(files) {
  files = [...files].filter(f => f.type.startsWith('image/') || /\.(heic|heif)$/i.test(f.name)); if (!files.length) return;
  note('Preparando ' + (files.length > 1 ? files.length + ' fotos…' : 'foto…'));
  try { V.fp = []; for (const f of files) V.fp.push(await prepFoto(f)); } catch (e) { note('Não foi possível ler essa imagem. Tente outra foto.'); return; }
  const tipoIni = V.ff === 'depois' ? 'depois' : 'antes';
  sheet(`<h3>Nova${V.fp.length > 1 ? 's' : ''} foto${V.fp.length > 1 ? 's' : ''}</h3><div class="fprev">${V.fp.map(p => `<img src="${p.th}" alt="">`).join('')}</div>
  <div class="seg" style="margin-top:12px"><button class="${tipoIni === 'antes' ? 'on' : ''}" data-a="ftipo" data-v="antes">Antes</button><button class="${tipoIni === 'depois' ? 'on' : ''}" data-a="ftipo" data-v="depois">Depois</button></div><input type="hidden" id="ftp" value="${tipoIni}">
  <label>Procedimento</label><select id="fpr"><option value="">—</option>${S.servicos.slice().sort(byNome).map(s => `<option>${esc(s.nome)}</option>`).join('')}</select>
  <label>Data</label><input id="fdt" type="date" value="${hoje()}"><label>Observação (opcional)</label><input id="fob" placeholder="Ex.: sessão 3, lado direito">
  <p id="wn" class="er"></p><button class="btn pr" id="fsv" data-a="fsalvar">Salvar foto${V.fp.length > 1 ? 's' : ''}</button><button class="btn" data-a="fgrade">Cancelar</button>`);
}
async function fotosSalvar() {
  const b = $('#fsv'); b.disabled = true; b.textContent = 'Salvando…';
  const meta = { tipo: $('#ftp').value, proc: $('#fpr').value, data: $('#fdt').value || hoje(), obs: $('#fob').value.trim(), por: ME.nome || '', em: Date.now() };
  try { for (const p of V.fp) await fotoSave(V.fc, Object.assign({ th: p.th }, meta), p.img); V.fp = []; note('Foto salva.'); await fotosAbrir(V.fc); }
  catch (e) { b.disabled = false; b.textContent = 'Tentar de novo'; toast('Não foi possível salvar a foto. Verifique a conexão.'); }
}
async function fotoVer(id) {
  const x = (V.fl || []).find(f => f.id === id); if (!x) return; V.fv = id;
  sheet(`<h3>${x.tipo === 'antes' ? 'Antes' : 'Depois'} · ${esc(fd(x.data))}</h3><p class="mu" style="margin:2px 0 10px">${esc(x.proc || '')}${x.obs ? ' · ' + esc(x.obs) : ''}${x.por ? '<br>Registrada por ' + esc(x.por) : ''}</p><img class="fbig" id="fbg" src="${x.th}" alt=""><p class="mu" id="fld">Carregando em alta qualidade…</p>
  <button class="btn dg" data-a="fdel" data-v="${id}">Excluir foto</button><button class="btn" data-a="fgrade">‹ Voltar às fotos</button>`);
  try { const big = await fotoBig(V.fc, id); if (V.fv === id && big && $('#fbg')) { $('#fbg').src = big; $('#fld').remove(); } } catch (e) { const w = $('#fld'); if (w) w.textContent = 'Não foi possível carregar a versão completa.'; }
}
function fotosComparar(ai, di) {
  const l = V.fl || [], A_ = l.filter(x => x.tipo === 'antes').sort((p, q) => q.data.localeCompare(p.data)), D_ = l.filter(x => x.tipo === 'depois').sort((p, q) => q.data.localeCompare(p.data));
  const a = A_.find(x => x.id === ai) || A_[0], d = D_.find(x => x.id === di) || D_[0], opt = (L, s) => L.map(x => `<option value="${x.id}" ${s && s.id === x.id ? 'selected' : ''}>${esc(fd(x.data))}${x.proc ? ' · ' + esc(x.proc) : ''}</option>`).join('');
  V.fcmp = [a.id, d.id];
  sheet(`<h3>Comparar</h3><div class="cmp"><div><span class="tg antes">Antes</span><img id="cA" src="${a.th}" alt=""></div><div><span class="tg depois">Depois</span><img id="cD" src="${d.th}" alt=""></div></div>
  <div class="g2"><div><label>Antes</label><select id="sA">${opt(A_, a)}</select></div><div><label>Depois</label><select id="sD">${opt(D_, d)}</select></div></div><button class="btn" data-a="fgrade" style="margin-top:14px">‹ Voltar às fotos</button>`);
  fotoBig(V.fc, a.id).then(b => { if (b && $('#cA') && V.fcmp[0] === a.id) $('#cA').src = b; }).catch(() => { });
  fotoBig(V.fc, d.id).then(b => { if (b && $('#cD') && V.fcmp[1] === d.id) $('#cD').src = b; }).catch(() => { });
}


/* ---------- termo de consentimento de uso de imagem ---------- */
const TERMO_TXT = c => `Eu, ${c.nome}${c.cpf ? ', CPF ' + maskCpf(c.cpf) : ''}, declaro que fui informada(o) e concordo com o que segue:`;
const TERMO_CLIN = 'Autorizo o registro fotográfico do meu rosto/corpo antes, durante e depois dos procedimentos, para acompanhamento clínico, avaliação de resultados e composição do meu prontuário, com sigilo e armazenamento seguro, conforme a LGPD (Lei nº 13.709/18).';
const TERMO_DIV = ['Não autorizo o uso das minhas imagens para divulgação.', 'Autorizo o uso das imagens para divulgação (redes sociais e materiais da clínica) SEM identificar meu rosto.', 'Autorizo o uso das imagens para divulgação (redes sociais e materiais da clínica) COM identificação do meu rosto.'];
const TERMO_REV = 'Estou ciente de que posso revogar esta autorização a qualquer momento, por comunicação à clínica, sem prejuízo do uso já realizado antes da revogação.';
let SIG = { on: false, drawn: false };
function sigInit() {
  const cv = $('#sig'); if (!cv) return; const r = cv.getBoundingClientRect(), k = window.devicePixelRatio || 1; cv.width = r.width * k; cv.height = r.height * k;
  const x = cv.getContext('2d'); x.scale(k, k); x.lineWidth = 2.2; x.lineCap = 'round'; x.lineJoin = 'round'; x.strokeStyle = '#2a2025'; SIG = { on: false, drawn: false };
  const pt = e => { const b = cv.getBoundingClientRect(); return [e.clientX - b.left, e.clientY - b.top]; };
  cv.addEventListener('pointerdown', e => { e.preventDefault(); cv.setPointerCapture(e.pointerId); SIG.on = true; const [px, py] = pt(e); x.beginPath(); x.moveTo(px, py); x.lineTo(px + .1, py + .1); x.stroke(); SIG.drawn = true; const h = $('#sigh'); if (h) h.hidden = true; });
  cv.addEventListener('pointermove', e => { if (!SIG.on) return; e.preventDefault(); const [px, py] = pt(e); x.lineTo(px, py); x.stroke(); });
  ['pointerup', 'pointercancel', 'pointerleave'].forEach(n => cv.addEventListener(n, () => { SIG.on = false; }));
}
function termoForm(id) {
  const c = S.clientes.find(x => x.id === id); if (!c) return; V.edit = id; const t = c.termoImagem;
  if (t && !V.refazT) {
    sheet(`<h3>Termo de uso de imagem</h3><p class="mu" style="margin:2px 0 10px">${esc(c.nome)}</p><p class="lgpd"><b>✓ Assinado em ${new Date(t.em).toLocaleDateString('pt-BR')}</b>${t.por ? ' · registrado por ' + esc(t.por) : ''}<br>Registro clínico: autorizado<br>Divulgação: ${esc(TERMO_DIV[t.div || 0].replace(/\.$/, '').replace(/^Autorizo o uso das imagens para divulgação /, 'autorizada ').replace(/^Não autorizo.*/, 'não autorizada'))}</p>${t.ass ? `<img class="sigimg" src="${t.ass}" alt="Assinatura">` : ''}
    <button class="btn pr" data-a="printTermo" data-v="${id}">Imprimir / salvar em PDF</button><button class="btn" data-a="refazT" data-v="${id}">Refazer termo</button><button class="btn" data-a="cli" data-v="${id}">‹ Voltar à ficha</button>`); return;
  }
  V.refazT = false;
  sheet(`<h3>Termo de uso de imagem</h3><p class="mu" style="margin:2px 0 8px">${esc(c.nome)}</p><p class="lgpd">${esc(TERMO_TXT(c))}</p>
  <label class="decl"><input type="checkbox" id="tcl"><span>${TERMO_CLIN}</span></label>
  <label>Divulgação das imagens</label><select id="tdv">${TERMO_DIV.map((x, i) => `<option value="${i}">${esc(x)}</option>`).join('')}</select>
  <p class="lgpd" style="margin-top:10px">${TERMO_REV}</p>
  <label>Assinatura da paciente (com o dedo)</label><div class="sigw"><canvas id="sig"></canvas><span id="sigh" class="sigh">Assine aqui</span></div><button class="lk" data-a="sigclr" style="margin:0">Limpar assinatura</button>
  <p id="wn" class="er"></p><button class="btn pr" data-a="saveTermo">Salvar termo</button><button class="btn" data-a="cli" data-v="${id}">Cancelar</button>`);
  setTimeout(sigInit, 60);
}
async function saveTermo() {
  const c = S.clientes.find(x => x.id === V.edit); if (!c) return;
  if (!$('#tcl').checked) { toast('Marque a autorização do registro fotográfico.'); return; } if (!SIG.drawn) { toast('A paciente precisa assinar no quadro.'); return; }
  const cv = $('#sig'), o = document.createElement('canvas'); o.width = 480; o.height = Math.round(480 * cv.height / cv.width); const g = o.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, o.width, o.height); g.drawImage(cv, 0, 0, o.width, o.height);
  try { await put('clientes', Object.assign({}, c, { termoImagem: { clin: true, div: +$('#tdv').value, ass: o.toDataURL('image/png'), em: Date.now(), por: ME.nome || '' } })); note('Termo salvo.'); termoForm(c.id); } catch (e) { }
}
function printTermo(id) {
  const c = S.clientes.find(x => x.id === id); if (!c || !c.termoImagem) return; const t = c.termoImagem;
  const w = window.open('', '_blank'); if (!w) { note('Libere pop-ups para imprimir.'); return; }
  w.document.write(`<!doctype html><meta charset="utf-8"><title>Termo de imagem - ${esc(c.nome)}</title><style>body{font:14px/1.55 -apple-system,Helvetica,sans-serif;margin:40px;color:#222}h1{font:600 22px Georgia,serif}p{margin:12px 0}.sg{margin-top:30px;width:320px}.sg img{height:90px;display:block}.sg div{border-top:1px solid #333;padding-top:4px;font-size:12px}</style><h1>Termo de Consentimento para Uso de Imagem</h1><p>${esc(S.config.nome || '')}</p><p>${esc(TERMO_TXT(c))}</p><p>☒ ${TERMO_CLIN}</p><p>☒ ${esc(TERMO_DIV[t.div || 0])}</p><p>${TERMO_REV}</p><p>${new Date(t.em).toLocaleDateString('pt-BR')}</p><div class="sg"><img src="${t.ass}"><div>${esc(c.nome)}${c.cpf ? ' · CPF ' + maskCpf(c.cpf) : ''}</div></div><script>setTimeout(()=>print(),400)<\/script>`);
  w.document.close();
}


/* ---------- TCLE: um termo para cada procedimento agendado ---------- */
const TCLE_GERAL = 'Riscos e efeitos possíveis (gerais): dor ou desconforto local, vermelhidão, inchaço, hematomas, sensibilidade, infecção, reações alérgicas, assimetrias e resultados que variam de pessoa para pessoa, não havendo garantia de resultado específico.';
const TCLE_DECL = 'Declaro que informei corretamente meu histórico de saúde, alergias e medicamentos em uso; que tive a oportunidade de esclarecer minhas dúvidas; que compreendo e seguirei as orientações de cuidados antes e depois do procedimento; e que posso revogar este consentimento antes da realização do procedimento. Autorizo a realização do procedimento descrito.';
function tcleTexto(ap) {
  const c = cli(ap.clienteId), sv = S.servicos.find(x => x.id === ap.servicoId) || {};
  return { abre: `Eu, ${c.nome}${c.cpf ? ', CPF ' + maskCpf(c.cpf) : ''}, declaro que fui informada(o)${ap.profissionalNome ? ' por ' + ap.profissionalNome : ' pelo(a) profissional responsável'} sobre o procedimento “${ap.servicoNome}”, agendado para ${new Date(prs(ap.data)).toLocaleDateString('pt-BR')} às ${ap.hora}, incluindo sua finalidade, técnica, cuidados pré e pós-procedimento e alternativas.`, riscos: TCLE_GERAL, esp: (sv.tcle || '').trim(), decl: TCLE_DECL };
}
function tcleForm(id) {
  const ap = S.agendamentos.find(x => x.id === id); if (!ap) return; V.edit = id; const t = ap.tcle, c = cli(ap.clienteId);
  if (t && !V.refazT) {
    sheet(`<h3>TCLE assinado</h3><p class="mu" style="margin:2px 0 10px">${esc(c.nome)} · ${esc(ap.servicoNome)} · ${fd(ap.data)}</p><p class="lgpd"><b>✓ Assinado em ${new Date(t.em).toLocaleDateString('pt-BR')}</b>${t.por ? ' · registrado por ' + esc(t.por) : ''}</p>${t.ass ? `<img class="sigimg" src="${t.ass}" alt="Assinatura">` : ''}
    <button class="btn pr" data-a="printTcle" data-v="${id}">Imprimir / salvar em PDF</button><button class="btn" data-a="refazTcle" data-v="${id}">Refazer TCLE</button><button class="btn" data-a="apt" data-v="${id}">‹ Voltar ao agendamento</button>`); return;
  }
  V.refazT = false; const x = tcleTexto(ap);
  sheet(`<h3>TCLE · ${esc(ap.servicoNome)}</h3><p class="mu" style="margin:2px 0 8px">Termo de Consentimento Livre e Esclarecido · ${esc(c.nome)}</p>
  <p class="lgpd">${esc(x.abre)}</p><p class="lgpd">${esc(x.riscos)}</p>${x.esp ? `<p class="lgpd"><b>Específico deste procedimento:</b> ${esc(x.esp)}</p>` : ''}<p class="lgpd">${esc(x.decl)}</p>
  <label class="decl"><input type="checkbox" id="tcl"><span>Li (ou foi lido para mim) e compreendi este termo, e concordo com a realização do procedimento.</span></label>
  <label>Assinatura da paciente (com o dedo)</label><div class="sigw"><canvas id="sig"></canvas><span id="sigh" class="sigh">Assine aqui</span></div><button class="lk" data-a="sigclr" style="margin:0">Limpar assinatura</button>
  <p id="wn" class="er"></p><button class="btn pr" data-a="saveTcle">Salvar TCLE</button><button class="btn" data-a="apt" data-v="${id}">Cancelar</button>`);
  setTimeout(sigInit, 60);
}
async function saveTcle() {
  const ap = S.agendamentos.find(x => x.id === V.edit); if (!ap) return;
  if (!$('#tcl').checked) { toast('Marque que a paciente leu e concorda com o termo.'); return; } if (!SIG.drawn) { toast('A paciente precisa assinar no quadro.'); return; }
  const cv = $('#sig'), o = document.createElement('canvas'); o.width = 480; o.height = Math.round(480 * cv.height / cv.width); const g = o.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, o.width, o.height); g.drawImage(cv, 0, 0, o.width, o.height);
  const x = tcleTexto(ap);
  try { await upd(ap.id, { tcle: { ass: o.toDataURL('image/png'), em: Date.now(), por: ME.nome || '', txt: [x.abre, x.riscos, x.esp, x.decl].filter(Boolean).join('\n\n') } }); note('TCLE salvo.'); tcleForm(ap.id); } catch (e) { }
}
function printTcle(id) {
  const ap = S.agendamentos.find(x => x.id === id); if (!ap || !ap.tcle) return; const c = cli(ap.clienteId), t = ap.tcle;
  const w = window.open('', '_blank'); if (!w) { note('Libere pop-ups para imprimir.'); return; }
  w.document.write(`<!doctype html><meta charset="utf-8"><title>TCLE - ${esc(c.nome)}</title><style>body{font:14px/1.55 -apple-system,Helvetica,sans-serif;margin:40px;color:#222}h1{font:600 21px Georgia,serif}p{margin:12px 0;white-space:pre-line}.sg{margin-top:30px;width:320px}.sg img{height:90px;display:block}.sg div{border-top:1px solid #333;padding-top:4px;font-size:12px}</style><h1>Termo de Consentimento Livre e Esclarecido (TCLE)</h1><p>${esc(S.config.nome || '')}</p><p><b>Procedimento:</b> ${esc(ap.servicoNome)} · ${new Date(prs(ap.data)).toLocaleDateString('pt-BR')} ${esc(ap.hora)}${ap.profissionalNome ? ' · ' + esc(ap.profissionalNome) : ''}</p><p>${esc(t.txt || '')}</p><p>Assinado em ${new Date(t.em).toLocaleDateString('pt-BR')}</p><div class="sg"><img src="${t.ass}"><div>${esc(c.nome)}${c.cpf ? ' · CPF ' + maskCpf(c.cpf) : ''}</div></div><script>setTimeout(()=>print(),400)<\/script>`);
  w.document.close();
}

/* ---------- ficha de anamnese (HOF) ---------- */
const YN = ['Não', 'Sim'], SNA = ['Não', 'Sim', 'Não se aplica'];
const AN_SEC = [
  ['Histórico de saúde e hábitos', [
    ['obj', 'Objetivo da consulta', 'txt'],
    ['ativ', 'Pratica atividade física regularmente?', YN, 'Qual(is) e com que frequência?'],
    ['alim', 'Como avalia seus hábitos alimentares?', ['Ótimos', 'Bons', 'Regulares', 'Ruins']],
    ['peso', 'Perda ou ganho de peso significativo recentemente (mais de 5 kg nos últimos 3 meses)?', YN, 'Quantos quilos e qual o motivo aparente?'],
    ['alcool', 'Faz uso frequente de bebidas alcoólicas?', YN, 'Qual a frequência e quantidade?'],
    ['fuma', 'É fumante ou ex-fumante?', YN, 'Frequência / há quanto tempo parou?'],
    ['drogas', 'Faz uso de drogas ilícitas?', YN],
    ['trauma', 'Passou por algum trauma emocional importante recentemente?', YN],
    ['gest', 'Está gestante ou amamentando?', SNA],
    ['ciclo', 'Seu ciclo menstrual é regular?', SNA],
    ['contra', 'Utiliza método contraceptivo?', YN],
    ['reposicao', 'Faz ou já fez reposição hormonal?', YN],
    ['trat', 'Está sob tratamento médico atualmente?', YN, 'Para qual condição?'],
    ['estprev', 'Realizou tratamento estético anteriormente?', YN, 'Qual(is) e quando?'],
    ['hofprev', 'Realizou cirurgia ou procedimento de harmonização facial anteriormente?', YN, 'Qual(is) e quando?'],
    ['medcont', 'Utiliza alguma medicação de uso contínuo ou controlado?', YN, 'Qual(is)?'],
    ['anab', 'Utiliza ou já utilizou anabolizantes?', YN, 'Qual(is) e quando?']]],
  ['Pele e cuidados', [
    ['alergia', 'Possui alergia a medicamentos, anestésicos, cosméticos ou alimentos?', YN, 'Especifique'],
    ['rotina', 'Possui rotina de cuidados com a pele do rosto?', YN, 'Descreva brevemente'],
    ['acidos', 'Utiliza ou já utilizou ácidos na pele?', YN, 'Qual(is) e quando?'],
    ['roacutan', 'Utiliza ou utilizou Roacutan (Isotretinoína)?', YN, 'Quando terminou o tratamento?'],
    ['sol', 'Como descreve sua exposição solar diária/frequente?', ['Baixa', 'Moderada', 'Alta']],
    ['protetor', 'Utiliza protetor solar regularmente?', YN],
    ['doencapele', 'Possui alguma doença de pele diagnosticada (ex.: acne, rosácea, dermatite)?', YN, 'Qual(is)?'],
    ['acnefam', 'Tem histórico familiar de acne relevante?', YN],
    ['queloide', 'Tem predisposição à formação de queloides?', YN],
    ['manchas', 'Possui manchas na pele?', YN, 'Onde e há quanto tempo?'],
    ['vascular', 'Observa alguma alteração vascular na pele?', YN, 'Descreva']]],
  ['Saúde geral', [
    ['hematomas', 'Percebe o surgimento de hematomas com facilidade?', YN],
    ['varizes', 'Possui varizes ou microvarizes?', YN],
    ['hemorragia', 'Tem histórico de hemorragia ou dificuldade de cicatrização?', YN],
    ['nodulos', 'Apresenta alguma formação sólida na pele (nódulos, verrugas, cistos, cicatrizes hipertróficas/queloides)?', YN, 'Descreva'],
    ['traumaface', 'Sofreu algum trauma ou fratura na face?', YN, 'Quando e qual foi o tratamento?'],
    ['protese', 'Possui alguma prótese metálica ou implante no corpo/face?', YN, 'Onde?'],
    ['cardio', 'Possui alguma doença cardiovascular (ex.: arritmia, pressão alta)?', YN, 'Qual(is)?'],
    ['resp', 'Tem ou teve distúrbios respiratórios significativos (ex.: asma grave, bronquite crônica)?', YN, 'Qual(is)?'],
    ['desmaios', 'Já teve desmaios, tonturas frequentes ou convulsões?', YN, 'Relate brevemente'],
    ['cronica', 'Possui alguma doença crônica (ex.: diabetes, hipertensão, doença renal, hepática, autoimune)?', YN, 'Qual(is) e faz acompanhamento?'],
    ['infecto', 'Foi diagnosticado com alguma doença infectocontagiosa (ex.: hepatite, HIV)?', YN, 'Qual?']]],
  ['Expectativas', [
    ['satisf', 'Nível de satisfação com sua aparência facial/corporal atualmente (0 = muito insatisfeito, 5 = muito satisfeito)', ['0', '1', '2', '3', '4', '5']],
    ['expect', 'Qual sua principal expectativa em relação ao tratamento estético que busca?', 'txt'],
    ['outras', 'Existe algo mais que considera importante informar sobre sua saúde ou hábitos antes de um procedimento estético?', 'txt']]]
];
const AN_Q = AN_SEC.flatMap(s => s[1]);
function anForm(id) {
  const c = S.clientes.find(x => x.id === id); if (!c) return; V.edit = id; const r = c.anamnese || {};
  const q = ([k, l, t, d]) => {
    if (t === 'txt') return `<div class="q"><label>${l}</label><textarea data-k="${k}" rows="2">${esc(r[k] || '')}</textarea></div>`;
    const sim = r[k] === 'Sim';
    return `<div class="q"><p>${l}</p><div class="opts">${t.map(o => `<label class="o"><input type="radio" name="an_${k}" value="${o}" ${r[k] === o ? 'checked' : ''}><span>${o}</span></label>`).join('')}</div>${d ? `<input class="det" data-d="${k}" placeholder="${d}" value="${esc(r[k + '_d'] || '')}" ${sim ? '' : 'hidden'}>` : ''}</div>`;
  };
  sheet(`<h3>Ficha de anamnese</h3><p class="mu" style="margin:2px 0 6px">${esc(c.nome)}${r._em ? ' · atualizada em ' + new Date(r._em).toLocaleDateString('pt-BR') + (r._por ? ' por ' + esc(r._por) : '') : ''}</p>
  <p class="lgpd">Conforme a LGPD (Lei nº 13.709/18), os dados desta ficha são usados apenas para diagnóstico inicial e avaliação de procedimentos estéticos, armazenados com segurança pelo tempo necessário.</p>
  ${AN_SEC.map(([t, qs]) => `<h4 class="sub" style="font-size:18px">${t}</h4>${qs.map(q).join('')}`).join('')}
  <label class="decl"><input type="checkbox" id="andecl" ${r._decl ? 'checked' : ''}><span>A paciente declara que as informações fornecidas são verdadeiras e completas.</span></label>
  <label>Data e local</label><input id="anloc" value="${esc(r._loc || (S.config.nome ? S.config.nome + ', ' : '') + new Date().toLocaleDateString('pt-BR'))}">
  <p id="wn" class="er"></p><button class="btn pr" data-a="saveAn">Salvar ficha</button><button class="btn" data-a="printAn" data-v="${id}">Imprimir / salvar em PDF</button>`);
}
async function saveAn() {
  const c = S.clientes.find(x => x.id === V.edit); if (!c) return; const r = {};
  AN_Q.forEach(([k, , t, d]) => {
    if (t === 'txt') { const el = document.querySelector(`[data-k="${k}"]`); if (el && el.value.trim()) r[k] = el.value.trim(); return; }
    const ck = document.querySelector(`input[name="an_${k}"]:checked`); if (ck) r[k] = ck.value;
    if (d) { const el = document.querySelector(`[data-d="${k}"]`); if (el && r[k] === 'Sim' && el.value.trim()) r[k + '_d'] = el.value.trim(); }
  });
  r._decl = $('#andecl').checked; r._loc = $('#anloc').value.trim(); r._em = Date.now(); r._por = ME.nome || '';
  try { await put('clientes', Object.assign({}, c, { anamnese: r })); note('Ficha salva.'); cliSheet(c.id); } catch (e) { toast('Não foi possível salvar. Tente de novo.'); }
}
function printAn(id) {
  const c = S.clientes.find(x => x.id === id); if (!c) return; const r = c.anamnese || {};
  const row = (l, v) => `<tr><td class="l">${esc(l)}</td><td>${esc(v || '—')}</td></tr>`;
  const dados = [['Nome', c.nome], ['CPF', maskCpf(c.cpf)], ['Profissão', c.prof], ['Nascimento', c.nasc ? fd(c.nasc) : ''], ['Estado civil', c.ec], ['Sexo', c.sexo], ['Endereço', (c.end || '') + (c.cep ? ' · CEP ' + maskCep(c.cep) : '')], ['Telefone', c.tel], ['E-mail', c.email], ['Contato de emergência', c.emerg]];
  const body = AN_SEC.map(([t, qs]) => `<h2>${t}</h2><table>${qs.map(([k, l, ty, d]) => row(l, (r[k] || '') + (r[k + '_d'] ? ' — ' + r[k + '_d'] : ''))).join('')}</table>`).join('');
  const w = window.open('', '_blank'); if (!w) { note('Libere pop-ups para imprimir.'); return; }
  w.document.write(`<!doctype html><meta charset="utf-8"><title>Anamnese - ${esc(c.nome)}</title><style>body{font:13px/1.4 -apple-system,Helvetica,sans-serif;margin:28px;color:#222}h1{font:600 22px Georgia,serif;margin:0 0 4px}h2{font:600 15px Georgia,serif;margin:18px 0 6px;border-bottom:1px solid #b9a;padding-bottom:3px}table{width:100%;border-collapse:collapse}td{padding:4px 6px;border-bottom:1px solid #eee;vertical-align:top}td.l{width:58%;color:#555}.lg{font-size:11px;color:#666;margin:6px 0}.sg{margin-top:46px;display:flex;gap:30px}.sg div{flex:1;border-top:1px solid #333;padding-top:4px;font-size:12px}</style><h1>Ficha de Anamnese</h1><p class="lg">${esc(S.config.nome || '')}</p><h2>Dados da paciente</h2><table>${dados.map(([l, v]) => row(l, v)).join('')}</table>${body}<p class="lg">Conforme a LGPD (Lei nº 13.709/18), os dados desta ficha são usados apenas para diagnóstico inicial e avaliação de procedimentos estéticos.</p><p>Declaro que as informações fornecidas nesta ficha são verdadeiras e completas.</p><p>${esc(r._loc || '')}</p><div class="sg"><div>Assinatura da paciente</div><div>Assinatura do profissional</div></div><script>setTimeout(()=>print(),300)<\/script>`);
  w.document.close();
}
function cliSheet(id) {
  const c = S.clientes.find(x => x.id === id); if (!c) return;
  const h = S.agendamentos.filter(a => a.clienteId === id).sort((a, b) => (b.data + b.hora).localeCompare(a.data + a.hora)), ok = h.filter(a => a.status === 'atendido'), tot = ok.reduce((s, a) => s + vr(a), 0);
  sheet(`<h3>${esc(c.nome)}</h3><p class="mu" style="margin:2px 0">${esc(c.tel || 'sem telefone')}${c.nasc ? ' · 🎂 ' + bday(c.nasc) : ''}</p>${c.cpf ? `<p class="mu" style="margin:2px 0">CPF ${esc(maskCpf(c.cpf))}</p>` : '<p class="mu" style="margin:2px 0">CPF não informado</p>'}<p style="margin:6px 0 0">${ok.length} atendimento${ok.length === 1 ? '' : 's'}${(ME.admin || !DB) && tot ? ' · ' + brl(tot) + ' recebidos' : ''}</p>
  <a class="btn wa" href="${wa(c.tel, 'Olá, ' + prim(c.nome) + '!')}" target="_blank" rel="noopener">Conversar no WhatsApp</a><div class="acts" style="margin-top:10px"><button class="btn" data-a="newFor" data-v="${id}">＋ Agendar</button><button class="btn" data-a="editCli" data-v="${id}">Editar cadastro</button></div><button class="btn an-btn" data-a="termo" data-v="${id}">${c.termoImagem ? '✓ Termo de uso de imagem assinado' : '📝 Termo de uso de imagem'}</button><button class="btn an-btn" data-a="fotos" data-v="${id}">📷 Fotos antes e depois</button><button class="btn an-btn" data-a="anForm" data-v="${id}">${c.anamnese && c.anamnese._em ? '📋 Ficha de anamnese · ver / editar' : '📋 Preencher ficha de anamnese'}</button>
  <h4 class="sub" style="font-size:18px">Histórico de atendimento</h4>${h.map(a => { const st = ST[a.status] || ST.agendado; return `<div class="hi"><span>${fd(a.data)} · ${a.hora}<br><span class="mu">${esc(a.servicoNome)}${a.remarcacoes ? ' · remarcado ' + a.remarcacoes + 'x' : ''}</span></span><span class="chip" style="--c:var(--${st[1]})">${st[0]}</span></div>`; }).join('') || '<p class="mu">Sem atendimentos ainda.</p>'}`);
}

/* relatórios */
function vRel() {
  const adm = ME.admin || !DB, rp = adm ? V.prof : (myProf() || '__none'), [y, m] = V.rm.split('-').map(Number);
  const L = S.agendamentos.filter(a => a.data.slice(0, 7) === V.rm && (!rp || a.profissionalId === rp)), at = L.filter(a => a.status === 'atendido'), rec = at.reduce((s, a) => s + vr(a), 0), por = {};
  at.forEach(a => { const p = por[a.clienteId] || (por[a.clienteId] = { n: 0, v: 0 }); p.n++; p.v += vr(a); });
  const pp = {}; at.forEach(a => { const k = a.profissionalNome || 'Sem profissional', p = pp[k] || (pp[k] = { n: 0, v: 0 }); p.n++; p.v += vr(a); });
  const porProf = (!rp && S.profissionais.length) ? `<h3 class="grp">Por profissional</h3>${Object.entries(pp).sort((a, b) => b[1].v - a[1].v).map(([k, p]) => `<div class="hi"><span>${esc(k)}<br><span class="mu">${p.n} atendimento${p.n > 1 ? 's' : ''}</span></span><b>${brl(p.v)}</b></div>`).join('') || '<p class="mu">Sem atendimentos.</p>'}` : '';
  const rm = L.filter(a => a.remarcacoes > 0).sort((a, b) => a.data.localeCompare(b.data)), fl = L.filter(a => a.status === 'faltou').length;
  return `<header class="top"><div><p class="eyebrow">${adm ? 'Visão geral' : 'Só você vê estes valores'}</p><h1>${adm ? 'Relatórios' : 'Meus relatórios'}</h1></div></header>${adm ? chips() : ''}${(!adm && !myProf()) ? '<div class="tip">Vincule seu usuário a uma profissional em Ajustes para ver seus relatórios.</div>' : ''}
  <div class="nv"><button class="rb" data-a="rprev" aria-label="Mês anterior">${IC.prev}</button><b>${MS[m - 1]} ${y}</b><button class="rb" data-a="rnext" aria-label="Próximo mês">${IC.next}</button></div>
  <div class="kp"><div class="hero"><b>${brl(at.length ? rec / at.length : 0)}</b><span>ticket médio recebido</span></div><div><b>${Object.keys(por).length}</b><span>pacientes atendidos</span></div><div><b>${at.length}</b><span>atendimentos</span></div><div><b>${brl(rec)}</b><span>total recebido</span></div><div><b>${rm.length}</b><span>remarcados</span></div><div><b>${fl}</b><span>faltas</span></div></div>
  ${porProf}<h3 class="grp">Pacientes atendidos</h3>${Object.entries(por).sort((a, b) => b[1].v - a[1].v).map(([id, p]) => `<div class="hi"><span>${esc(cli(id).nome)}<br><span class="mu">${p.n} atendimento${p.n > 1 ? 's' : ''}</span></span><b>${brl(p.v)}</b></div>`).join('') || '<p class="mu">Nenhum atendimento registrado no mês.</p>'}
  <h3 class="grp">Pacientes remarcados</h3>${rm.map(a => `<div class="hi"><span>${esc(cli(a.clienteId).nome)}<br><span class="mu">${esc(a.servicoNome)} · agora ${fd(a.data)} ${a.hora}</span></span><b>${a.remarcacoes}x</b></div>`).join('') || '<p class="mu">Nenhuma remarcação no mês.</p>'}`;
}

/* ajustes */
function contaBox() {
  if (!DB) return '<div class="tip"><span>🧪</span><span><b>Modo demonstração.</b> Os dados ficam só neste aparelho. Para usar com a equipe, configure o Firebase (veja o LEIAME).</span></div>';
  const mp = myProf(), pn = (S.profissionais.find(p => p.id === mp) || {}).nome;
  let h = `<div class="row"><div class="av">${esc((ME.nome || ME.email || '?')[0].toUpperCase())}</div><div class="inf"><b>${esc(ME.nome || ME.email)}</b><div class="mu">${esc(ME.email)}${ME.admin ? ' · administradora' : ''}${pn ? ' · ' + esc(pn) : ''}</div></div><button class="mini ghost" data-a="sair">Sair</button></div>`;
  if (!mp) {
    const free = S.profissionais.filter(p => !S.claims.some(c => c.prof === p.id));
    h += `<div class="an"><b>Quem é você?</b> Escolha seu nome para ver seus relatórios.${free.map(p => `<button class="btn" data-a="claim" data-v="${p.id}">Sou ${esc(p.nome)}</button>`).join('') || '<br><span class="mu">Nenhum nome livre. A administradora pode cadastrar ou liberar o seu.</span>'}</div>`;
  }
  return h;
}
function acessos() {
  if (!DB || !ME.admin) return '';
  const us = S.usuarios.slice().sort((a, b) => (a.ativo === b.ativo ? 0 : a.ativo ? 1 : -1) || byNome(a, b));
  return `<h3 class="grp">Acessos</h3>${us.map(u => {
    const cur = (S.claims.find(c => c.id === u.id) || {}).prof || '';
    return `<div class="row"><div class="inf"><b>${esc(u.nome || u.email)}</b><div class="mu">${esc(u.email || '')}${u.ativo ? '' : ' · aguardando aprovação'}</div></div>
    ${u.ativo ? `<select data-claimfor="${u.id}"><option value="">Sem vínculo</option>${S.profissionais.slice().sort(byNome).map(p => `<option value="${p.id}" ${p.id === cur ? 'selected' : ''}>${esc(p.nome)}</option>`).join('')}</select>` : `<button class="mini" data-a="aprovar" data-v="${u.id}">Aprovar</button>`}
    ${u.id !== ME.id ? `<button class="mini ghost" data-a="revogar" data-v="${u.id}">${u.ativo ? 'Remover' : 'Recusar'}</button>` : ''}</div>`;
  }).join('') || vazio('Nenhum acesso solicitado.')}`;
}
function vAjustes() {
  const ios = /iphone|ipad|ipod/i.test(navigator.userAgent) && !navigator.standalone;
  const geral = (ME.admin || !DB) ? `<h3 class="grp">Seu espaço</h3><label>Nome (aparece na mensagem de WhatsApp)</label><input id="en" value="${esc(S.config.nome || '')}" placeholder="Ex.: Studio Bella">
  ${acessos()}<h3 class="grp">Profissionais</h3>${S.profissionais.slice().sort(byNome).map(p => `<div class="row" data-a="prof" data-v="${p.id}"><div class="av">${esc((p.nome || '?')[0].toUpperCase())}</div><div class="inf"><b>${esc(p.nome)}</b></div>${DB ? `<span class="bd">${claimUid(p.id) ? 'com login' : 'sem login'}</span>` : ''}</div>`).join('') || vazio('Cadastre quem atende.')}<button class="btn pr" data-a="newProf">＋ Nova profissional</button>
  <h3 class="grp">Procedimentos</h3>${S.servicos.slice().sort(byNome).map(s => `<div class="row" data-a="srv" data-v="${s.id}"><div class="inf"><b>${esc(s.nome)}</b><div class="mu">${s.dur} min</div></div><b>${brl(s.valor)}</b></div>`).join('') || vazio('Nenhum procedimento cadastrado.')}
  <button class="btn pr" data-a="newSrv">＋ Novo procedimento</button>${S.servicos.length ? '' : '<button class="btn" data-a="sug">Adicionar sugestões (drenagem, bioestimulador, limpeza de pele…)</button>'}` : '';
  return `<header class="top"><div><p class="eyebrow">Conta e equipe</p><h1>Ajustes</h1></div></header>${ios ? '<div class="tip"><span>📲</span><span>Para instalar no iPhone: toque em <b>Compartilhar</b> e depois em <b>Adicionar à Tela de Início</b>.</span></div>' : ''}${contaBox()}${geral}`;
}
function srvForm(id) {
  const s = id ? S.servicos.find(x => x.id === id) || {} : {}; V.edit = id || null;
  sheet(`<h3>${id ? 'Editar' : 'Novo'} procedimento</h3><label>Nome</label><input id="sn" value="${esc(s.nome || '')}"><div class="rw"><div><label>Duração (min)</label><input id="sd" type="number" inputmode="numeric" value="${s.dur || 60}"></div><div><label>Valor (R$)</label><input id="sv" type="number" inputmode="decimal" step="0.01" value="${s.valor || 0}"></div></div><label>Riscos e orientações deste procedimento (aparecem no TCLE)</label><textarea id="stc" rows="4" placeholder="Opcional. Ex.: riscos específicos, contraindicações, cuidados pós.">${esc(s.tcle || '')}</textarea><p id="wn" class="er"></p><button class="btn pr" data-a="saveSrv">Salvar</button>${id ? `<button class="btn dg" data-a="delSrv" data-v="${id}">Excluir</button>` : ''}`);
}
function profForm(id) {
  const p = id ? S.profissionais.find(x => x.id === id) || {} : {}; V.edit = id || null;
  sheet(`<h3>${id ? 'Editar' : 'Nova'} profissional</h3><label>Nome</label><input id="pnm" value="${esc(p.nome || '')}"><p id="wn" class="er"></p><button class="btn pr" data-a="saveProf">Salvar</button>${(id && claimUid(id)) ? `<button class="btn" data-a="unclaim" data-v="${claimUid(id)}">Remover vínculo de login</button>` : ''}${id ? `<button class="btn dg" data-a="delProf" data-v="${id}">Excluir</button>` : ''}`);
}

/* ---------- login ---------- */
const AE = { 'auth/invalid-credential': 'E-mail ou senha incorretos.', 'auth/wrong-password': 'E-mail ou senha incorretos.', 'auth/user-not-found': 'E-mail ou senha incorretos.', 'auth/invalid-email': 'E-mail inválido.', 'auth/email-already-in-use': 'Este e-mail já tem cadastro. Use “Entrar”.', 'auth/weak-password': 'A senha precisa ter pelo menos 6 caracteres.', 'auth/missing-password': 'Informe a senha.', 'auth/network-request-failed': 'Sem conexão. Tente de novo.', 'auth/popup-closed-by-user': 'Login com Google cancelado.', 'auth/cancelled-popup-request': 'Login com Google cancelado.', 'auth/unauthorized-domain': 'Domínio não autorizado no Firebase (Authentication → Configurações → Domínios autorizados).', 'auth/operation-not-allowed': 'Login com Google ainda não foi ativado no Firebase.', 'auth/too-many-requests': 'Muitas tentativas. Aguarde um pouco.' };
function vAuth() {
  if (V.auth === 'carregando') return `<div class="auth">${LOGO}<p class="lead">Abrindo…</p></div>`;
  if (V.auth === 'pending') return `<div class="auth">${LOGO}<h1>Quase lá</h1><p class="lead">Seu acesso foi solicitado. Peça à administradora para aprová-lo e abra o app de novo.</p><p class="mu">Se ela pedir, informe este código:</p><button class="code" data-a="copyid">${esc(ME.id)}</button><button class="lk" data-a="sair">Sair</button></div>`;
  const up = V.auth === 'signup';
  return `<div class="auth">${LOGO}<h1>${up ? 'Criar acesso' : 'Agenda'}</h1><p class="lead">${up ? 'Preencha seus dados. A administradora vai aprovar seu acesso.' : 'Entre para ver a agenda do dia.'}</p>
  <form id="fa" novalidate>${up ? '<label>Seu nome</label><input id="an" autocomplete="name" placeholder="Nome e sobrenome">' : ''}<label>E-mail</label><input id="ae" type="email" autocomplete="email" inputmode="email" autocapitalize="none" placeholder="voce@email.com"><label>Senha</label><input id="as" type="password" autocomplete="${up ? 'new-password' : 'current-password'}" placeholder="••••••••">
  <p id="wn" class="er"></p><button class="btn pr" id="ab" type="submit">${up ? 'Criar acesso' : 'Entrar'}</button></form>
  <div class="or"><span>ou</span></div><button class="btn gg" data-a="google" type="button"><svg width="18" height="18" viewBox="0 0 48 48"><path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C35.8 2.4 30.3 0 24 0 14.6 0 6.5 5.4 2.6 13.2l7.9 6.1C12.4 13.6 17.7 9.5 24 9.5z"/><path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.7c-.6 3-2.3 5.5-4.8 7.2l7.5 5.8c4.4-4.1 7.1-10.1 7.1-17.5z"/><path fill="#FBBC05" d="M10.5 28.7c-.5-1.4-.8-3-.8-4.7s.3-3.2.8-4.7l-7.9-6.1C.9 16.400 0 20.100 0 24s.9 7.600 2.600 10.800l7.900-6.100z"/><path fill="#34A853" d="M24 48c6.500 0 11.900-2.100 15.900-5.800l-7.500-5.800c-2.100 1.400-4.800 2.300-8.400 2.300-6.300 0-11.600-4.100-13.500-9.800l-7.900 6.100C6.500 42.600 14.600 48 24 48z"/></svg>Continuar com Google</button>
  <button class="lk" data-a="authmode">${up ? 'Já tenho acesso · Entrar' : 'Primeiro acesso · Criar conta'}</button>${up ? '' : '<button class="lk mu" data-a="forgot" style="font-weight:500;margin-top:0">Esqueci minha senha</button>'}</div>`;
}
async function doAuth() {
  const e = ($('#ae') || {}).value.trim(), s = ($('#as') || {}).value, n = ($('#an') || { value: '' }).value.trim(), up = V.auth === 'signup', b = $('#ab');
  if (!e || !s) { toast('Informe e-mail e senha.'); return; } if (up && !n) { toast('Informe seu nome.'); return; }
  b.disabled = true;
  try { up ? await B.signUp(n, e, s) : await B.signIn(e, s); }
  catch (x) { const w = $('#wn'); if (w) w.textContent = AE[x.code] || 'Não foi possível entrar. Tente de novo.'; const bb = $('#ab'); if (bb) bb.disabled = false; }
}

/* ---------- ações ---------- */
async function setClaim(uid, prof) {
  try {
    if (!prof) { await DB.doc('claims/' + uid).delete(); return; }
    const other = S.claims.find(c => c.prof === prof && c.id !== uid); if (other) await DB.doc('claims/' + other.id).delete();
    await DB.doc('claims/' + uid).set({ prof });
  } catch (e) { note('Não foi possível vincular.'); }
}
const delRec = async a => { if (!DB) return; try { await DB.doc('financeiro/' + (claimUid(a.profissionalId) || ME.id) + '/recebimentos/' + a.id).delete(); } catch (e) { } };
const A = {
  tab: v => { V.tab = v; closeSheet(); render(); window.scrollTo(0, 0); },
  mode: v => { V.mode = v; render(); }, prev: () => mv(-1), next: () => mv(1),
  hoje: () => { V.date = hoje(); render(); }, goDia: v => { V.date = v; V.mode = 'dia'; render(); window.scrollTo(0, 0); }, pick: v => { V.date = v; render(); },
  fprof: v => { V.prof = v; render(); },
  apt: aptSheet, fab: () => V.tab === 'clientes' ? cliForm() : aptForm(null), editApt: v => aptForm(v), saveApt,
  st: async (v, b) => {
    const a = S.agendamentos.find(x => x.id === v);
    if (a && a.status === 'atendido') { if (!canAct(a)) { note('Só a profissional do horário altera um atendimento já registrado.'); return; } await delRec(a); }
    try { await upd(v, { status: b.dataset.s }); closeSheet(); } catch (e) { }
  },
  atend: v => { const a = S.agendamentos.find(x => x.id === v); if (a && !a.tcle && V.tw !== v) { V.tw = v; note('TCLE deste procedimento ainda não foi assinado. Toque em “Atendido” de novo para registrar mesmo assim.'); return; } V.tw = null; sheet(`<h3>Registrar atendimento</h3><label>Valor recebido (R$)</label><input id="vr" type="number" inputmode="decimal" step="0.01" value="${a ? a.valor : 0}"><p id="wn" class="er"></p><button class="btn pr" data-a="doAtend" data-v="${v}">Confirmar atendimento</button>`); },
  doAtend: async v => {
    const a = S.agendamentos.find(x => x.id === v); if (!a) return; const val = +$('#vr').value || 0;
    try {
      if (DB) {
        const tu = claimUid(a.profissionalId) || ME.id;
        if (!tu || !canAct(a)) { toast('Só a profissional responsável (ou a administradora) registra o valor.'); return; }
        await lim(DB.doc('financeiro/' + tu + '/recebimentos/' + v).set({ valor: val, data: a.data, clienteId: a.clienteId, servicoNome: a.servicoNome, profissionalId: a.profissionalId || '' }));
        await upd(v, { status: 'atendido' });
      } else await upd(v, { status: 'atendido', valorRecebido: val });
      closeSheet();
    } catch (e) { toast('Não foi possível registrar. Verifique a conexão.'); }
  },
  sent: async v => { try { await upd(v, { msgEnviada: true }); } catch (e) { } setTimeout(closeSheet, 400); },
  delApt: async (v, b) => {
    if (V.del !== v) { V.del = v; b.textContent = 'Toque de novo para excluir'; return; }
    const a = S.agendamentos.find(x => x.id === v); if (a && a.status === 'atendido') { if (!canAct(a)) { note('Só a profissional do horário exclui um atendimento registrado.'); return; } await delRec(a); }
    await del('agendamentos', v); closeSheet();
  },
  cli: cliSheet, tcle: tcleForm, saveTcle, printTcle, refazTcle: v => { V.refazT = true; tcleForm(v); }, termo: termoForm, saveTermo, printTermo, refazT: v => { V.refazT = true; termoForm(v); }, sigclr: () => sigInit(), fotos: fotosAbrir, fgrade: () => fotosGrade(), ffil: v => { V.ff = v; fotosGrade(); }, fver: fotoVer, fcmp: () => fotosComparar(), fsalvar: fotosSalvar,
  ftipo: (v, b) => { $('#ftp').value = v; b.parentNode.querySelectorAll('button').forEach(x => x.classList.toggle('on', x === b)); },
  fdel: async (v, b) => { if (V.del !== v) { V.del = v; b.textContent = 'Toque de novo para excluir'; return; } V.del = null; try { await fotoRemove(V.fc, v); V.fl = V.fl.filter(x => x.id !== v); note('Foto excluída.'); fotosGrade(); } catch (e) { note('Não foi possível excluir.'); } }, anForm, saveAn, printAn, editCli: v => cliForm(v), saveCli, newFor: v => aptForm(null, { clienteId: v }),
  rprev: () => { const [y, m] = V.rm.split('-').map(Number); V.rm = iso(new Date(y, m - 2, 1)).slice(0, 7); render(); },
  rnext: () => { const [y, m] = V.rm.split('-').map(Number); V.rm = iso(new Date(y, m, 1)).slice(0, 7); render(); },
  srv: v => srvForm(v), newSrv: () => srvForm(), prof: v => profForm(v), newProf: () => profForm(),
  saveProf: async () => { const n = $('#pnm').value.trim(); if (!n) { toast('Informe o nome.'); return; } const old = V.edit ? S.profissionais.find(x => x.id === V.edit) : {}; try { await put('profissionais', Object.assign({}, old, { nome: n })); closeSheet(); } catch (e) { } },
  delProf: async (v, b) => { if (V.del !== v) { V.del = v; b.textContent = 'Toque de novo para excluir'; return; } await del('profissionais', v); if (V.prof === v) V.prof = ''; closeSheet(); },
  saveSrv: async () => { const n = $('#sn').value.trim(); if (!n) { toast('Informe o nome.'); return; } const old = V.edit ? S.servicos.find(x => x.id === V.edit) : {}; try { await put('servicos', Object.assign({}, old, { nome: n, dur: +$('#sd').value || 60, valor: +$('#sv').value || 0, tcle: ($('#stc') || { value: '' }).value.trim() })); closeSheet(); } catch (e) { } },
  delSrv: async (v, b) => { if (V.del !== v) { V.del = v; b.textContent = 'Toque de novo para excluir'; return; } await del('servicos', v); closeSheet(); },
  sug: async () => { try { for (const [nome, dur, valor] of SUG) await put('servicos', { nome, dur, valor }); } catch (e) { } },
  claim: v => setClaim(ME.id, v), unclaim: async v => { await setClaim(v, ''); closeSheet(); },
  aprovar: async v => { try { await DB.doc('usuarios/' + v).update({ ativo: true }); } catch (e) { note('Não foi possível aprovar.'); } },
  revogar: async (v, b) => { if (V.del !== v) { V.del = v; b.textContent = 'Toque de novo'; return; } V.del = null; try { await DB.doc('usuarios/' + v).update({ ativo: false }); await setClaim(v, ''); } catch (e) { note('Não foi possível remover.'); } },
  sair: () => B && B.signOut(),
  google: async () => { try { await B.google(); } catch (x) { toast(AE[x.code] || 'Não foi possível entrar com Google.'); } },
  authmode: () => { V.auth = V.auth === 'signup' ? 'login' : 'signup'; render(); },
  forgot: async () => { const e = ($('#ae') || {}).value.trim(); if (!e) { toast('Digite seu e-mail acima e toque de novo.'); return; } try { await B.reset(e); toast('Enviamos um link de redefinição para o seu e-mail.'); } catch (x) { toast(AE[x.code] || 'Não foi possível enviar.'); } },
  copyid: async () => { try { await navigator.clipboard.writeText(ME.id); note('Código copiado'); } catch (e) { } },
  close: closeSheet,
};
document.addEventListener('click', e => { const b = e.target.closest('[data-a]'); if (!b) return; const a = b.dataset.a; if (a !== 'sent') e.preventDefault(); if (A[a]) A[a](b.dataset.v, b); });
document.addEventListener('change', e => { if (e.target.id === 'fcam' || e.target.id === 'fgal') { const fs = [...e.target.files]; fotosEscolhidas(fs).finally(() => { try { e.target.value = ''; } catch (x) { } }); return; } if (e.target.type === 'radio' && (e.target.name || '').startsWith('an_')) { const d = document.querySelector(`[data-d="${e.target.name.slice(3)}"]`); if (d) d.hidden = e.target.value !== 'Sim'; }
  const t = e.target;
  if (t.id === 'fdt' && $('#fh')) { const cur = $('#fh').value; $('#fh').innerHTML = horaOpts(t.value, cur, ''); }
  if (t.id === 'sA' || t.id === 'sD') { fotosComparar($('#sA').value, $('#sD').value); return; }
  if (t.id === 'fc' && $('#nc')) $('#nc').hidden = t.value !== '__n';
  if (t.id === 'fs') { const o = t.selectedOptions[0]; $('#fu').value = o.dataset.d; $('#fv').value = o.dataset.v; }
  if (t.id === 'en') saveCfg(t.value.trim());
  if (t.dataset && t.dataset.claimfor) setClaim(t.dataset.claimfor, t.value);
});
document.addEventListener('input', e => { const t = e.target; if (t.id === 'cc' || t.id === 'ncpf') t.value = maskCpf(t.value); if (t.id === 'ccep') t.value = maskCep(t.value); if (t.id === 'q') { V.q = e.target.value; $('#lista').innerHTML = listaCli(); } });
document.addEventListener('submit', e => { if (e.target.id === 'fa') { e.preventDefault(); doAuth(); } });

/* ---------- desenho ---------- */
function render() {
  if (document.body.dataset.mode === 'auth') { $('#main').innerHTML = vAuth(); return; }
  const t = V.tab;
  $('#main').innerHTML = t === 'agenda' ? vAgenda() : t === 'clientes' ? vClientes() : t === 'rel' ? vRel() : vAjustes();
  document.querySelectorAll('#nav button').forEach(b => b.classList.toggle('on', b.dataset.v === t));
  $('#fab').style.display = (t === 'agenda' || t === 'clientes') ? 'grid' : 'none';
}

/* ---------- início ---------- */
function startData() {
  const sub = c => UNS.push(DB.collection(c).onSnapshot(s => { S[c] = s.docs.map(d => Object.assign({ id: d.id }, d.data())); if (c === 'claims') subRec(); render(); }, () => { }));
  ['clientes', 'agendamentos', 'servicos', 'profissionais'].forEach(sub);
  sub('claims');
  if (ME.admin) sub('usuarios');
  UNS.push(DB.doc('config/geral').onSnapshot(s => { S.config = Object.assign({ nome: '' }, s.data() || {}); if (document.activeElement.id !== 'en') render(); }, () => { }));
  subRec();
}
function stopData() { UNS.forEach(f => f()); UNS = []; recUn.forEach(f => f()); recUn = []; recKey = ''; R = {}; REC = {}; Object.assign(S, { clientes: [], agendamentos: [], servicos: [], profissionais: [], claims: [], usuarios: [], config: { nome: '' } }); }

async function onUser(u) {
  stopData();
  if (!u) { DB = null; ME.id = null; ME.admin = false; V.auth = V.auth === 'signup' ? 'signup' : 'login'; mode('auth'); render(); return; }
  DB = B.db; ME.id = u.uid; ME.email = u.email || ''; ME.nome = u.displayName || B.nomeNovo || ''; ME.admin = false;
  let started = false;
  UNS.push(DB.doc('usuarios/' + u.uid).onSnapshot(async s => {
    if (!s.exists) {
      try { await DB.doc('usuarios/' + u.uid).set({ nome: B.nomeNovo || u.displayName || (u.email || '').split('@')[0], email: u.email || '', ativo: false, criadoEm: Date.now() }); } catch (e) { }
      return;
    }
    const d = s.data(); ME.nome = d.nome || ME.nome;
    if (d.ativo && !started) {
      started = true;
      try { ME.admin = (await DB.doc('admins/' + u.uid).get()).exists; } catch (e) { ME.admin = false; }
      mode('app'); startData(); render();
    } else if (!d.ativo) {
      if (started) { location.reload(); return; }
      V.auth = 'pending'; mode('auth'); render();
    }
  }, () => { V.auth = 'pending'; mode('auth'); render(); }));
}

async function boot() {
  $('#nav').innerHTML = [['agenda', 'cal', 'Agenda'], ['clientes', 'users', 'Clientes'], ['rel', 'chart', 'Relatórios'], ['ajustes', 'sliders', 'Ajustes']].map(([k, i, l]) => `<button data-a="tab" data-v="${k}">${IC[i]}<span>${l}</span></button>`).join('');
  $('#fab').innerHTML = IC.plus;
  const cfg = window.FIREBASE_CONFIG;
  if (cfg && cfg.apiKey) { V.auth = 'carregando'; mode('auth'); render(); }
  try { B = await makeBackend(cfg); } catch (e) { B = { demo: true }; note('Não foi possível conectar ao Firebase. Abrindo em modo demonstração.'); }
  if (B.demo) {
    DB = null; ME.admin = true;
    try { const l = JSON.parse(localStorage.getItem(LS) || 'null'); if (l) Object.assign(S, l); } catch (e) { }
    S.claims = []; S.usuarios = []; mode('app'); render();
  } else { V.auth = 'login'; B.onUser(onUser); }
}
boot();
if (location.hash === '#debug') window.__agenda = { V, S, ME, render, mode };
if ('serviceWorker' in navigator && location.protocol.startsWith('http')) addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => { }));
