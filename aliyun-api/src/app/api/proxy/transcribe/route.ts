import { NextRequest, NextResponse } from 'next/server'

// Direct HTTP API implementation to avoid SDK issues
export async function POST(request: NextRequest) {
  try {
    // Handle CORS preflight request
    if (request.method === 'OPTIONS') {
      return new NextResponse(null, {
        status: 200,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        },
      })
    }

    // Get Authorization header
    const authHeader = request.headers.get('Authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { success: false, error: 'Missing or invalid Authorization header' },
        { 
          status: 401,
          headers: {
            'Access-Control-Allow-Origin': '*',
          }
        }
      )
    }

    const apiKey = authHeader.substring(7) // Remove 'Bearer ' prefix

    // Parse form data or JSON
    let audioFile: File | null = null
    let audioUrl = ''
    let context = ''
    let enableItn = false
    let language = ''
    let stream = false

    const contentType = request.headers.get('content-type')
    
    if (contentType && contentType.includes('multipart/form-data')) {
      const formData = await request.formData()
      audioFile = formData.get('audio') as File | null
      audioUrl = formData.get('audioUrl') as string || ''
      context = formData.get('context') as string || ''
      enableItn = formData.get('enableItn') === 'true'
      language = formData.get('language') as string || ''
      stream = formData.get('stream') === 'true'
    } else {
      // Handle JSON request
      const body = await request.json()
      audioUrl = body.audioUrl || ''
      context = body.context || ''
      enableItn = body.enableItn || false
      language = body.language || ''
      stream = body.stream || false
    }

    if (!audioFile && !audioUrl) {
      return NextResponse.json(
        { success: false, error: 'Audio file or URL is required' },
        { 
          status: 400,
          headers: {
            'Access-Control-Allow-Origin': '*',
          }
        }
      )
    }

    let audioInput: string

    if (audioFile) {
      // For local files, convert to base64
      const buffer = Buffer.from(await audioFile.arrayBuffer())
      const base64 = buffer.toString('base64')
      const mimeType = audioFile.type || 'audio/wav'
      
      // Create a data URL
      audioInput = `data:${mimeType};base64,${base64}`
      
    } else {
      // Use URL directly for remote files
      audioInput = audioUrl
    }

    // Prepare the request body for DashScope HTTP API
    const requestBody = {
      model: 'qwen3-asr-flash',
      input: {
        messages: [
          {
            role: 'system',
            content: [
              { text: context || '' }
            ]
          },
          {
            role: 'user',
            content: [
              { audio: audioInput }
            ]
          }
        ]
      },
      parameters: {
        result_format: 'message',
        asr_options: {
          enable_lid: true,
          enable_itn: enableItn,
          ...(language && { language: language })
        }
      }
    }

    // Make the API call to DashScope HTTP API
    const response = await fetch('https://dashscope.aliyuncs.com/api/v1/services/aigc/multimodal-generation/generation', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'X-DashScope-SSE': stream ? 'enable' : 'disable'
      },
      body: JSON.stringify(requestBody)
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('DashScope API error response:', errorText)
      
      try {
        const errorJson = JSON.parse(errorText)
        return NextResponse.json(
          { 
            success: false, 
            error: `API Error: ${errorJson.message || errorJson.error || 'Unknown error'}`,
            details: errorText
          },
          { 
            status: response.status,
            headers: {
              'Access-Control-Allow-Origin': '*',
            }
          }
        )
      } catch {
        return NextResponse.json(
          { 
            success: false, 
            error: `API Error (${response.status}): ${errorText}`,
            details: errorText
          },
          { 
            status: response.status,
            headers: {
              'Access-Control-Allow-Origin': '*',
            }
          }
        )
      }
    }

    const responseText = await response.text()

    let data
    try {
      data = JSON.parse(responseText)
    } catch (parseError) {
      console.error('Failed to parse API response as JSON:', parseError)
      return NextResponse.json(
        { 
          success: false, 
          error: 'Invalid JSON response from API',
          details: responseText
        },
        { 
          status: 500,
          headers: {
            'Access-Control-Allow-Origin': '*',
          }
        }
      )
    }

    // Extract the transcription result
    if (data.output && data.output.choices && data.output.choices.length > 0) {
      const choice = data.output.choices[0]
      const content = choice.message.content

      // Find the text content in the response
      let text = ''
      let language = undefined
      let confidence = undefined

      if (Array.isArray(content)) {
        const textContent = content.find(item => item.text)
        if (textContent) {
          text = textContent.text
        }
      }

      // Check if there's additional ASR information in the response
      if (choice.message && choice.message.asr_result) {
        const asrResult = choice.message.asr_result
        language = asrResult.language
        confidence = asrResult.confidence
      }

      return NextResponse.json({
        success: true,
        data: {
          text: text || '无法识别音频内容',
          language,
          confidence,
          usage: data.usage
        }
      }, {
        headers: {
          'Access-Control-Allow-Origin': '*',
        }
      })
    } else {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Invalid API response structure: missing choices',
          details: JSON.stringify(data, null, 2)
        },
        { 
          status: 500,
          headers: {
            'Access-Control-Allow-Origin': '*',
          }
        }
      )
    }

  } catch (error) {
    console.error('Proxy transcription error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Transcription failed'
    
    return NextResponse.json(
      { 
        success: false,
        error: errorMessage,
        details: error instanceof Error ? error.message : String(error)
      },
      { 
        status: 500,
        headers: {
          'Access-Control-Allow-Origin': '*',
        }
      }
    )
  }
}
