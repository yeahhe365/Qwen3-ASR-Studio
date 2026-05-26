import React from 'react';
import { compressionLevelDisplayNames, languageDisplayNames } from '../../displayNames';
import { CompressionLevel, Language } from '../../types';
import { LanguageIcon } from '../icons/LanguageIcon';
import { SoundWaveIcon } from '../icons/SoundWaveIcon';
import { inputClassName, SectionBlock, SegmentedControl, SettingRow, ToggleSwitch } from './SettingsControls';
import type { SettingsPanelProps } from './settingsTypes';

type RecognitionSettingsSectionProps = Pick<SettingsPanelProps, 'values' | 'setters' | 'audioDevices' | 'disabled'>;

export const RecognitionSettingsSection: React.FC<RecognitionSettingsSectionProps> = ({
  values,
  setters,
  audioDevices,
  disabled,
}) => {
  const {
    autoGainControl,
    compressionLevel,
    context,
    echoCancellation,
    enableLongAudioChunking,
    enableItn,
    language,
    noiseSuppression,
    selectedDeviceId,
    trimSilence,
  } = values;
  const {
    setAutoGainControl,
    setCompressionLevel,
    setContext,
    setEchoCancellation,
    setEnableLongAudioChunking,
    setEnableItn,
    setLanguage,
    setNoiseSuppression,
    setSelectedDeviceId,
    setTrimSilence,
  } = setters;

  return (
    <div className="space-y-6">
      <SectionBlock title="语言与文本" icon={<LanguageIcon className="h-3.5 w-3.5" />}>
        <SettingRow label="语言" description="指定识别语言，或保持自动识别。">
          <select
            id="language-setting"
            value={language}
            onChange={(event) => setLanguage(event.target.value as Language)}
            disabled={disabled}
            className={`${inputClassName} sm:w-56`}
          >
            {Object.values(Language).map((langValue) => (
              <option key={langValue} value={langValue}>
                {languageDisplayNames[langValue]}
              </option>
            ))}
          </select>
        </SettingRow>
        <div className="py-3">
          <label htmlFor="context-setting" className="text-sm font-medium text-[var(--theme-text-primary)]">
            上下文（可选）
          </label>
          <p className="mt-0.5 text-xs leading-relaxed text-[var(--theme-text-tertiary)]">
            提供上下文以提高准确性，例如：人名、术语。
          </p>
          <textarea
            id="context-setting"
            rows={4}
            value={context}
            onChange={(event) => setContext(event.target.value)}
            disabled={disabled}
            placeholder="人名、术语等..."
            className={`mt-2 resize-y ${inputClassName}`}
          />
        </div>
        <SettingRow label="启用反向文本标准化 (ITN)" description="把数字、日期等内容转成更自然的文本格式。">
          <ToggleSwitch id="itn-setting" enabled={enableItn} onChange={setEnableItn} disabled={disabled} />
        </SettingRow>
      </SectionBlock>

      <SectionBlock title="音频" icon={<SoundWaveIcon className="h-3.5 w-3.5" />}>
        <SettingRow label="录音设备" description="选择浏览器录音时使用的输入设备。">
          <select
            id="audio-device-setting"
            value={selectedDeviceId}
            onChange={(event) => setSelectedDeviceId(event.target.value)}
            disabled={disabled || audioDevices.length === 0}
            className={`${inputClassName} sm:w-56`}
          >
            <option value="default">默认设备</option>
            {audioDevices.map((device) => (
              <option key={device.deviceId} value={device.deviceId}>
                {device.label || `设备 ${device.deviceId.substring(0, 8)}`}
              </option>
            ))}
          </select>
        </SettingRow>
        <SettingRow label="音频压缩" description="减小文件大小以加快上传速度。">
          <SegmentedControl
            ariaLabel="音频压缩"
            value={compressionLevel}
            onChange={setCompressionLevel}
            disabled={disabled}
            options={Object.values(CompressionLevel).map((level) => ({
              value: level,
              label: compressionLevelDisplayNames[level],
            }))}
          />
        </SettingRow>
        <SettingRow label="裁剪首尾静音" description="识别前自动移除本地音频开头和结尾的长静音。">
          <ToggleSwitch id="trim-silence-setting" enabled={trimSilence} onChange={setTrimSilence} disabled={disabled} />
        </SettingRow>
        <SettingRow label="长音频自动切片" description="本地音频超过 5 分钟时按段识别再合并结果。">
          <ToggleSwitch
            id="long-audio-chunking-setting"
            enabled={enableLongAudioChunking}
            onChange={setEnableLongAudioChunking}
            disabled={disabled}
          />
        </SettingRow>
        <SettingRow label="回声消除" description="浏览器录音时抑制扬声器回声。">
          <ToggleSwitch
            id="echo-cancellation-setting"
            enabled={echoCancellation}
            onChange={setEchoCancellation}
            disabled={disabled}
          />
        </SettingRow>
        <SettingRow label="噪声抑制" description="浏览器录音时降低背景噪声。">
          <ToggleSwitch
            id="noise-suppression-setting"
            enabled={noiseSuppression}
            onChange={setNoiseSuppression}
            disabled={disabled}
          />
        </SettingRow>
        <SettingRow label="自动增益" description="浏览器录音时自动平衡输入音量。">
          <ToggleSwitch
            id="auto-gain-setting"
            enabled={autoGainControl}
            onChange={setAutoGainControl}
            disabled={disabled}
          />
        </SettingRow>
      </SectionBlock>
    </div>
  );
};
