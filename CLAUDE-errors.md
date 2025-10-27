# CLAUDE-errors.md

This file documents errors encountered during development and their solutions.

## Error #1: Blank White Window on Launch

**Date**: 2025-10-27

**Symptom**:
- App window opens successfully
- Menu bar is visible
- Main content area shows only a blank white screen
- No UI elements render

**Environment**:
- Electron: 38.4.0
- webpack-dev-server: 5.2.2
- Node.js: (version from system)

**Investigating**:
- Checking main process renderer loading logic
- Verifying webpack dev server configuration
- Checking console errors in DevTools
- Verifying HTML template and React mounting

**Root Cause**:
Multiple issues were discovered after upgrading to Electron 38.4.0 and webpack-dev-server 5.2.2:

1. **CSP Too Restrictive**: The Content Security Policy in HTML template blocked webpack-dev-server features:
   - Inline scripts for hot module replacement
   - `eval()` used by webpack for source maps
   - WebSocket connections for hot reload

2. **Preload Script Node.js Module Error**: The preload script imported `constants.ts` which tried to use Node.js modules (`path`, `os`) that aren't available in the sandboxed preload context.

3. **Webpack 5 Global Polyfill Missing**: Webpack 5 no longer automatically polyfills `global`, causing `ReferenceError: global is not defined` in the renderer process.

**Solution**:

**Fix 1: Dynamic CSP**
- **Removed static CSP** from `src/renderer/index.html`
- **Implemented dynamic CSP** via Electron's session API in `src/main/index.ts`
  - Development: Allows `unsafe-inline`, `unsafe-eval`, localhost:3000, and WebSocket
  - Production: Strict policy with only `'self'` and `'unsafe-inline'` for styles

**Fix 2: Separate IPC Channels File**
- **Created** `src/shared/ipc-channels.ts` with only IPC_CHANNELS (no Node.js dependencies)
- **Updated** `src/preload/index.ts` to import from `ipc-channels.ts` instead of `constants.ts`
- **Modified** `src/shared/constants.ts` to re-export IPC_CHANNELS from `ipc-channels.ts`

**Fix 3: Webpack Global Polyfill**
- **Updated** `webpack.renderer.config.js`:
  - Added `resolve.fallback` for process and buffer polyfills
  - Added `webpack.ProvidePlugin` to inject process and Buffer globally
  - Added `webpack.DefinePlugin` to define `global` as `globalThis`
- **Installed** polyfill packages: `npm install --save-dev process buffer`

**Files Modified**:
- `src/renderer/index.html` - Removed static CSP meta tag
- `src/main/index.ts` - Added dynamic CSP based on NODE_ENV
- `src/shared/ipc-channels.ts` - NEW: IPC channels without Node.js dependencies
- `src/preload/index.ts` - Changed import from constants.ts to ipc-channels.ts
- `src/shared/constants.ts` - Re-exports IPC_CHANNELS from ipc-channels.ts
- `webpack.renderer.config.js` - Added polyfills for process, Buffer, and global
- `package.json` - Added process and buffer dev dependencies

**Testing**:
After rebuilding with `npm run dev`, all three errors should be resolved and the React UI should render correctly.

---

## Troubleshooting Checklist

When encountering issues:

1. **Check DevTools Console**
   - Open with F12 or Ctrl+Shift+I
   - Look for JavaScript errors
   - Check Network tab for failed requests

2. **Check Main Process Console**
   - Look at terminal where `npm run dev` is running
   - Check for build errors
   - Verify webpack compilation succeeded

3. **Verify File Paths**
   - Check that dist/ directory exists
   - Verify files are being built correctly
   - Check webpack output paths

4. **Check Dependencies**
   - Run `npm install` to ensure all deps installed
   - Check for version conflicts
   - Verify package.json is correct

5. **Clear Build Cache**
   ```bash
   rm -rf dist node_modules package-lock.json
   npm install
   npm run dev
   ```

---

## Common Issues Reference

### Issue: Module not found
**Solution**: Check import paths and ensure files exist

### Issue: Cannot read property of undefined
**Solution**: Check that objects are initialized before accessing properties

### Issue: CORS errors
**Solution**: Not applicable for Electron (no CORS in local files)

### Issue: White screen in production build
**Solution**: Check file paths in main process (relative vs absolute)

---

*This file will be updated as issues are encountered and resolved.*
