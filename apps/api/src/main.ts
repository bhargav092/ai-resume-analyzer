import 'reflect-metadata'
import 'dotenv/config'
import { NestFactory } from '@nestjs/core'
import { AppModule } from './app.module'
import helmet from 'helmet'

async function bootstrap() {
  const app = await NestFactory.create(AppModule)
  app.use(helmet())
  const allowedOrigins = (process.env.WEB_ORIGIN || 'http://localhost:5173')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean)
  app.enableCors({ origin: allowedOrigins, allowedHeaders: ['Content-Type', 'Authorization'] })
  const port = Number(process.env.PORT || 3001)
  await app.listen(port)
  console.log(`AI Resume Analyzer API listening on http://localhost:${port}`)
}

bootstrap()
