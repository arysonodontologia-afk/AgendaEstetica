# Agenda Estética — instalar no iPhone (via GitHub Pages)

App de agenda para centro de estética, instalável no iPhone como aplicativo (PWA).
Dados e logins ficam no **Firebase** (gratuito para este porte); o app fica hospedado no **GitHub Pages**.

> Sem configurar o Firebase, o app abre em **modo demonstração** (dados só no aparelho). Serve para ver o visual e testar.

## 1. Criar o projeto no Firebase (≈10 min)

1. Acesse https://console.firebase.google.com → **Adicionar projeto** (pode desativar o Google Analytics).
2. **Authentication → Vamos começar → E-mail/senha → Ativar**.
3. **Firestore Database → Criar banco de dados** → modo de produção → local **southamerica-east1 (São Paulo)**.
4. Em Firestore, aba **Regras**: apague o que estiver lá, cole o conteúdo do arquivo `firestore.rules` e clique em **Publicar**.
5. Engrenagem ⚙️ → **Configurações do projeto** → em "Seus apps" clique no ícone **</>** (Web) → dê um nome → **Registrar app**.
   Copie os valores de `firebaseConfig` e cole em `docs/firebase-config.js` (substituindo as aspas vazias).

## 2. Publicar no GitHub

1. Em https://github.com/new crie um repositório (ex.: `agenda-estetica`).
2. **Add file → Upload files** e envie a pasta `docs` inteira (com o `firebase-config.js` já preenchido), o `firestore.rules` e este `LEIAME.md`.
3. **Settings → Pages → Build and deployment**: Source **Deploy from a branch**, Branch **main**, pasta **/docs** → Save.
4. Após ~1 minuto o endereço fica `https://SEU-USUARIO.github.io/agenda-estetica/`.
5. De volta ao Firebase: **Authentication → Configurações → Domínios autorizados → Adicionar domínio** → `SEU-USUARIO.github.io`.

## 3. Primeiro acesso (administradora)

1. Abra o endereço, toque em **Primeiro acesso · Criar conta** e cadastre-se. Aparecerá a tela "Quase lá" com um **código**. Toque nele para copiar.
2. No Firebase → **Firestore Database → Dados**:
   - coleção **usuarios** → documento com esse código → mude o campo `ativo` para **true**;
   - **Iniciar coleção** `admins` → ID do documento = o mesmo código → campo `ok` (boolean) = **true**.
3. Reabra o app e entre. Em **Ajustes**: cadastre as profissionais e os procedimentos.

## 4. Instalar no iPhone

No **Safari**: abra o endereço → botão **Compartilhar** → **Adicionar à Tela de Início**. O ícone aparece como um app e abre em tela cheia.

## 5. Equipe

Cada profissional abre o endereço, toca em **Criar conta** e espera. A administradora vai em **Ajustes → Acessos**, toca em **Aprovar** e escolhe a profissional na lista (vínculo). A partir daí:

- todas veem a agenda completa;
- cada profissional vê **só os próprios relatórios e valores**; a administradora vê tudo;
- o app **não deixa salvar** dois atendimentos no mesmo horário para a mesma profissional (nem para a mesma cliente).

## Atualizações

Edite os arquivos no GitHub (ícone de lápis) e salve. O app instalado pega a versão nova na próxima abertura com internet.

## Observações

- Precisa de internet para salvar. A tela abre sem internet, mas as alterações exigem conexão.
- Os dados de clientes (nome, telefone, aniversário) são dados pessoais: use só com a ciência delas (LGPD) e dê acesso apenas a quem precisa.
- Os dados do protótipo anterior (feito no Claude) não migram sozinhos: o cadastro recomeça vazio.
