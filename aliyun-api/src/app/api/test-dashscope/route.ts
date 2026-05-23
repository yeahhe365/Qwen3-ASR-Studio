import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { apiKey } = await request.json()

    if (!apiKey) {
      return NextResponse.json({ error: 'API Key is required' }, { status: 400 })
    }

    const response = await fetch('https://dashscope.aliyuncs.com/api/v1/services/aigc/text-generation/generation', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'X-DashScope-SSE': 'disable',
      },
      body: JSON.stringify({
        model: 'qwen-turbo',
        input: {
          messages: [
            { role: 'user', content: 'Hello, please respond with "API test successful"' },
          ],
        },
        parameters: {
          result_format: 'message',
        },
      }),
    })

    const responseBody = await response.json()

    if (!response.ok) {
      return NextResponse.json(
        {
          success: false,
          error: responseBody.message || responseBody.error || 'DashScope API connection test failed',
          response: responseBody,
        },
        { status: response.status }
      )
    }

    return NextResponse.json({
      success: true,
      response: responseBody,
      message: 'DashScope API connection test successful'
    })

  } catch (error) {
    console.error('DashScope test error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Test failed'
    
    return NextResponse.json(
      { 
        error: errorMessage,
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    )
  }
}
