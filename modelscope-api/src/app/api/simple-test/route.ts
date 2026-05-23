import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);
    
    // 测试基本的HTTP连接
    const response = await fetch('https://qwen-qwen3-asr-demo.ms.show/', {
      method: 'GET',
      signal: controller.signal
    });
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const text = await response.text();
    
    // 检查是否包含Gradio相关内容
    const hasGradio = text.includes('gradio') || text.includes('Gradio');
    
    return NextResponse.json({
      success: true,
      message: 'Connection test successful',
      status: response.status,
      contentLength: text.length,
      hasGradioContent: hasGradio
    });
    
  } catch (error) {
    console.error('Connection test failed:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    return NextResponse.json(
      { 
        error: 'Connection test failed',
        details: errorMessage
      },
      { status: 500 }
    );
  }
}
