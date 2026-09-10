# Labz SaaS — backend real + PostgreSQL

Esta fase transforma o protótipo HTML em uma aplicação full-stack inicial.

## Stack
- Frontend: HTML/CSS/JS existente
- API: Node.js + Express
- Banco: PostgreSQL
- ORM: Prisma
- Autenticação: JWT + bcrypt

## Rodar localmente
1. Instale Node.js 20+ e PostgreSQL.
2. Copie `.env.example` para `.env` e ajuste `DATABASE_URL` e `JWT_SECRET`.
3. Rode:
   npm install
   npm run prisma:generate
   npm run db:push
   npm run seed
   npm run dev
4. Abra http://localhost:3000

Login demo após o seed:
- demo@labzapp.com.br
- labz12345

## Segurança/multi-tenant
Pacientes, consultas e dietas possuem `ownerId`; as rotas sempre filtram pelo usuário autenticado.
Senhas são armazenadas com bcrypt, nunca em texto puro.

## Próximo passo
Migrar os handlers restantes do frontend que ainda escrevem em localStorage para chamadas da API,
adicionar cadastro/recuperação de senha, refresh token/cookies HttpOnly, auditoria, LGPD e deploy.
