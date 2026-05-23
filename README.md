# ASR Studio

<p align="center">
  <a href="./README.md">中文</a> | <a href="./README.en.md">English</a>
</p>

一个功能丰富的网页应用，旨在为 Qwen、豆包、Gemini 等 ASR / 多模态语音模型提供一个强大、高效且用户友好的操作界面。无论您是需要转录会议记录、整理语音内容，还是进行任何形式的语音转文本工作，本工具都能为您提供流畅的体验。

**[➡️ 访问在线应用](https://qwen3-asr-studio.pages.dev/)**

---

## 📸 应用截图

<img width="1277" height="1252" alt="image" src="https://github.com/user-attachments/assets/cb26576a-2761-41a1-88dd-417213ac8964" />




<img width="1277" height="1252" alt="image" src="https://github.com/user-attachments/assets/4d7452cd-8631-4f07-81f4-e86b7ad5bf15" />




## ✨ 主要功能

- **多种音频输入方式**:
    - **文件上传**: 支持拖拽或点击选择多种常见音频格式（WAV, MP3, FLAC, M4A 等）。
    - **实时录音**: 直接从麦克风录制音频，并带有实时音波可视化效果。

- **高效的转录核心**:
    - **多厂商 ASR 驱动**: 支持 Qwen 官方 ASR API、豆包语音识别极速版与 Gemini 音频理解接口，并为后续厂商扩展保留 provider 结构。
    - **上下文提示**: 可通过提供特定术语、人名或专业词汇作为上下文，显著提升识别的准确率。
    - **多语言支持**: 支持中文、英语、日语等多种语言的识别，并能自动检测语种。
    - **反向文本标准化 (ITN)**: 可选功能，能将“一月五号”这样的口语化表达转换为“1月5日”等书面形式。

- **优化的用户体验**:
    - **一键录音 (按住说话)**: 在非输入状态下，按住`空格键`即可开始录音，松开后自动停止并开始识别，操作如对讲机般便捷。
    - **音频压缩**: 在上传前对音频文件进行客户端压缩，可选择不同压缩等级，大幅减少上传等待时间，特别适合网络不佳的环境。
    - **画中画模式 (输入法模式)**: 独创的画中画（Picture-in-Picture）功能，可将录音和识别窗口悬浮在任何应用之上，让您能直接将识别结果“说”进任何文本框，实现真正的“语音输入法”。

- **强大的工作流与生产力工具**:
    - **历史记录**: 自动保存每一次的转录结果（包括音频文件），方便随时回顾、恢复或复制。
    - **智能缓存**: 所有转录结果、历史记录和设置均存储在用户本地浏览器（IndexedDB）中，保护隐私的同时，也避免了对同一文件的重复识别，节约时间。
    - **自动复制**: 可开启“自动复制”功能，在识别完成后立即将结果复制到剪贴板。

- **个性化设置**:
    - **浅色/深色主题**: 支持明暗两种主题，适应不同光线环境和个人偏好。
    - **设置持久化**: 所有个性化配置（如主题、自动复制、上下文等）都会被自动保存在本地。

## 🛠️ 技术栈

- **前端框架**: [React](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/)
- **UI 样式**: [Tailwind CSS](https://tailwindcss.com/)
- **ASR 接口**: Qwen 官方 OpenAI 兼容接口（`qwen3-asr-flash`）、豆包语音识别极速版（`volc.bigasr.auc_turbo`）、Gemini API（`gemini-3.5-flash`）
- **客户端技术**:
    - **Web Audio API**: 用于音频录制、处理和可视化。
    - **IndexedDB**: 用于在浏览器端持久化存储历史记录、缓存和用户设置。

## 🚀 本地开发

如果您希望在本地运行或参与开发，请遵循以下步骤：

**环境要求**:
- [Node.js](https://nodejs.org/) (建议使用 v18 或更高版本)
- [pnpm](https://pnpm.io/) (推荐) 或 npm/yarn

**步骤**:

1.  **克隆仓库**
    ```bash
    git clone https://github.com/yeahhe365/ASR-Studio.git
    cd ASR-Studio
    ```

2.  **进入前端项目并安装依赖**
    ```bash
    cd asr-studio
    pnpm install
    # 或者使用 npm
    # npm install
    ```

3.  **启动开发服务器**
    ```bash
    pnpm dev
    # 或者使用 npm
    # npm run dev
    ```

4.  在浏览器中打开 `http://localhost:5173` (或命令行提示的地址)。

## 📁 项目结构

```text
.
├── asr-studio/            # Vite + React 前端应用
│   ├── components/        # 可复用 React 组件与图标
│   ├── services/          # ASR、音频处理、IndexedDB 缓存服务
│   ├── App.tsx            # 主应用组件
│   └── package.json       # 前端依赖与脚本
├── README.md              # 中文说明
└── README.en.md           # English documentation
```

应用直接调用已配置的 ASR 厂商 API，无需维护额外的示例后端服务。

## 🤝 如何贡献

我们非常欢迎各种形式的贡献！如果您有任何建议、发现 Bug 或希望添加新功能，请：

1.  **Fork** 本仓库。
2.  创建一个新的分支 (`git checkout -b feature/YourAmazingFeature`)。
3.  提交您的更改 (`git commit -m 'Add some AmazingFeature'`)。
4.  将您的分支推送到远程仓库 (`git push origin feature/YourAmazingFeature`)。
5.  提交一个 **Pull Request**。

## 📜 开源许可

本项目采用 [MIT License](./LICENSE) 开源许可。

## 🙏 致谢

- 感谢**阿里云通义千问团队**、火山引擎与 Google Gemini 团队提供了出色的语音与多模态能力。
- 感谢 **React 和所有开源社区**的贡献者。
---

## 友链

- [Linux.do](https://linux.do/)：也称 L 站，是一个活跃的中文技术社区，围绕 AI、软件开发、资源分享与前沿资讯展开讨论；社区愿景是“新的理想型社区”，社区文化是“真诚、友善、团结、专业，共建你我引以为荣之社区”。
