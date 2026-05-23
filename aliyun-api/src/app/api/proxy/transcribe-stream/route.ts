import { NextRequest } from 'next/server'

// Direct HTTP API implementation for streaming response
export async function POST(request: NextRequest) {
  try {
    // Handle CORS preflight request
    if (request.method === 'OPTIONS') {
      return new Response(null, {
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
      return new Response(
        JSON.stringify({ success: false, error: 'Missing or invalid Authorization header' }),
        { 
          status: 401,
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Content-Type': 'application/json',
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

    const contentType = request.headers.get('content-type')
    
    if (contentType && contentType.includes('multipart/form-data')) {
      const formData = await request.formData()
      audioFile = formData.get('audio') as File | null
      audioUrl = formData.get('audioUrl') as string || ''
      context = formData.get('context') as string || ''
      enableItn = formData.get('enableItn') === 'true'
      language = formData.get('language') as string || ''
    } else {
      // Handle JSON request
      const body = await request.json()
      audioUrl = body.audioUrl || ''
      context = body.context || ''
      enableItn = body.enableItn || false
      language = body.language || ''
    }

    if (!audioFile && !audioUrl) {
      return new Response(
        JSON.stringify({ success: false, error: 'Audio file or URL is required' }),
        { 
          status: 400,
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Content-Type': 'application/json',
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

    // Create a readable stream for SSE
    const stream = new ReadableStream({
      async start(controller) {
        try {
          // Make the API call to DashScope HTTP API with SSE enabled
          const response = await fetch('https://dashscope.aliyuncs.com/api/v1/services/aigc/multimodal-generation/generation', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${apiKey}`,
              'Content-Type': 'application/json',
              'X-DashScope-SSE': 'enable',
              'Accept': 'text/event-stream',
            },
            body: JSON.stringify(requestBody)
          })

          if (!response.ok) {
            const errorText = await response.text()
            console.error('DashScope API error response:', errorText)
            
            const errorData = {
              success: false,
              error: `API Error (${response.status}): ${errorText}`,
              details: errorText
            }
            
            controller.enqueue(`data: ${JSON.stringify(errorData)}\n\n`)
            controller.close()
            return
          }

          if (!response.body) {
            throw new Error('No response body from API')
          }

          // Read the stream line by line
          const reader = response.body.getReader()
          const decoder = new TextDecoder()
          let buffer = ''

          while (true) {
            const { done, value } = await reader.read()
            
            if (done) {
              // Send end signal
              controller.enqueue(`data: ${JSON.stringify({ success: true, done: true })}\n\n`)
              break
            }

            buffer += decoder.decode(value, { stream: true })
            const lines = buffer.split('\n')
            buffer = lines.pop() || '' // Keep the incomplete line in buffer

            for (const line of lines) {
              if (line.startsWith('data: ')) {
                try {
                  const data = line.slice(6) // Remove 'data: ' prefix
                  if (data.trim()) {
                    const parsed = JSON.parse(data)
                    
                    // Extract text from the streaming response
                    if (parsed.output && parsed.output.choices && parsed.output.choices.length > 0) {
                      const choice = parsed.output.choices[0]
                      const content = choice.message.content

                      if (Array.isArray(content)) {
                        const textContent = content.find(item => item.text)
                        if (textContent && textContent.text) {
                          const streamData = {
                            success: true,
                            text: textContent.text,
                            done: false,
                            usage: parsed.usage
                          }
                          controller.enqueue(`data: ${JSON.stringify(streamData)}\n\n`)
                        }
                      }
                    }
                  }
                } catch (parseError) {
                  console.error('Error parsing SSE data:', parseError)
                }
              }
            }
          }
        } catch (error) {
          console.error('Streaming error:', error)
          const errorMessage = error instanceof Error ? error.message : 'Streaming failed'
          const errorData = {
            success: false,
            error: errorMessage,
            details: error instanceof Error ? error.message : String(error)
          }
          controller.enqueue(`data: ${JSON.stringify(errorData)}\n\n`)
          controller.close()
        }
      }
    })

    // Return the SSE stream
    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    })

  } catch (error) {
    console.error('Proxy streaming transcription error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Streaming transcription failed'
    
    return new Response(
      JSON.stringify({ 
        success: false,
        error: errorMessage,
        details: error instanceof Error ? error.message : String(error)
      }),
      { 
        status: 500,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Content-Type': 'application/json',
        }
      }
    )
  }
}
