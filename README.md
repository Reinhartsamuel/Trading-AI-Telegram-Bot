# Crypto Trading Signal Engine

Production-ready REST API that generates crypto trading signals using LLM-powered market analysis and deterministic trading rules.

## Architecture

```
REQUEST
  ↓
Auth & Rate Limit Middleware
  ↓
Create Job in Queue
  ↓
Worker Process:
  1. Fetch OHLCV (HTF + LTF)
  2. Calculate Market Metrics (ATR, Range, Trend, Volatility)
  3. Vision Analysis (optional chart image)
  4. LLM Market Interpretation
  5. Deterministic Decision Engine
  6. Risk Management (TP/SL calculation)
  ↓
Store Result in Database
  ↓
Client Polls Result
```

## Stack

- **Runtime**: Bun
- **Framework**: Hono
- **Database**: PostgreSQL
- **Cache**: Redis
- **Job Queue**: Custom Redis-based (LPUSH/BRPOP pattern)
- **Exchange Data**: Binance public API
- **LLM**: OpenAI / DeepSeek
- **Vision**: OpenAI Vision API

## Setup

### Prerequisites

- Bun 1.0+
- PostgreSQL 14+
- Redis 6+

### Local Development (Docker)

```bash
# Start PostgreSQL and Redis
docker-compose up -d

# Copy environment template
cp .env.example .env

# Edit .env with your API keys
# OPENAI_API_KEY=sk-...
# DEEPSEEK_API_KEY=sk-...
```

### Install Dependencies

```bash
bun install
```

### Database Setup

```bash
# Generate migrations
bun run db:generate

# Run migrations
bun run db:migrate
```

### Environment Variables

See `.env.example` for all options:

```
PORT=3000
DATABASE_URL=postgresql://user:password@localhost:5432/trading_engine
REDIS_URL=redis://localhost:6379
OPENAI_API_KEY=sk-...
DEEPSEEK_API_KEY=sk-...
BINANCE_API_URL=https://api.binance.com/api/v3
```

## Running

### Development

```bash
# Terminal 1: Start API server
bun run dev

# Terminal 2: Start job worker
bun run dev:worker

# Terminal 3: Start Telegram bot (optional)
bun run dev:telegram
```

### Production

```bash
# Build
bun run build

# Run server
bun run start

# Run worker (separate process)
bun run start:worker

# Run Telegram bot (optional, separate process)
bun run start:telegram
```

## Telegram Bot

A Telegram bot client that integrates with the REST API to provide trading signals directly in Telegram.

### Setup

1. **Create bot with BotFather**:
   - Open Telegram and search for `@BotFather`
   - Send `/newbot` command
   - Follow instructions
   - Get your bot token (e.g., `123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11`)

2. **Configure environment**:
   ```bash
   # Add to .env
   TELEGRAM_BOT_TOKEN=your_bot_token_here
   API_BASE_URL=http://localhost:3000
   TELEGRAM_POLLING_INTERVAL=5000
   TELEGRAM_MAX_POLL_ATTEMPTS=30
   ```

3. **Start bot**:
   ```bash
   bun run dev:telegram
   ```

### Bot Commands

- `/start` - Initialize bot and show welcome message
- `/signal PAIR HOLDING RISK` - Generate trading signal
  - Example: `/signal BTCUSDT scalp growth`
  - Holding: `scalp`, `daily`, `swing`, `auto`
  - Risk: `safe`, `growth`, `aggressive`
- `/status <jobId>` - Check signal status
- `/help` - Show help and documentation

### Interactive Features

- **Upload Chart**: Send a chart image for AI vision analysis
- **Inline Keyboards**: Select trading parameters interactively
- **Real-time Polling**: Bot waits for signal analysis and sends result
- **Session Persistence**: Remembers your last selections

### Example Usage

**Simple Command**:
```
User: /signal BTCUSDT scalp growth
Bot: 🔄 Analyzing BTCUSDT...
Bot: 📈 LONG SIGNAL
     Entry: $42,500.00
     Stop Loss: $42,000.00
     TP1: $42,750.00 (1.5R)
     TP2: $43,250.00 (2.5R)
     TP3: $44,500.00 (4R)
```

**With Chart Analysis**:
```
User: [sends chart image]
Bot: Chart uploaded! Select trading pair:
     [BTC/USDT] [ETH/USDT] [SOL/USDT]
User: [clicks BTC/USDT]
Bot: Select holding strategy:
     [Scalp] [Daily] [Swing]
User: [clicks Scalp]
Bot: Select risk profile:
     [Safe] [Growth] [Aggressive]
User: [clicks Growth]
Bot: 🔄 Analyzing chart for BTCUSDT...
Bot: 📈 LONG SIGNAL
     [full trade setup with vision analysis insights]
```

### Bot Architecture

The bot is a standalone client that:
- Runs in a separate process from the API
- Calls REST API endpoints to create and check signals
- Uses Grammy framework for Telegram integration
- Stores session data temporarily (in-memory or Redis)
- Polls API every 5 seconds until signal completes
- Has 2.5-minute timeout with job ID for manual checking

## API Documentation

### Health Check

```bash
GET /health

Response:
{
  "status": "ok"
}
```

### Create Signal Request

```bash
POST /signal
Content-Type: application/json

{
  "pair": "BTCUSDT",
  "holding": "scalp|daily|swing|auto",
  "risk": "safe|growth|aggressive",
  "image_base64": "optional"
}

Response (201):
{
  "jobId": "uuid"
}
```

### Get Signal Status

```bash
GET /signal/{jobId}

Response (200):
{
  "jobId": "uuid",
  "status": "pending|processing|completed|failed",
  "pair": "BTCUSDT",
  "holding": "scalp",
  "risk": "growth",
  "createdAt": "2025-01-01T12:00:00Z",
  "completedAt": "2025-01-01T12:00:15Z",
  "setup": {
    "side": "long|short|no_trade",
    "entry": 42500.00,
    "stopLoss": 42000.00,
    "takeProfits": [42750.00, 43250.00, 44000.00],
    "riskReward": 1.5,
    "confidence": 0.75
  },
  "interpretation": {
    "bias": "bullish|bearish|neutral",
    "structure": "trend|range|breakout|reversal",
    "key_levels": [42000, 43000],
    "liquidity": "above|below|both|none",
    "volatility": "low|normal|high",
    "confidence": 0.75,
    "reasoning": "..."
  }
}
```

## Trading Logic

### Risk Profiles

- **safe**: 2.5 ATR stop loss, requires 75% confidence
- **growth**: 1.8 ATR stop loss, requires 65% confidence
- **aggressive**: 1.2 ATR stop loss, requires 60% confidence

### Decision Rules

1. **No trade in low volatility** - Volatility regime must be normal or high
2. **Confidence threshold** - LLM confidence must exceed profile minimum
3. **Risk/Reward minimum** - Trade must have R:R ≥ 1.2
4. **Entry logic** - Determined by LLM bias and key levels
5. **Stop loss** - Based on ATR multiplier for risk profile
6. **Take profits** - 1.5R, 2.5R, 4R targets

### LLM Output (Structured)

```json
{
  "bias": "bullish|bearish|neutral",
  "structure": "trend|range|breakout|reversal",
  "key_levels": [42000, 43000, 44000],
  "liquidity": "above|below|both|none",
  "volatility": "low|normal|high",
  "confidence": 0.75,
  "reasoning": "Technical explanation"
}
```

## File Structure

```
src/
├── server.ts                    # Main Hono REST API
├── telegram-bot.ts              # Telegram bot entry point
├── config/
│   └── env.ts                   # Environment validation
├── db/
│   ├── postgres.ts              # PostgreSQL client
│   ├── redis.ts                 # Redis client
│   ├── schema.ts                # Drizzle ORM schema
│   └── migrate.ts               # Migration runner
├── modules/
│   ├── auth/
│   │   ├── auth.middleware.ts   # Auth & rate limiting
│   │   └── subscription.service.ts
│   ├── market/
│   │   ├── binance.client.ts    # Binance API wrapper
│   │   ├── ohlcv.service.ts     # OHLCV data fetching with cache
│   │   └── metrics.service.ts   # Market metrics (ATR, trend, etc)
│   ├── vision/
│   │   └── vision.service.ts    # OpenAI Vision API
│   ├── ai/
│   │   ├── llm.service.ts       # LLM provider adapter
│   │   └── prompts/
│   │       └── market-analysis.ts
│   ├── decision/
│   │   ├── models.ts            # Type definitions
│   │   ├── decision.engine.ts   # Deterministic trading logic
│   │   └── risk.manager.ts      # TP/SL calculation
│   ├── jobs/
│   │   ├── queue.ts             # Redis queue operations
│   │   ├── signal.processor.ts  # Main processing pipeline
│   │   └── worker.ts            # Worker process
│   ├── signal/
│   │   ├── signal.controller.ts # HTTP handlers
│   │   ├── signal.service.ts    # Business logic
│   │   └── signal.repository.ts # Database layer
│   └── telegram/                # Telegram bot client
│       ├── bot.ts               # Main bot initialization
│       ├── api-client.ts        # API client wrapper
│       ├── types.ts             # Type definitions
│       ├── keyboards.ts         # Inline keyboards
│       ├── formatters/
│       │   └── signal.ts        # Message formatting
│       ├── commands/
│       │   ├── start.ts         # /start command
│       │   ├── signal.ts        # /signal command
│       │   ├── status.ts        # /status command
│       │   └── help.ts          # /help command
│       └── handlers/
│           ├── photo.ts         # Photo upload handler
│           └── callback.ts      # Callback query handler
└── utils/
    ├── logger.ts                # Pino logger
    ├── math.ts                  # Trading math functions
    └── timeframes.ts            # Timeframe utilities
```

## Data Flow Example

```
1. Client POST /signal
   {
     "pair": "BTCUSDT",
     "holding": "scalp",
     "risk": "growth",
     "image_base64": "..." (optional)
   }

2. API creates job, enqueues it → returns jobId

3. Worker picks up job:
   - Fetches 4H and 15m candles from Binance
   - Calculates ATR (3.2%), trend (uptrend), volatility (normal)
   - Analyzes chart image if provided (support/resistance levels)
   - Calls LLM with metrics + candles + vision data
   - LLM returns: { bias: "bullish", confidence: 0.78, ... }
   - Decision engine builds setup:
     * Entry: 42,500 (support level)
     * Stop Loss: 42,100 (1.8 ATR * bullish confidence)
     * TP1: 42,800 (1.5R)
     * TP2: 43,500 (2.5R)
     * TP3: 44,500 (4R)
   - Validates setup (R:R = 1.5 ✓)
   - Saves to database

4. Client polls GET /signal/{jobId}
   - Initially returns: { status: "processing" }
   - After job completes: { status: "completed", setup: {...} }
```

## Testing the API

```bash
# Create signal request
curl -X POST http://localhost:3000/signal \
  -H "Content-Type: application/json" \
  -d '{
    "pair": "BTCUSDT",
    "holding": "scalp",
    "risk": "growth"
  }'

# Response:
# {"jobId": "550e8400-e29b-41d4-a716-446655440000"}

# Check status (poll until completed)
curl http://localhost:3000/signal/550e8400-e29b-41d4-a716-446655440000

# With authorization header
curl -H "x-user-id: user123" http://localhost:3000/signal
```

## Performance Notes

- **Caching**: Market data cached in Redis for 5 minutes
- **Rate limiting**: 100 requests per minute per user
- **Timeouts**:
  - Vision API: 30s
  - LLM API: 45s
  - Binance API: 30s
- **Retries**: Exponential backoff (max 3 retries)
- **Worker concurrency**: 5 jobs (configurable)

## Production Deployment

### Using Docker

```bash
docker build -t trading-engine .
docker run -p 3000:3000 \
  -e DATABASE_URL=postgresql://... \
  -e REDIS_URL=redis://... \
  -e OPENAI_API_KEY=sk-... \
  trading-engine
```

### Using PM2

```bash
pm2 start dist/server.js --name trading-api
pm2 start dist/modules/jobs/worker.js --name trading-worker
```

## Security

- ✓ Subscription validation middleware (currently bypassed)
- ✓ Rate limiting per user
- ✓ Input validation with Zod
- ✓ SQL injection prevention (Drizzle ORM)
- ✓ XSS protection (JSON responses)
- ✓ Environment variable validation

TODO:
- [ ] JWT authentication
- [ ] API key management
- [ ] HTTPS enforcement
- [ ] CORS whitelist

## Monitoring

Logs are structured with Pino:
- Development: Pretty-printed with timestamps
- Production: JSON format for log aggregation

```bash
# View logs
pm2 logs trading-api
pm2 logs trading-worker
```

## Development

### Database Introspection

```bash
bun run db:studio  # Visual schema editor
```

### Add New Feature

1. Create module in `src/modules/`
2. Add tests
3. Update routes in `server.ts`
4. Update README

## Troubleshooting

**Worker not processing jobs**
```bash
# Check Redis connection
redis-cli ping

# Check queue
redis-cli lrange signal-processing 0 -1
```

**Database errors**
```bash
# Check PostgreSQL
psql -U user -d trading_engine -c "\dt"

# Run migrations
bun run db:migrate
```

**LLM API fails**
- Verify API keys in .env
- Check API rate limits
- Review API documentation for model names

## License

MIT
