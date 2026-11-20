import { Module } from '@nestjs/common'
import { ConfiguredAiProvider } from './configured-ai.provider'
import { MockAiProvider } from './mock-ai.provider'

@Module({
  providers: [
    ConfiguredAiProvider,
    MockAiProvider,
    { provide: 'AI_PROVIDER', useExisting: ConfiguredAiProvider },
  ],
  exports: ['AI_PROVIDER', MockAiProvider],
})
export class AiModule {}
