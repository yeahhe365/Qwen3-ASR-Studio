import React from 'react';
import { PaletteIcon } from '../icons/PaletteIcon';
import { SectionBlock, SegmentedControl, SettingRow, ToggleSwitch } from './SettingsControls';
import type { SettingsPanelProps } from './settingsTypes';

type InterfaceSettingsSectionProps = Pick<SettingsPanelProps, 'values' | 'setters' | 'disabled'>;

export const InterfaceSettingsSection: React.FC<InterfaceSettingsSectionProps> = ({ values, setters, disabled }) => {
  const { autoCopy, theme } = values;
  const { setAutoCopy, setTheme } = setters;

  return (
    <div className="space-y-6">
      <SectionBlock title="界面" icon={<PaletteIcon className="h-3.5 w-3.5" />}>
        <SettingRow label="主题" description="切换浅色或深色外观。">
          <SegmentedControl
            ariaLabel="主题"
            value={theme}
            onChange={setTheme}
            disabled={disabled}
            options={[
              { value: 'light', label: '浅色' },
              { value: 'dark', label: '深色' },
            ]}
          />
        </SettingRow>
        <SettingRow label="自动复制结果" description="识别完成后自动将结果复制到剪贴板。">
          <ToggleSwitch id="auto-copy" enabled={autoCopy} onChange={setAutoCopy} disabled={disabled} />
        </SettingRow>
      </SectionBlock>
    </div>
  );
};
