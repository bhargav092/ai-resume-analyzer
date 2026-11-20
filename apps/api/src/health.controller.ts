import { Controller, Get, ServiceUnavailableException } from '@nestjs/common'
import { InjectConnection } from '@nestjs/mongoose'
import { Connection } from 'mongoose'

@Controller()
export class HealthController {
  constructor(@InjectConnection() private readonly connection: Connection) {}

  @Get('health')
  health() {
    const connected = this.connection.readyState === 1
    if (!connected) throw new ServiceUnavailableException('MongoDB is disconnected.')
    return {
      status: 'ok',
      service: 'ai-resume-analyzer-api',
      database: 'connected',
    }
  }
}
