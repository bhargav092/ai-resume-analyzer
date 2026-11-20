import { Body, Controller, Delete, Get, Param, Patch, Post, Put, Req, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common'
import { FileInterceptor } from '@nestjs/platform-express'
import { AnalysisService } from './analysis.service'
import { AuthenticatedRequest, JwtAuthGuard } from '../auth/jwt-auth.guard'
import { parseAnalysisTitleUpdate } from './analysis.dto'

@Controller('analyses')
@UseGuards(JwtAuthGuard)
export class AnalysesController {
  constructor(private readonly service: AnalysisService) {}

  @Post()
  @UseInterceptors(FileInterceptor('resume'))
  analyze(
    @UploadedFile() resume: Express.Multer.File,
    @Body('jobDescription') jobDescription: string,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.service.analyze(
      resume,
      jobDescription,
      request.user.sub,
      request.user.type === 'guest',
      request.user.expiresAt,
    )
  }

  @Get()
  list(@Req() request: AuthenticatedRequest) {
    return this.service.list(request.user.sub)
  }

  @Get(':id/export')
  export(@Param('id') id: string, @Req() request: AuthenticatedRequest) {
    return this.service.get(id, request.user.sub)
  }

  @Get(':id')
  get(@Param('id') id: string, @Req() request: AuthenticatedRequest) {
    return this.service.get(id, request.user.sub)
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Req() request: AuthenticatedRequest) {
    return this.service.remove(id, request.user.sub)
  }

  @Put(':id')
  @Patch(':id')
  update(@Param('id') id: string, @Body() body: unknown, @Req() request: AuthenticatedRequest) {
    return this.service.updateTitle(id, request.user.sub, parseAnalysisTitleUpdate(body))
  }
}
