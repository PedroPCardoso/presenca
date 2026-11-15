# Presença GC

Sistema simples para líderes de GC registrarem a presença dos encontros e
acompanharem a frequência do grupo.

- **Lista de presença**: toque no nome para marcar. Cada toque é salvo na hora, então
  várias pessoas podem marcar ao mesmo tempo pelo link público. Cada pessoa pode ser
  marcada como visitante, e dá para adicionar gente na hora. Visitantes recentes
  aparecem como sugestão.
- **Confirmar**: só o líder. Abre o link, revisa quem já marcou e confirma o encontro;
  só então ele entra no painel e nas estatísticas. Quem foi adicionado sem marcar
  "visitante" vira membro do GC ao confirmar.
- **Copiar para o WhatsApp**: gera o texto formatado da lista.
- **Painel**: número de encontros, média de presentes, gráfico por encontro,
  quem faltou nos últimos encontros seguidos e a frequência de cada membro.
- **Membros**: adicionar, renomear, tirar do GC e trazer de volta. O histórico de
  presença é mantido.

## Stack

Next.js 16 (App Router, Server Actions, Cache Components), Postgres com Drizzle ORM,
Tailwind CSS 4, Zod e Vitest.

## Rodando localmente

```bash
cp .env.example .env.local    # defina SEED_RUBENS_PASSWORD
docker compose up -d          # Postgres na porta 5434
npm install
npm run db:migrate            # cria as tabelas
npm run db:seed               # usuário rubens, GC Berimbau, membros e encontro de 12/11
npm run dev
```

## Scripts

| Comando | O que faz |
|---|---|
| `npm run dev` | servidor de desenvolvimento |
| `npm run build` / `npm start` | build e servidor de produção |
| `npm test` | testes unitários (Vitest) |
| `npm run typecheck` / `npm run lint` | TypeScript e ESLint |
| `npm run db:generate` | gera uma migration a partir de `src/db/schema.ts` |
| `npm run db:migrate` | aplica as migrations |
| `npm run db:seed` | popula os dados iniciais (pode rodar mais de uma vez) |

## Deploy (Vercel + Neon)

1. Crie um banco Postgres no [Neon](https://neon.tech) e copie a connection string.
2. Importe o repositório na [Vercel](https://vercel.com) e configure a variável
   `DATABASE_URL`.
3. Com o `DATABASE_URL` do Neon no seu `.env.local`, rode `npm run db:migrate` e
   `npm run db:seed` uma vez.

## Estrutura

```
src/
  actions/      Server Actions (login, presença, membros). Todas validam com Zod e checam permissão.
  app/          rotas: /login, /gc/[id] (painel), /presenca, /encontros, /membros
  components/   componentes compartilhados
  db/           schema Drizzle, conexão e seed
  lib/          sessão, DAL (autorização), consultas e funções puras (datas, estatísticas, texto do WhatsApp)
drizzle/        migrations SQL
```

**Segurança.** As sessões ficam no banco, e o cookie guarda um token aleatório
(httpOnly) do qual o banco só conhece o hash SHA-256. As senhas usam bcrypt. A
autorização acontece na DAL (`src/lib/dal.ts`) e em cada Server Action: o usuário
só acessa os GCs que lidera.

`legacy-index.html` é a versão antiga da lista, em HTML estático, que continua
publicada no GitHub Pages.
