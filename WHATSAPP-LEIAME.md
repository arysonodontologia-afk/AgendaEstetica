# WhatsApp automático — passo a passo

O que vai acontecer, sozinho, para cada agendamento (só para pacientes com a caixinha de autorização marcada no cadastro):

| Quando | Mensagem |
|---|---|
| Logo depois de agendar | Aviso do agendamento (data, hora, procedimento, profissional) |
| ~24 h antes | Pedido de confirmação, com os botões **Confirmar** e **Preciso remarcar** |
| No dia, a partir das 08:00 | Lembrete |

- Se a paciente toca em **Confirmar**, o status vira "Confirmado" na agenda.
- Se toca em **Preciso remarcar**, aparece "⚠ pediu remarcar" no agendamento e ela recebe uma resposta automática.
- Agendou com menos de 24 h de antecedência: a confirmação sai cerca de 1 hora depois do agendamento. Agendou hoje depois das 08:00: não há lembrete do dia (a paciente acabou de receber o aviso).
- Remarcou: o ciclo recomeça do zero.

Não é preciso CNPJ para começar. Sem verificação da empresa, a Meta permite mensagens para até 250 pacientes diferentes por dia — de sobra para a clínica.

---

## Parte A — Conta da Meta (≈ 40 min)

**A1. Número.** `92 98415-5635` precisa receber um SMS ou ligação de verificação.
- Se esse número já está no aplicativo WhatsApp comum, ele **não pode** ser usado na API sem antes ser desvinculado (as conversas do aplicativo comum se perdem). Se for o número principal da clínica, o mais seguro é usar um chip/número novo só para a automação.
- Se está no **WhatsApp Business** (aplicativo), a Meta oferece um modo de convivência com a API; a opção aparece na tela de cadastro do número.

**A2. Criar o aplicativo.**
1. Entre em https://developers.facebook.com com seu Facebook → **Meus aplicativos → Criar aplicativo**.
2. Tipo: **Empresa (Business)**. Crie ou escolha um *portfólio empresarial* (pode ser em seu nome, com o nome da clínica).
3. Adicione o produto **WhatsApp**.

**A3. Cadastrar o número.** Em **WhatsApp → Configuração da API (API Setup)**: adicione o número, escolha o nome de exibição (nome da clínica) e informe o código recebido. Anote:
- **ID do número de telefone** (Phone number ID) → vira o segredo `WA_PHONE_ID`

**A4. Token permanente.**
1. https://business.facebook.com/settings → **Usuários → Usuários do sistema → Adicionar** (função Administrador).
2. **Adicionar ativos**: o seu aplicativo e a conta do WhatsApp, com controle total.
3. **Gerar token**, selecione o aplicativo, validade **Nunca**, permissões `whatsapp_business_messaging` e `whatsapp_business_management`. Copie → segredo `WA_TOKEN`.

**A5. Segredo do aplicativo.** No app: **Configurações → Básico → Chave secreta do aplicativo** (Mostrar). Copie → segredo `WA_APP_SECRET`.

**A6. Senha do webhook.** Invente uma senha longa (ex.: `tulipa-azul-2026-xyz`). → segredo `WA_VERIFY_TOKEN`.

**A7. Forma de pagamento.** Em **WhatsApp Manager → Configurações da conta → Métodos de pagamento**, cadastre um cartão. Mensagens de modelo entregues são cobradas por unidade (veja a tabela atual da Meta).

**A8. Criar os 3 modelos de mensagem.** WhatsApp Manager → **Modelos de mensagem → Criar modelo**. Categoria **Utilidade**, idioma **Português (BR)**. Os **nomes** precisam ser exatamente estes:

**1) `agendamento_registrado`**
```
Olá, {{1}}! Seu atendimento está agendado.

Procedimento: {{2}}
Data: {{3}} às {{4}}
Profissional: {{5}}

Se precisar remarcar, é só responder esta mensagem. Até lá!
```
Exemplos para a Meta: Maria · Drenagem linfática · quinta-feira, 15/10 · 14:00 · Ana

**2) `confirmacao_atendimento`**
```
Olá, {{1}}! Passando para confirmar seu atendimento de {{2}} em {{3}} às {{4}}, com {{5}}. Você confirma sua presença?
```
Botões (tipo **Resposta rápida**): `Confirmar` e `Preciso remarcar`.

**3) `lembrete_atendimento`**
```
Bom dia, {{1}}! Lembrando do seu atendimento de hoje: {{2}} às {{3}}, com {{4}}. Estamos te esperando!
```
A aprovação costuma sair em minutos ou algumas horas. Mantenha o tom informativo (sem promoções) para continuar classificado como Utilidade.

---

## Parte B — Servidor (Firebase) (≈ 30 min)

**B1. Plano Blaze.** No Firebase: **Visão geral → Spark → Fazer upgrade → Blaze** e cadastre o cartão. A cota gratuita cobre o uso de uma clínica pequena; coloque um **alerta de orçamento** (ex.: R$ 20) em Uso e faturamento.

**B2. Instalar as ferramentas no iMac** (uma vez):
1. Instale o Node.js (versão LTS) de https://nodejs.org
2. Abra o **Terminal** e rode: `npm install -g firebase-tools` e depois `firebase login`

**B3. Preparar a pasta.** Descompacte `agenda-estetica-pwa.zip`. No Terminal, entre na pasta (digite `cd ` e arraste a pasta para a janela, Enter) e rode:
```
cd functions && npm install && cd ..
npm --prefix functions test
```
O teste deve terminar com `regras OK`.

**B4. Guardar os segredos** (o Terminal pede cada valor; cole e dê Enter):
```
firebase functions:secrets:set WA_TOKEN
firebase functions:secrets:set WA_PHONE_ID
firebase functions:secrets:set WA_VERIFY_TOKEN
firebase functions:secrets:set WA_APP_SECRET
```

**B5. Publicar.**
```
firebase deploy --only functions
```
No final aparece a URL da função **webhookWhatsApp** (algo como `https://webhookwhatsapp-xxxx-rj.a.run.app`). Copie.

**B6. Ligar o webhook na Meta.** No app da Meta: **WhatsApp → Configuração → Webhook → Editar**: cole a URL em *URL de retorno de chamada* e sua senha de A6 em *Token de verificação* → Verificar e salvar. Depois, em *Campos do webhook*, assine **messages**.

---

## Parte C — Ligar e testar

1. Publique o novo `app.js` no GitHub (pasta `docs`) e abra o app.
2. No **cadastro de uma paciente de teste** (você, com seu número), marque *"autoriza receber mensagens… por WhatsApp"*.
3. **Ajustes → Seu espaço → ligue "Mensagens automáticas por WhatsApp"**. (Desligado = nada é enviado.)
4. Crie um agendamento para essa paciente: em até 5 minutos chega o aviso. Toque no agendamento para ver o andamento: *"WhatsApp automático: agendamento ✓ · confirmação … · lembrete …"*.
5. Para testar a confirmação sem esperar: no Firebase → Firestore → `agendamentos/<id>`, apague o campo `wa.d1` e deixe o horário a mais de 3 horas à frente… ou simplesmente aguarde o ciclo normal.

**Se algo não chegar:** Firebase → **Functions → Registros (Logs)**. Erros de "template not found" = nome ou idioma do modelo diferente; "token" = token errado ou sem permissão.

## Observações
- O CPF/CNPJ que a Meta pedir é digitado **só nas telas da Meta**. Nunca coloque no app nem me envie.
- A paciente que responder qualquer coisa abre uma janela de 24 h em que a clínica pode responder de graça pelo WhatsApp Business.
- Os textos dos modelos são sugestões; ajuste o tom, mas mantenha os nomes e a ordem das variáveis `{{1}}…`.
