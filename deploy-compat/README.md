# Deploy Compatibility Wrapper

This directory keeps compatibility with deployment platforms that expect a package at the repository root level. It does not contain a second app.

The `build` script installs and builds `../asr-studio`, then copies the generated static assets into this directory's `dist/` folder.
