You are a senior backend architect building a production-ready crypto trading signal engine.

We are starting from an empty repository.

Goal:
Create a scalable REST API service which later will be called by a Telegram bot that generates trading setups from:

optional chart screenshot (vision model)

market data (Binance/Coindesk OHLCV)

rule engine + LLM reasoning

The Telegram bot will call this API later.

Stack requirements (STRICT):

Runtime: Bun

Framework: Hono

Database: PostgreSQL

Cache: Redis

Queue: Redis-based job queue

Exchange: Coindesk public OCLHV API data

LLM Providers available: OpenAI + DeepSeek

Project must be modular and production structured (NOT monolithic file)

Architecture philosophy:
The LLM does NOT directly output trading signals.
The LLM describes the market.
The deterministic engine creates the trade.

Pipeline:

REQUEST
↓
Auth middleware (subscription check — temporarily bypassed but implemented)
↓
Rate limit middleware
↓
Create job in queue
↓
Worker processes job:
1) Fetch OHLCV HTF (e.g. 4H) + LTF (e.g. 15m)
2) Compute metrics:
- ATR%
- 24h range %
- trend regime
- volatility regime
3) If image exists → vision model extracts structure
4) LLM produces structured market interpretation
5) Deterministic decision engine builds trade setup
6) Risk manager builds TP/SL
↓
Store result
↓
API returns job id
↓
Client polls result

We are building an MVP but structured for scale.

PROJECT STRUCTURE (must follow)

src/
server.ts

config/
env.ts

db/
postgres.ts
redis.ts

modules/
auth/
auth.middleware.ts
subscription.service.ts

market/
  binance.client.ts
  ohlcv.service.ts
  metrics.service.ts

vision/
  vision.service.ts

ai/
  llm.service.ts
  prompts/

decision/
  decision.engine.ts
  risk.manager.ts
  models.ts

jobs/
  queue.ts
  worker.ts
  signal.processor.ts

signal/
  signal.controller.ts
  signal.service.ts
  signal.repository.ts

utils/
logger.ts
math.ts
timeframes.ts

FEATURES TO IMPLEMENT

POST /signal
Body:
{
"pair": "BTCUSDT",
"holding": "scalp|daily|swing|auto",
"risk": "safe|growth|aggressive",
"image_base64": "optional"
}

Response:
{ jobId: string }

GET /signal/
Returns:

processing

completed + trade setup

failed

TRADING LOGIC MODEL

LLM OUTPUT (structured JSON):
{
"bias": "bullish|bearish|neutral",
"structure": "trend|range|breakout|reversal",
"key_levels": [numbers],
"liquidity": "above|below|both|none",
"volatility": "low|normal|high",
"confidence": 0-1
}

DETERMINISTIC ENGINE builds:

TradeSetup:
{
side: "long" | "short" | "no_trade",
entry: number,
stop_loss: number,
take_profit: number[],
rr: number
}

Rules:

Never trade in low volatility range

SL based on ATR multiplier

TP based on RR tiers (1.5R, 2.5R, 4R)

Aggressive risk tight SL

Safe risk wide SL

Reject setup if RR < 1.2

DATABASE TABLES

users
subscriptions
signal_jobs
signal_results

Subscription logic:
Implement middleware but comment out enforcement:
if (!activeSubscription) {
// temporarily bypassed
// throw error
}

IMPORTANT IMPLEMENTATION RULES

Use TypeScript

Use zod validation

No giant files

Each module must be independent

Worker must be separate from API server

Every external call must have timeout + retry

Vision + LLM calls must be wrapped in provider adapters

Clean error handling

DELIVERABLE

Generate:

Folder structure

All core files

Queue worker

One working end-to-end signal generation flow

Do NOT explain concepts.
Do NOT summarize.
Just start generating the codebase step by step.