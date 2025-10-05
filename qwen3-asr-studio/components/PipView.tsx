
import React, { useState, useRef, useCallback, useEffect } from 'react';
import { transcribeAudio } from '../services/gradioService';
import { Language, ApiProvider } from '../types';
import { MicrophoneIcon } from './icons/MicrophoneIcon';
import { CheckIcon } from './icons/CheckIcon';
import { CloseIcon } from './icons/CloseIcon';
import { LoaderIcon } from './icons/LoaderIcon';
import { StopIcon } from './icons/StopIcon';

interface PipViewProps {
  onTranscriptionResult: (result: {
    transcription: string;
    detectedLanguage: string;
    audioFile: File;
  }) => void;
  theme: 'light' | 'dark';
  context: string;
  language: Language;
  enableItn: boolean;
  selectedDeviceId: string;
  apiProvider: ApiProvider;
  modelScopeApiUrl: string;
  bailianApiKey: string;
}

export const PipView: React.FC<PipViewProps> = ({ 
  onTranscriptionResult, 
  theme, 
  context, 
  language, 
  enableItn, 
  selectedDeviceId, 
  apiProvider,
  modelScopeApiUrl,
  bailianApiKey 
}) => {
    type Status = 'idle' | 'recording' | 'processing' | 'success' | 'error';
    const [status, setStatus] = useState<Status>('idle');
    const [message, setMessage] = useState<string>('');
    const inputRef = useRef<HTMLInputElement>(null);

    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const audioChunksRef = useRef<Blob[]>([]);

    useEffect(() => {
        if (status === 'success' && inputRef.current) {
            inputRef.current.select();
        }
    }, [status]);

    const handleTranscription = useCallback(async (audioFile: File) => {
        setStatus('processing');
        setMessage('正在识别...');
        try {
            const controller = new AbortController();
            const config = { provider: apiProvider, modelScopeApiUrl, bailianApiKey };
            const result = await transcribeAudio(audioFile, context, language, enableItn, config, () => {}, controller.signal);
            
            if (result.transcription) {
                setMessage(result.transcription);
                
                // 输入法模式复制结果到剪贴板
                try {
                    const textArea = document.createElement('textarea');
                    textArea.value = result.transcription;
                    textArea.style.position = 'fixed';
                    textArea.style.left = '-999999px';
                    textArea.style.top = '-999999px';
                    document.body.appendChild(textArea);
                    textArea.select();
                    document.execCommand('copy');
                    document.body.removeChild(textArea);
                } catch (copyError) {
                    console.error('复制失败:', copyError);
                }
                
                onTranscriptionResult({
                    transcription: result.transcription,
                    detectedLanguage: result.detectedLanguage,
                    audioFile,
                });
                setStatus('success');
            } else {
                setMessage('未能识别到任何内容');
                setStatus('error');
            }
        } catch (err) {
            console.error('Transcription error:', err);
            const msg = err instanceof Error ? err.message : '转录过程中发生未知错误';
            setMessage(msg);
            setStatus('error');
        }
    }, [context, language, enableItn, onTranscriptionResult, apiProvider, modelScopeApiUrl, bailianApiKey]);
    
    const stopRecording = useCallback(() => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
            mediaRecorderRef.current.stop();
        }
    }, []);

    const handleCancel = useCallback(() => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
            mediaRecorderRef.current.onstop = () => {
                const stream = mediaRecorderRef.current?.stream;
                stream?.getTracks().forEach(track => track.stop());
                mediaRecorderRef.current = null;
                audioChunksRef.current = [];
            };
            mediaRecorderRef.current.stop();
            setStatus('idle');
            setMessage('');
        }
    }, []);

    const startRecording = async () => {
        setMessage('正在聆听...');
        setStatus('recording');
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    deviceId: selectedDeviceId === 'default' ? undefined : { exact: selectedDeviceId },
                    echoCancellation: false,
                    noiseSuppression: false,
                    autoGainControl: false,
                }
            });
            const recorder = new MediaRecorder(stream);
            mediaRecorderRef.current = recorder;
            audioChunksRef.current = [];

            recorder.ondataavailable = (event) => {
                if (event.data.size > 0) audioChunksRef.current.push(event.data);
            };

            recorder.onstop = () => {
                const mimeType = mediaRecorderRef.current?.mimeType || 'audio/webm';
                const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });

                const now = new Date();
                const year = now.getFullYear();
                const month = (now.getMonth() + 1).toString().padStart(2, '0');
                const day = now.getDate().toString().padStart(2, '0');
                const hours = now.getHours().toString().padStart(2, '0');
                const minutes = now.getMinutes().toString().padStart(2, '0');
                const formattedDate = `${year}-${month}-${day}_${hours}-${minutes}`;
                const fileExtension = mimeType.split('/')[1]?.split(';')[0] || 'webm';
                const audioFile = new File([audioBlob], `pip-recording-${formattedDate}.${fileExtension}`, { type: mimeType });

                audioChunksRef.current = [];
                stream.getTracks().forEach(track => track.stop());
                handleTranscription(audioFile);
            };

            recorder.start();
        } catch (err) {
            console.error("Error accessing microphone:", err);
            setMessage("麦克风访问被拒绝");
            setStatus('error');
        }
    };
    
    const handleClick = () => {
        if (status === 'recording') {
            stopRecording();
        } else if (status === 'idle' || status === 'success' || status === 'error') {
            startRecording();
        }
    };

    const getIcon = () => {
        const iconClass = "w-6 h-6 text-white";
        switch (status) {
            case 'idle':
                return <MicrophoneIcon className={iconClass} />;
            case 'recording':
                return <StopIcon className={iconClass} />;
            case 'processing':
                return <LoaderIcon color="white" className="w-6 h-6" />;
            case 'success':
                 return <CheckIcon className={iconClass} />;
            case 'error':
                 return <CloseIcon className={iconClass} />;
            default:
                return <MicrophoneIcon className={iconClass} />;
        }
    };

    const getIconContainerClass = () => {
        const base = "p-2 rounded-md transition-colors duration-300 flex-shrink-0 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-primary focus:ring-offset-base-100 disabled:opacity-50 disabled:cursor-not-allowed";
        switch (status) {
            case 'idle':
                return `${base} bg-brand-primary animate-pulse-idle`;
            case 'recording': 
                return `${base} bg-red-600 animate-pulse-custom`;
            case 'error': 
                return `${base} bg-red-600`;
            case 'success': 
                return `${base} bg-green-600`;
            case 'processing':
            default: 
                return `${base} bg-brand-primary`;
        }
    };

    return (
        <div 
            className="flex items-center h-screen w-full bg-base-100 font-sans text-content-100 p-4"
        >
            <style>{`
                @keyframes pulse-custom { 50% { opacity: .6; } }
                .animate-pulse-custom { animation: pulse-custom 2s cubic-bezier(0.4, 0.6, 1) infinite; }
                @keyframes pulse-idle {
                  0% {
                    box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.5);
                  }
                  70% {
                    box-shadow: 0 0 0 10px rgba(16, 185, 129, 0);
                  }
                  100% {
                    box-shadow: 0 0 0 0 rgba(16, 185, 129, 0);
                  }
                }
                .animate-pulse-idle {
                  animation: pulse-idle 2s infinite;
                }
            `}</style>
            <div className="flex items-center gap-2 flex-shrink-0">
                <button
                    onClick={handleClick}
                    disabled={status === 'processing'}
                    className={getIconContainerClass()}
                    aria-label={
                        status === 'recording' ? '停止录音' :
                        status === 'processing' ? '正在识别' : '录音'
                    }
                >
                    {getIcon()}
                </button>
                {status === 'recording' && (
                    <button
                        onClick={handleCancel}
                        title="取消"
                        aria-label="取消录音"
                        className="p-2 rounded-md transition-colors duration-300 bg-base-300 text-content-100 hover:bg-red-600 hover:text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 focus:ring-offset-base-100"
                    >
                        <CloseIcon className="w-6 h-6" />
                    </button>
                )}
            </div>
            <input
                ref={inputRef}
                type="text"
                readOnly
                value={message}
                placeholder='点击录音'
                className={`ml-4 text-2xl font-semibold bg-transparent border-none focus:ring-0 p-0 w-full placeholder-content-200 ${status === 'success' || status === 'error' ? 'text-content-100' : 'text-content-200'}`}
            />
        </div>
    );
};
