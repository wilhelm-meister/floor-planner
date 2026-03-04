import { NextRequest, NextResponse } from 'next/server'

const GEMINI_API_KEY = process.env.GEMINI_API_KEY
const MODEL = 'gemini-3.1-flash-image-preview'
const ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`

export async function POST(req: NextRequest) {
  if (!GEMINI_API_KEY) {
    return NextResponse.json({ error: 'GEMINI_API_KEY not configured' }, { status: 500 })
  }

  try {
    const { image, stylePrompt, styleName, userPrompt, isRefinement } = await req.json()

    if (!image || !stylePrompt) {
      return NextResponse.json({ error: 'Missing image or style' }, { status: 400 })
    }

    const prompt = isRefinement
      ? `You are editing an architectural rendering. The user wants these changes applied to the attached image:

"${userPrompt}"

RULES:
- Keep the EXACT same building shape, proportions, camera angle, and perspective
- Keep ALL windows, doors, and structural elements in their exact positions
- ONLY change what the user specifically asked for
- Everything else stays exactly the same
- The result must look like a professional real estate photograph

Apply the requested changes now.`
      : `Edit this image. Apply photorealistic textures to this 3D building model. The building architecture must remain exactly identical — same shape, same roof, same walls, same windows, same doors. Only replace surface materials.

Materials: ${stylePrompt}
${userPrompt ? userPrompt : ''}

Add garden and sky. Professional real estate photo style.`

    const response = await fetch(`${ENDPOINT}?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [
            { text: prompt },
            {
              inlineData: {
                mimeType: 'image/jpeg',
                data: image,
              },
            },
          ],
        }],
        generationConfig: {
          responseModalities: ['IMAGE', 'TEXT'],
          temperature: 1,
          maxOutputTokens: 8192,
        },
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Gemini API error:', errorText)
      return NextResponse.json(
        { error: `Gemini API error: ${response.status}` },
        { status: 502 }
      )
    }

    const data = await response.json()

    // Extract the generated image from response
    const candidates = data.candidates ?? []
    for (const candidate of candidates) {
      const parts = candidate.content?.parts ?? []
      for (const part of parts) {
        if (part.inlineData?.mimeType?.startsWith('image/')) {
          return NextResponse.json({ image: part.inlineData.data })
        }
      }
    }

    // No image in response — return text if available
    const textParts = candidates
      .flatMap((c: any) => c.content?.parts ?? [])
      .filter((p: any) => p.text)
      .map((p: any) => p.text)
      .join('\n')

    return NextResponse.json(
      { error: textParts || 'No image generated' },
      { status: 422 }
    )
  } catch (err) {
    console.error('AI Render error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal error' },
      { status: 500 }
    )
  }
}
