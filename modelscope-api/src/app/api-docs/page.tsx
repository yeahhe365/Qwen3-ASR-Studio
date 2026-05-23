'use client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';

export default function APIDocsPage() {
  const { toast } = useToast();

  // 获取当前页面的完整URL
  const getProxyUrl = () => {
    if (typeof window !== 'undefined') {
      return `${window.location.origin}/api/asr-inference`;
    }
    return '/api/asr-inference';
  };

  // 复制代码到剪贴板
  const copyToClipboard = async (text: string, language: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({
        title: "复制成功",
        description: `${language} 代码已复制到剪贴板`,
      });
    } catch (err) {
      console.error('Failed to copy: ', err);
      toast({
        title: "复制失败",
        description: "请手动复制代码",
        variant: "destructive",
      });
    }
  };

  const javascriptExample = `// JavaScript 示例
async function callASRAPI(audioFile) {
  // 将音频文件转换为base64
  const base64 = await new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result.split(',')[1]);
    reader.readAsDataURL(audioFile);
  });

  const response = await fetch('${getProxyUrl()}', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      audio_file: {
        data: base64,
        name: audioFile.name,
        type: audioFile.type,
        size: audioFile.size
      },
      context: '上下文信息（可选）',
      language: 'auto', // 或 'zh', 'en', 'ja', 'ko'
      enable_itn: false // 是否启用逆文本标准化
    }),
  });

  const result = await response.json();
  if (result.success) {
    console.log('识别结果:', result.data[0]);
    console.log('语种检测:', result.data[1]);
    return result.data;
  } else {
    throw new Error(result.error);
  }
}

// 使用示例
const input = document.querySelector('input[type="file"]');
input.addEventListener('change', async (e) => {
  const file = e.target.files[0];
  try {
    const result = await callASRAPI(file);
    alert('识别完成: ' + result[0]);
  } catch (error) {
    alert('识别失败: ' + error.message);
  }
});`;

  const pythonExample = `# Python 示例
import requests
import base64

def call_asr_api(audio_file_path, context="", language="auto", enable_itn=False):
    """
    调用语音识别API
    
    Args:
        audio_file_path (str): 音频文件路径
        context (str): 上下文信息
        language (str): 语言设置 ('auto', 'zh', 'en', 'ja', 'ko')
        enable_itn (bool): 是否启用逆文本标准化
    
    Returns:
        tuple: (识别结果, 语种检测结果)
    """
    # 读取音频文件并转换为base64
    with open(audio_file_path, 'rb') as audio_file:
        audio_base64 = base64.b64encode(audio_file.read()).decode('utf-8')
    
    # 构建请求数据
    payload = {
        "audio_file": {
            "data": audio_base64,
            "name": audio_file_path.split('/')[-1],
            "type": "audio/wav",
            "size": len(audio_base64)
        },
        "context": context,
        "language": language,
        "enable_itn": enable_itn
    }
    
    # 发送请求
    response = requests.post('${getProxyUrl()}', json=payload)
    
    if response.status_code == 200:
        result = response.json()
        if result.get('success'):
            return result['data'][0], result['data'][1]
        else:
            raise Exception(result.get('error', 'Unknown error'))
    else:
        raise Exception(f'HTTP {response.status_code}: {response.text}')

# 使用示例
if __name__ == "__main__":
    try:
        recognition_result, language_result = call_asr_api(
            audio_file_path="test.wav",
            context="这是一个测试",
            language="auto",
            enable_itn=False
        )
        print(f"识别结果: {recognition_result}")
        print(f"语种检测: {language_result}")
    except Exception as e:
        print(f"错误: {e}")`;

  const curlExample = `# curl 示例
curl -X POST "${getProxyUrl()}" \\
  -H "Content-Type: application/json" \\
  -d '{
    "audio_file": {
      "data": "base64编码的音频数据",
      "name": "audio.wav",
      "type": "audio/wav",
      "size": 12345
    },
    "context": "上下文信息",
    "language": "auto",
    "enable_itn": false
  }'

# 响应示例
{
  "success": true,
  "data": [
    "这是识别出的文本内容",
    "检测到的语言：中文"
  ]
}`;

  const nodejsExample = `// Node.js 示例
const fs = require('fs');
const fetch = require('node-fetch');

async function callASRAPI(audioFilePath) {
  // 读取音频文件
  const audioBuffer = fs.readFileSync(audioFilePath);
  const base64 = audioBuffer.toString('base64');
  
  const response = await fetch('${getProxyUrl()}', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      audio_file: {
        data: base64,
        name: audioFilePath.split('/').pop(),
        type: 'audio/wav',
        size: audioBuffer.length
      },
      context: '',
      language: 'auto',
      enable_itn: false
    }),
  });

  const result = await response.json();
  
  if (result.success) {
    console.log('识别结果:', result.data[0]);
    console.log('语种检测:', result.data[1]);
    return result.data;
  } else {
    throw new Error(result.error);
  }
}

// 使用示例
(async () => {
  try {
    const [recognition, language] = await callASRAPI('./test.wav');
    console.log('识别完成:', recognition);
  } catch (error) {
    console.error('识别失败:', error.message);
  }
})();`;

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">API 文档</h1>
        <p className="text-muted-foreground">
          语音识别API的详细使用说明和代码示例
        </p>
      </div>

      {/* API 端点信息 */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            API 端点
            <Button
              variant="outline"
              size="sm"
              onClick={() => copyToClipboard(getProxyUrl(), 'URL')}
            >
              复制URL
            </Button>
          </CardTitle>
          <CardDescription>
            语音识别API的代理地址，解决跨域问题
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <Input
                value={getProxyUrl()}
                readOnly
                className="flex-1 font-mono"
              />
              <Button
                variant="outline"
                onClick={() => copyToClipboard(getProxyUrl(), 'URL')}
              >
                复制
              </Button>
            </div>
            <div className="text-sm text-muted-foreground">
              <p><strong>方法:</strong> POST</p>
              <p><strong>Content-Type:</strong> application/json</p>
              <p><strong>支持格式:</strong> WAV, MP3, M4A 等常见音频格式</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 请求参数 */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>请求参数</CardTitle>
          <CardDescription>
            API请求所需的参数说明
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <h4 className="font-medium">必需参数</h4>
                <div className="bg-muted p-3 rounded-md text-sm">
                  <p><strong>audio_file</strong></p>
                  <p className="text-muted-foreground">音频文件数据对象</p>
                  <ul className="mt-2 space-y-1 text-xs">
                    <li>• data: base64编码的音频数据</li>
                    <li>• name: 文件名</li>
                    <li>• type: MIME类型</li>
                    <li>• size: 文件大小</li>
                  </ul>
                </div>
              </div>
              
              <div className="space-y-2">
                <h4 className="font-medium">可选参数</h4>
                <div className="bg-muted p-3 rounded-md text-sm space-y-2">
                  <div>
                    <p><strong>context</strong></p>
                    <p className="text-muted-foreground text-xs">上下文信息，默认为空字符串</p>
                  </div>
                  <div>
                    <p><strong>language</strong></p>
                    <p className="text-muted-foreground text-xs">语言设置，可选值: auto, zh, en, ja, ko</p>
                  </div>
                  <div>
                    <p><strong>enable_itn</strong></p>
                    <p className="text-muted-foreground text-xs">是否启用逆文本标准化，默认false</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 响应格式 */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>响应格式</CardTitle>
          <CardDescription>
            API返回的数据结构
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="bg-muted p-4 rounded-md">
              <h4 className="font-medium mb-2">成功响应</h4>
              <pre className="text-xs overflow-x-auto">
{`{
  "success": true,
  "data": [
    "识别出的文本内容",
    "检测到的语言：中文"
  ]
}`}
              </pre>
            </div>
            
            <div className="bg-muted p-4 rounded-md">
              <h4 className="font-medium mb-2">错误响应</h4>
              <pre className="text-xs overflow-x-auto">
{`{
  "error": "Failed to process ASR inference",
  "details": "错误详细信息",
  "stack": "错误堆栈信息（开发环境）"
}`}
              </pre>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 代码示例 */}
      <Card>
        <CardHeader>
          <CardTitle>代码示例</CardTitle>
          <CardDescription>
            不同编程语言的调用示例
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="javascript" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="javascript">JavaScript</TabsTrigger>
              <TabsTrigger value="python">Python</TabsTrigger>
              <TabsTrigger value="nodejs">Node.js</TabsTrigger>
              <TabsTrigger value="curl">curl</TabsTrigger>
            </TabsList>
            
            <TabsContent value="javascript" className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-medium">JavaScript 示例</h4>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => copyToClipboard(javascriptExample, 'JavaScript')}
                >
                  复制代码
                </Button>
              </div>
              <pre className="bg-muted p-4 rounded-md text-xs overflow-x-auto">
                {javascriptExample}
              </pre>
            </TabsContent>
            
            <TabsContent value="python" className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-medium">Python 示例</h4>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => copyToClipboard(pythonExample, 'Python')}
                >
                  复制代码
                </Button>
              </div>
              <pre className="bg-muted p-4 rounded-md text-xs overflow-x-auto">
                {pythonExample}
              </pre>
            </TabsContent>
            
            <TabsContent value="nodejs" className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-medium">Node.js 示例</h4>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => copyToClipboard(nodejsExample, 'Node.js')}
                >
                  复制代码
                </Button>
              </div>
              <pre className="bg-muted p-4 rounded-md text-xs overflow-x-auto">
                {nodejsExample}
              </pre>
            </TabsContent>
            
            <TabsContent value="curl" className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-medium">curl 示例</h4>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => copyToClipboard(curlExample, 'curl')}
                >
                  复制代码
                </Button>
              </div>
              <pre className="bg-muted p-4 rounded-md text-xs overflow-x-auto">
                {curlExample}
              </pre>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
