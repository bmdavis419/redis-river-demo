# river demo

a demo showing off a durable redis stream using [river](https://github.com/bmdavis419/river-mono).

## running locally

0. clone the repo

1. install dependencies

```bash
bun install
```

2. add env vars (you will need a redis db and an openrouter api key)

```.env.local
# railway & upstash are great options
REDIS_URL=redis://localhost:6379

# google open router u will find it
OPENROUTER_API_KEY=your-openrouter-api-key
```

3. run the development server

```bash
bun run dev
```
