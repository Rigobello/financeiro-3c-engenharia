import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'

function parsearTextoNF(texto: string) {
  const linhas = texto.split('\n').map((l) => l.trim()).filter(Boolean)

  // Extrair data
  const dataMatch = texto.match(/(\d{2}\/\d{2}\/\d{4}|\d{2}\/\d{2}\/\d{2})/)?.[0]

  // Extrair CNPJ
  const cnpjMatch = texto.match(/\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}/)?.[0]

  // Extrair CPF
  const cpfMatch = texto.match(/\d{3}\.\d{3}\.\d{3}-\d{2}/)?.[0]

  // Extrair valores monetários (R$ X.XXX,XX ou XXXX,XX)
  const valoresRaw = texto.match(/R\$?\s*[\d.,]+|\d+[.,]\d{2}/g) || []
  const valores = valoresRaw
    .map((v) => parseFloat(v.replace(/R\$\s*/g, '').replace(/\./g, '').replace(',', '.')))
    .filter((v) => !isNaN(v) && v > 0)

  // Tentar encontrar total
  const totalMatch = texto.match(/(?:TOTAL|VALOR TOTAL|SUBTOTAL|VALOR A PAGAR)[^\d]*([\d.,]+)/i)
  const total = totalMatch
    ? parseFloat(totalMatch[1].replace(/\./g, '').replace(',', '.'))
    : valores.length > 0
    ? Math.max(...valores)
    : 0

  // Extrair itens (linhas com valor)
  const padraoItem = /^(.+?)\s+(?:R\$\s*)?([\d]+[.,][\d]{2})\s*$/
  const itens: { descricao: string; valor: number }[] = []

  for (const linha of linhas) {
    const m = linha.match(padraoItem)
    if (m) {
      const valor = parseFloat(m[2].replace(',', '.'))
      if (valor > 0 && valor < total * 2) {
        itens.push({ descricao: m[1].trim(), valor })
      }
    }
  }

  // Nome do estabelecimento (geralmente 1ª ou 2ª linha)
  const nomeEstabelecimento = linhas[0] || ''

  return {
    data: dataMatch || null,
    cnpj: cnpjMatch || null,
    cpf: cpfMatch || null,
    nomeEstabelecimento,
    itens: itens.slice(0, 20),
    total,
    textoCompleto: texto,
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

    const body = await req.json()
    const { imageBase64, obraId } = body

    if (!imageBase64) {
      return NextResponse.json({ error: 'Imagem é obrigatória' }, { status: 400 })
    }

    // Criar registro no banco (estado processando)
    const foto = await prisma.fotoRecibo.create({
      data: {
        userId: session.userId,
        obraId: obraId || null,
        imagemBase64: imageBase64.substring(0, 100), // Salvar apenas preview
        status: 'processando',
      },
    })

    // Chamar OCR.space API
    const apiKey = process.env.OCR_API_KEY || 'K88388948888957'

    const formData = new URLSearchParams()
    formData.append('base64Image', `data:image/jpeg;base64,${imageBase64}`)
    formData.append('language', 'por')
    formData.append('isOverlayRequired', 'false')
    formData.append('detectOrientation', 'true')
    formData.append('scale', 'true')
    formData.append('isTable', 'true')

    let textoOCR = ''
    let dadosEstruturados = null

    try {
      const ocrRes = await fetch('https://api.ocr.space/parse/image', {
        method: 'POST',
        headers: { apikey: apiKey },
        body: formData,
      })

      const ocrData = await ocrRes.json()

      if (ocrData.ParsedResults && ocrData.ParsedResults[0]) {
        textoOCR = ocrData.ParsedResults[0].ParsedText || ''
        dadosEstruturados = parsearTextoNF(textoOCR)
      }
    } catch (ocrError) {
      console.error('Erro OCR:', ocrError)
      textoOCR = 'Erro ao processar OCR'
    }

    // Atualizar registro
    await prisma.fotoRecibo.update({
      where: { id: foto.id },
      data: {
        textoOCR,
        dadosEstruturados: dadosEstruturados ? JSON.stringify(dadosEstruturados) : null,
        status: textoOCR ? 'processado' : 'erro',
      },
    })

    return NextResponse.json({
      id: foto.id,
      status: textoOCR ? 'processado' : 'erro',
      dados: dadosEstruturados,
      textoOCR,
    })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Erro ao processar foto' }, { status: 500 })
  }
}

export async function GET(req: NextRequest) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

    const fotos = await prisma.fotoRecibo.findMany({
      where: { userId: session.userId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        obraId: true,
        status: true,
        createdAt: true,
        dadosEstruturados: true,
        obra: { select: { nome: true } },
      },
    })

    return NextResponse.json(
      fotos.map((f) => ({
        ...f,
        dados: f.dadosEstruturados ? JSON.parse(f.dadosEstruturados) : null,
      }))
    )
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Erro ao buscar fotos' }, { status: 500 })
  }
}
