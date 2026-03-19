# bitmacro-relay-agent

[![CI](https://github.com/bitmacro/relay-agent/actions/workflows/ci.yml/badge.svg)](https://github.com/bitmacro/relay-agent/actions/workflows/ci.yml)
[![npm version](https://img.shields.io/npm/v/bitmacro-relay-agent.svg)](https://www.npmjs.com/package/bitmacro-relay-agent)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

> **Documentação principal:** [README.md](README.md) (English)

**Gere o seu relay Nostr sem tocar no terminal.**

O `relay-agent` é uma API REST que corre no servidor do relay e traduz pedidos HTTP em comandos strfry CLI. Faz parte do ecossistema [BitMacro Relay Manager](https://bitmacro.io).

---

## Início Rápido

### Via npx

```bash
npx bitmacro-relay-agent --port 7800 --token seu-token-secreto
```

### Via Docker

A imagem inclui o binário strfry (de dockurr/strfry). Monte o volume de dados:

```bash
docker build -t bitmacro-relay-agent .
docker run -p 7800:7800 \
  -e RELAY_AGENT_TOKEN=seu-token-secreto \
  -v /caminho/para/strfry-db:/app/strfry-db \
  -v /caminho/para/whitelist.txt:/app/whitelist.txt \
  bitmacro-relay-agent
```

**Múltiplos relays:** Use o fragmento compose. Clone o relay-agent junto ao docker-compose.yml:

```bash
docker compose -f docker-compose.yml -f relay-agent/docker-compose.relay-agents.yml up -d relay-agent-private relay-agent-public relay-agent-paid
```

Consulte `docker-compose.relay-agents.yml` para o setup completo (1 agente por relay na v0.1).

---

## Endpoints da API REST

| Método | Path | Descrição | Exemplo de Resposta |
|--------|------|------------|---------------------|
| `GET` | `/health` | Health check (sem auth) | `{"status":"ok","timestamp":"..."}` |
| `GET` | `/events` | Listar eventos (filtro NIP-01) | `[{id, pubkey, kind, ...}, ...]` |
| `DELETE` | `/events/:id` | Apagar evento por id | `{"deleted":"<id>"}` |
| `GET` | `/stats` | Estatísticas do relay | `{total_events, db_size, uptime_seconds, strfry_version}` |
| `POST` | `/policy/block` | Bloquear pubkey | `{"blocked":"<pubkey>"}` |
| `POST` | `/policy/allow` | Permitir pubkey | `{"allowed":"<pubkey>"}` |
| `GET` | `/users` | Listar pubkeys únicas | `{"users":["<pubkey>", ...]}` |

### Parâmetros de query para `GET /events`

| Parâmetro | Tipo | Descrição |
|----------|------|-----------|
| `kinds` | separados por vírgula | ex: `1,3` |
| `authors` | separados por vírgula | pubkeys |
| `since` | unix timestamp | |
| `until` | unix timestamp | |
| `limit` | número | máximo de eventos a devolver |

### Autenticação

Todos os endpoints exceto `/health` requerem:

```
Authorization: Bearer <seu-token>
```

---

## Variáveis de Ambiente

| Variável | Default | Descrição |
|----------|---------|-----------|
| `RELAY_AGENT_TOKEN` | — | **Obrigatório.** Token Bearer para auth da API |
| `STRFRY_BIN` | `strfry` | Caminho para o binário strfry |
| `STRFRY_DB_PATH` | `./strfry-db` | Caminho para o diretório da base de dados strfry |
| `STRFRY_CONFIG` | — | Caminho para o ficheiro de config strfry (path explícito da db) |
| `WHITELIST_PATH` | `/etc/strfry/whitelist.txt` | Caminho para o ficheiro whitelist |
| `PORT` | `7800` | Porta do servidor HTTP |

---

## Compatibilidade

| relay-agent | strfry |
|-------------|--------|
| 0.1.x | 0.9.x |

---

## Arquitetura

```
bitmacro-api (Vercel)
    │  HTTP REST + Bearer JWT
    ▼
relay-agent  ← este pacote
    │  child_process spawn()
    ▼
strfry (processo C++ local / LMDB)
```

O relay-agent é **stateless** — não tem base de dados. O estado vive no Supabase, gerido pelo bitmacro-api. O relay-agent apenas traduz chamadas HTTP em comandos strfry CLI.

---

## Resolução de Problemas

### 503 "relay unavailable"

1. **Capturar o erro** — execute logs num terminal e curl noutro:
   ```bash
   # Terminal 1
   docker compose -f docker-compose.yml -f relay-agent/docker-compose.relay-agents.yml logs -f relay-agent-private
   # Terminal 2
   curl -H "Authorization: Bearer TOKEN" "http://localhost:7811/events?limit=3"
   ```
   O stderr do strfry aparecerá nos logs.

2. **LMDB "Resource temporarily unavailable"** — relay e relay-agent partilham a mesma db. Aumente `maxreaders` no strfry.conf do **relay** (ex: `./nostr/private/strfry.conf`):
   ```
   dbParams {
     maxreaders = 512
   }
   ```
   Depois reinicie o relay: `docker restart relay_private`

3. **Verificar path da db** — relay-agent monta `./nostr/private/data:/app/strfry-db`. O relay (`relay_private`) deve usar o **mesmo** path no host. Verifique o `docker-compose.yml` principal:
   ```bash
   grep -A5 relay_private docker-compose.yml
   ```

4. **Testar strfry dentro do container**:
   ```bash
   docker compose -f docker-compose.yml -f relay-agent/docker-compose.relay-agents.yml run --rm relay-agent-private sh -c 'ls -la /app/strfry-db && /app/strfry --config /app/strfry.conf scan "{}" | head -3'
   ```
   Se `data.mdb` estiver em falta ou o strfry falhar, corrija o path do volume.

---

## Segurança

- **Execute numa rede privada.** O relay-agent deve correr no servidor do operador e **nunca ser exposto diretamente à internet**.
- O acesso é controlado pelo bitmacro-api, que faz proxy dos pedidos com um Bearer token partilhado.
- Use um token forte e aleatório em produção. Rode-o se for comprometido.

---

## Contribuir

Consulte [CONTRIBUTING.md](CONTRIBUTING.md) para setup e diretrizes de PR.
