import { BadRequestException, Injectable, Logger } from '@nestjs/common'
import * as mammoth from 'mammoth'
import pdfParse from 'pdf-parse'
import { createCanvas } from '@napi-rs/canvas'
import { createWorker } from 'tesseract.js'

@Injectable()
export class DocumentParserService {
  private readonly logger = new Logger(DocumentParserService.name)

  async extract(file: Express.Multer.File): Promise<string> {
    try {
      let text = ''
      if (file.mimetype === 'application/pdf') {
        const parsed = await pdfParse(file.buffer)
        text = parsed.text
        if (text.trim().length < 80) text = await this.ocrPdf(file.buffer)
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
      this.logger.error('Document parsing or OCR failed.', error instanceof Error ? error.stack : String(error))
      throw new BadRequestException('The document could not be parsed. It may be corrupted or password-protected.')
    }
  }

  private async ocrPdf(buffer: Buffer): Promise<string> {
    const { getDocument } = await import('pdfjs-dist/legacy/build/pdf.mjs')
    const loadingTask = getDocument({ data: new Uint8Array(buffer), useSystemFonts: true })
    const pdf = await loadingTask.promise
    const worker = await createWorker(process.env.OCR_LANGUAGE || 'eng')
    const pages = Math.min(pdf.numPages, 5)
    const pageTexts: string[] = []

    try {
      for (let pageNumber = 1; pageNumber <= pages; pageNumber += 1) {
        const page = await pdf.getPage(pageNumber)
        const viewport = page.getViewport({ scale: 1.8 })
        const canvas = createCanvas(Math.ceil(viewport.width), Math.ceil(viewport.height))
        const context = canvas.getContext('2d')
        await page.render({
          canvas: canvas as unknown as HTMLCanvasElement,
          canvasContext: context as unknown as CanvasRenderingContext2D,
          viewport,
        }).promise
        const { data } = await worker.recognize(await canvas.encode('png'))
        if (data.text.trim()) pageTexts.push(data.text.trim())
      }
    } finally {
      await worker.terminate()
      await loadingTask.destroy()
    }

    return pageTexts.join('\n\n')
  }
}
