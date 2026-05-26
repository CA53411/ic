# Platonic AI Backend — SPEC.md

## Architecture
- Supabase Edge Functions (Deno Runtime)
- Supabase PostgreSQL (RLS Policies)
- DeepSeek-V4-Flash API (SSE Streaming)
- Zpay Payment Gateway

## Edge Functions (7 core)

| Function | Path | Method | Auth | Description |
|----------|------|--------|------|-------------|
| chat-stream | /chat-stream | POST | JWT | SSE streaming conversation with DeepSeek |
| payment-create | /payment/create | POST | JWT | Create Zpay payment order |
| payment-callback | /payment/callback | GET | None | Zpay async callback |
| consolidation | /consolidation | POST | Service | STM→LTM memory consolidation |
| milestone-adjust | /milestone/adjust | POST | Service | Daily intimacy adjustment |
| energy | /energy | GET/POST | JWT | Query/consume energy |
| proactive | /proactive | POST | JWT | Generate proactive message |

## Shared Utilities
- `supabase/functions/_shared/cors.ts` — CORS headers
- `supabase/functions/_shared/supabase.ts` — Supabase client
- `supabase/functions/_shared/deepseek.ts` — DeepSeek API client
- `supabase/functions/_shared/zpay.ts` — Zpay API client

## Environment Variables
- DEEPSEEK_API_KEY — DeepSeek API key
- ZPAY_PID — Zpay merchant ID
- ZPAY_KEY — Zpay secret key
- SUPABASE_URL — Auto-injected
- SUPABASE_SERVICE_ROLE_KEY — Auto-injected

## Database
- Schema: /mnt/agents/output/schema.sql
- Deploy via Supabase Dashboard SQL Editor
