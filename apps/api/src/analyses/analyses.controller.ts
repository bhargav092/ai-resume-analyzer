import { Body, Controller, Post, UploadedFile, UseInterceptors } from '@nestjs/common'
import { FileInterceptor } from '@nestjs/platform-express'
import { AnalysisService } from './analysis.service'

@Controller('analyses')
export class AnalysesController {
  constructor(private readonly service: AnalysisService) {}

  @Post()
  @UseInterceptors(FileInterceptor('resume'))
  analyze(@UploadedFile() resume: Express.Multer.File, @Body('jobDescription') jobDescription: string) {
    return this.service.analyze(resume, jobDescription)
  }
}
