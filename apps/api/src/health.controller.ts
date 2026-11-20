import { Controller, Get } from '@nestjs/common'
import { InjectConnection } from '@nestjs/mongoose'
import { Connection } from 'mongoose'

@Controller()
export class HealthController {
  constructor(@InjectConnection() private readonly connection: Connection) {}

  @Get('health')
  health() {
    return {
      status: this.connection.readyState === 1 ? 'ok' : 'degraded',
      service: 'ai-resume-analyzer-api',
      database: this.connection.readyState === 1 ? 'connected' : 'disconnected',
    }
  }
}
