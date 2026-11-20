import { BadRequestException, Injectable } from '@nestjs/common'
import * as mammoth from 'mammoth'
import pdfParse from 'pdf-parse'

@Injectable()
export class DocumentParserService {
  async extract(file: Express.Multer.File): Promise<string> {
    try {
      let text = ''
      if (file.mimetype === 'application/pdf') {
        const parsed = await pdfParse(file.buffer)
        text = parsed.text
      } else if (file.mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
        const parsed = await mammoth.extractRawText({ buffer: file.buffer })
        text = parsed.value
      } else {
        throw new BadRequestException('Only PDF and DOCX files are supported.')
      }

      text = text.replace(/\r\n/g, '\n').replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim()
      if (!text) {
        throw new BadRequestException('No readable text was found. The document may be scanned or password-protected.')
      }
      return text.slice(0, 50_000)
    } catch (error) {
      if (error instanceof BadRequestException) throw error
      throw new BadRequestException('The document could not be parsed. It may be corrupted or password-protected.')
    }
  }
}
