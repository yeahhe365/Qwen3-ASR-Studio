'use client'

import { useState, useEffect, useRef } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Square, Play, Text, AlertCircle } from 'lucide-react'

interface StreamingTranscriptionProps {
  apiKey: string
  audioFile: File | null
  audioUrl: string
  context: string
  enableItn: boolean
  language: string
  onResult: (result: string) => void
  onComplete: (finalResult: string, language?: string, confidence?: number) => void
  onError: (error: string) => void
}

export default function StreamingTranscription({
  apiKey,
  audioFile,
  audioUrl,
  context,
  enableItn,
  language,
  onResult,
  onComplete,
  onError
}: StreamingTranscriptionProps) {
  const [isStreaming, setIsStreaming] = useState(false)
  const [currentText, setCurrentText] = useState('')
  const [status, setStatus] = useState('准备就绪')
  const eventSourceRef = useRef<EventSource | null>(null)
  const finalTextRef = useRef('')

  const startStreaming = async () => {
    if (!apiKey.trim()) {
      onError('请输入 API Key')
      return
    }

    if (!audioFile && !audioUrl.trim()) {
      onError('请选择音频文件或输入音频 URL')
      return
    }

    setIsStreaming(true)
    setCurrentText('')
    finalTextRef.current = ''
    setStatus('正在连接...')

    try {
      // Prepare the request data
      const requestData: any = {
        context,
        enableItn,
        language,
        stream: true
      }

      if (audioFile) {
        // For file upload, we need to use FormData
        const formData = new FormData()
        formData.append('audio', audioFile)
        formData.append('context', context)
        formData.append('enableItn', enableItn.toString())
        if (language) formData.append('language', language)
        formData.append('stream', 'true')

        const response = await fetch('/api/proxy/transcribe-stream', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey.trim()}`
          },
          body: formData
        })

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`)
        }

        if (!response.body) {
          throw new Error('No response body')
        }

        setStatus('正在转录...')
        await handleStreamResponse(response)

      } else {
        // For URL, use JSON
        requestData.audioUrl = audioUrl.trim()

        const response = await fetch('/api/proxy/transcribe-stream', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey.trim()}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(requestData)
        })

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`)
        }

        if (!response.body) {
          throw new Error('No response body')
        }

        setStatus('正在转录...')
        await handleStreamResponse(response)
      }

    } catch (error) {
      console.error('Streaming error:', error)
      onError(error instanceof Error ? error.message : '流式转录失败')
      setIsStreaming(false)
      setStatus('错误')
    }
  }

  const handleStreamResponse = async (response: Response) => {
    const reader = response.body?.getReader()
    const decoder = new TextDecoder()
    let buffer = ''

    if (!reader) {
      throw new Error('No stream reader available')
    }

    try {
      while (true) {
        const { done, value } = await reader.read()
        
        if (done) {
          setStatus('转录完成')
          setIsStreaming(false)
          onComplete(finalTextRef.current)
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
                
                if (parsed.success) {
                  if (parsed.done) {
                    // Stream completed
                    setIsStreaming(false)
                    setStatus('转录完成')
                    onComplete(finalTextRef.current)
                  } else if (parsed.text) {
                    // New text chunk received
                    finalTextRef.current = parsed.text
                    setCurrentText(parsed.text)
                    onResult(parsed.text)
                  }
                } else {
                  // Error occurred
                  throw new Error(parsed.error || 'Stream error')
                }
              }
            } catch (parseError) {
              console.error('Error parsing SSE data:', parseError)
              // Don't throw on parse errors, continue processing
            }
          }
        }
      }
    } catch (error) {
      console.error('Stream processing error:', error)
      onError(error instanceof Error ? error.message : '流式处理失败')
      setIsStreaming(false)
      setStatus('错误')
    }
  }

  const stopStreaming = () => {
    setIsStreaming(false)
    setStatus('已停止')
    if (eventSourceRef.current) {
      eventSourceRef.current.close()
      eventSourceRef.current = null
    }
  }

  useEffect(() => {
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close()
      }
    }
  }, [])

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Text className="w-5 h-5" />
          流式转录
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Status */}
          <div className="flex items-center gap-2">
            <Badge variant={isStreaming ? "default" : "secondary"}>
              {status}
            </Badge>
            {isStreaming && (
              <Badge variant="outline" className="animate-pulse">
                实时转录中
              </Badge>
            )}
          </div>

          {/* Controls */}
          <div className="flex gap-2">
            {!isStreaming ? (
              <Button onClick={startStreaming} className="flex items-center gap-2">
                <Play className="w-4 h-4" />
                开始流式转录
              </Button>
            ) : (
              <Button onClick={stopStreaming} variant="destructive" className="flex items-center gap-2">
                <Square className="w-4 h-4" />
                停止转录
              </Button>
            )}
          </div>

          {/* Real-time transcription display */}
          {currentText && (
            <div>
              <label className="text-sm font-medium mb-2 block">实时转录结果</label>
              <div className="bg-gray-50 border rounded-lg p-4 min-h-[100px] max-h-[200px] overflow-y-auto">
                <p className="text-gray-900 whitespace-pre-wrap">{currentText}</p>
              </div>
            </div>
          )}

          {/* Streaming info */}
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <strong>流式转录说明：</strong>
              启用流式输出后，您可以看到实时转录结果，无需等待整个音频处理完成。
              系统会逐步生成中间结果，最终结果由中间结果拼接而成。
              {enableItn && ' ITN 功能在流式模式下同样有效。'}
            </AlertDescription>
          </Alert>
        </div>
      </CardContent>
    </Card>
  )
}
