# Quick Demo: Phase 3.1.4 Global Error Toast

This is a quick 5-minute demo to test the most important error toast scenarios.

## 🚀 Setup

1. Start the application:

   ```bash
   npm run dev
   ```

2. Open the tray application (click the tray icon in your system tray)

## 🔴 Quick Test Scenarios

### Test 1: File Size Validation Error (5-second auto-dismiss)

**Purpose**: Test validation error toast with auto-dismiss

1. Right-click system tray → "Import PRD"
2. Select `tests/files/test_large_prd.md` (11MB file)
3. Click "Import PRD"
4. **Expected**: Red error toast appears with "File size must be less than 10MB"
5. **Verify**: Toast auto-dismisses after 5 seconds

### Test 2: Empty File Validation Error

**Purpose**: Test validation error with different message

1. Right-click system tray → "Import PRD"
2. Select `tests/files/test_invalid_prd_empty.md` (0 bytes, truly empty)
3. Click "Import PRD"
4. **Expected**: Red error toast with "File is empty" or "File cannot be empty" message
5. **Verify**: Toast auto-dismisses after 5 seconds

### Test 2b: Invalid File Extension Error

**Purpose**: Test file type validation

1. Right-click system tray → "Import PRD"
2. Select `tests/files/test_invalid_extension.docx` (wrong extension)
3. Click "Import PRD"
4. **Expected**: Red error toast with "Invalid file type" message
5. **Verify**: Toast auto-dismisses after 5 seconds

### Test 3: Transcript Size Validation Error (5-second auto-dismiss)

**Purpose**: Test transcript file size validation

1. Right-click system tray → "Import Transcript"
2. Select `interviews/test_oversized_transcript.txt` (11MB file)
3. Click "Import Transcript"
4. **Expected**: Red error toast with "File size must be less than 10MB"
5. **Verify**: Toast auto-dismisses after 5 seconds

### Test 3b: Empty Transcript File Error

**Purpose**: Test empty transcript validation

1. Right-click system tray → "Import Transcript"
2. Select `interviews/test_truly_empty_transcript.txt` (0 bytes)
3. Click "Import Transcript"
4. **Expected**: Red error toast with "File cannot be empty"
5. **Verify**: Toast auto-dismisses after 5 seconds

### Test 4: Manual Dismiss

**Purpose**: Test manual dismiss functionality

1. Trigger any error toast (repeat Test 1)
2. Click the "×" button on the toast before it auto-dismisses
3. **Expected**: Toast disappears immediately

### Test 5: Multiple Toasts

**Purpose**: Test toast stacking

1. Quickly trigger Test 1 and Test 2 (use different files)
2. **Expected**: Multiple toasts stack vertically
3. **Verify**: Each can be dismissed individually

## ⚠️ Important: Real Errors vs. Slow Processing

**REAL ERRORS** (trigger error toasts):

- File size > 10MB
- Empty files (0 bytes)
- Invalid file types (.pdf, .docx, etc.)
- Binary/non-text files

**NOT ERRORS** (just slow processing):

- Large valid files with repetitive content
- Files that take 10+ minutes to process
- Low persona confidence scores (0-20%)
- Verbose console debug output

**If a file is "processing" with lots of console messages, it's NOT an error - it's just slow!**

## 🎯 What to Look For

### ✅ Success Indicators:

- Red error toasts appear in top-right corner
- Toasts slide in smoothly from the right
- Error messages are clear and descriptive
- Auto-dismiss timers work correctly (5s for validation, 8s for ingest)
- Manual dismiss (×) button works
- Multiple toasts stack properly
- No JavaScript errors in console

### ❌ Failure Indicators:

- No toast appears
- Toast appears but wrong color/styling
- Auto-dismiss doesn't work
- Manual dismiss doesn't work
- JavaScript errors in console
- UI freezes or blocks

## 🐛 Debug Console Messages

Watch for these in DevTools Console:

- `🚨 Global error emitted:` - Main process sending error
- `🎯 Error toast created:` - Renderer creating toast
- `⏱️ Auto-dismiss timer started:` - Timer initialization

## 🧹 Cleanup

After testing, remove test files:

```bash
rm tests/files/test_invalid_prd_empty.md
rm tests/files/test_large_prd.md
rm tests/files/test_invalid_binary.pdf
rm interviews/test_truly_empty_transcript.txt
rm interviews/test_oversized_transcript.txt
rm interviews/test_invalid_binary_transcript.dat
```

---

**Total Demo Time**: ~5 minutes  
**Result**: Phase 3.1.4 Global Error Toast system verified working ✅
