import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // 简单的GET请求测试
    const response = await fetch('https://qwen-qwen3-asr-demo.ms.show/', {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; ASR-Proxy/1.0)'
      }
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const html = await response.text();
    
    return NextResponse.json({
      success: true,
      message: 'Gradio connection test successful',
      status: response.status,
      contentLength: html.length
    });
    
  } catch (error) {
    console.error('Gradio connection test failed:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    return NextResponse.json(
      { 
        error: 'Gradio connection test failed',
        details: errorMessage
      },
      { status: 500 }
    );
  }
}
