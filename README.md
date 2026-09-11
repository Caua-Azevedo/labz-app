# Labz SaaS — PostgreSQL integration

Esta versão remove a persistência de dados de negócio no `localStorage` e conecta o MVP à API e ao PostgreSQL.

## Stack
- Frontend: HTML/CSS/JavaScript
- API: Node.js + Express
- Banco: PostgreSQL
- ORM: Prisma
- Auth: JWT em cookie HttpOnly + bcrypt

## O que já persiste no PostgreSQL
- nutricionistas/usuários
- pacientes
- anamnese
- evoluções
- medidas corporais
- dietas e templates
- consultas
- status de consulta
- dados usados no financeiro

Cada registro é filtrado por `ownerId`, evitando mistura de dados entre nutricionistas.

## Rodar localmente
1. Instale Node.js 20+ e PostgreSQL.
2. Copie `.env.example` para `.env`.
3. Configure `DATABASE_URL` e troque `JWT_SECRET`.
4. Execute:

```bash
npm install
npm run prisma:generate
npm run db:push
npm run seed
npm run dev
```

Abra `http://localhost:3000`.

### Login de demonstração
- `demo@labzapp.com.br`
- `labz12345`

## Git
Esta entrega foi pensada para a branch:

```text
feat/postgresql-integration
```

Depois de validar:

```bash
git add .
git commit -m "feat: integra frontend ao PostgreSQL e remove localStorage"
git push
```

Depois abra PR para `DEV`.

## Segurança
- senha nunca é armazenada em texto puro;
- JWT fica em cookie `HttpOnly`;
- cookie usa `SameSite=Lax`;
- em `NODE_ENV=production`, o cookie exige HTTPS;
- rotas protegidas sempre verificam o usuário autenticado;
- entidades do consultório são consultadas com `ownerId`.

Antes de produção ainda devem entrar recuperação de senha, verificação de e-mail, CSRF explícito se a arquitetura mudar, rate limiting, logs/auditoria, política LGPD, backups e testes automatizados.
