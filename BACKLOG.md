# Backlog — relay-agent

Ideias e melhorias sem compromisso de roadmap; não substitui Issues no GitHub.

---

## Alta relevância — LMDB com `strfry relay` e CLI no mesmo diretório

**Contexto:** Com `RELAY_INSTANCES`, o agent corre subcomandos `strfry` (`scan`, etc.) contra a mesma pasta LMDB que o contentor `strfry relay`. Em relays de **elevada carga** (típico **público**) isto aumenta contenção LMDB (`mdb_txn_begin: Resource temporarily unavailable`), agravado por **leitores stale** após crashes. Em **private/paid** o mesmo mecanismo existe, mas com carga menor costuma passar despercebido.

**Decisão de operação (BitMacro):** relay **público** na VPS **sem** relay-agent; relay-agent apenas no EQ14 para **private** + **paid** (baixa carga). Ver `bitmacro-docs/attachments/RELAY_SIGNER_MIGRATION_CHECKLIST.md`.

**Possíveis ajustes no agent (futuro):**

- [ ] **Stats / contagens:** evitar `strfry scan "{}"` (ou uso equivalente pesado) em BD “quente”; explorar contagens só leitura (`mdb_stat`, metadados, ou cache TTL) onde fizer sentido.
- [ ] **Resiliência:** backoff explícito e erros menos “duros” quando LMDB devolve `EAGAIN`, com métricas/log estruturado.
- [ ] **Documentação:** cookbook “alto volume” vs “painel apenas private/paid” e quando **não** montar uma instância no agent.

---

*Última actualização: 2026-05-06.*
