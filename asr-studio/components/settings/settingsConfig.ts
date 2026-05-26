import { ApiKeyIcon } from '../icons/ApiKeyIcon';
import { DatabaseIcon } from '../icons/DatabaseIcon';
import { InfoIcon } from '../icons/InfoIcon';
import { PaletteIcon } from '../icons/PaletteIcon';
import { SlidersIcon } from '../icons/SlidersIcon';
import type { SettingTab, SettingTabDescriptor } from './settingsTypes';

export const tabs: SettingTabDescriptor[] = [
  { id: 'api', label: 'API', description: '配置识别服务和密钥。', Icon: ApiKeyIcon },
  { id: 'recognition', label: '识别', description: '调整语言、提示和音频处理。', Icon: SlidersIcon },
  { id: 'interface', label: '界面', description: '调整外观和输出偏好。', Icon: PaletteIcon },
  { id: 'data', label: '数据', description: '管理应用安装、重置和历史记录。', Icon: DatabaseIcon },
  { id: 'about', label: '关于', description: '查看版本和项目入口。', Icon: InfoIcon },
];

export const tabGroups: Array<{ id: string; tabIds: SettingTab[] }> = [
  { id: 'primary', tabIds: ['api', 'recognition', 'interface', 'data'] },
  { id: 'about', tabIds: ['about'] },
];
