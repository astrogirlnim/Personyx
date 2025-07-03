# Testing Guide: Phase 3.1.4 Global Error Toast

This guide provides comprehensive testing scenarios for the global error toast system.

## Prerequisites

1. **Start the Application**:

   ```bash
   npm run dev
   ```

2. **Open Developer Tools** (for debugging):
   - Press `Cmd+Alt+I` (macOS) or `Ctrl+Shift+I` (Windows/Linux)
   - Go to Console tab to see error logs

## Test Scenarios

### 🔴 Test 1: PRD Import Validation Errors

These tests should trigger **validation-error** toasts (auto-dismiss in 5 seconds).

#### Test 1.1: Empty PRD File (0 bytes)

- **File**: `tests/files/test_invalid_prd_empty.md` (0 bytes, truly empty)
- **Steps**:
  1. Right-click system tray icon → "Import PRD"
  2. Select `tests/files/test_invalid_prd_empty.md`
  3. Click "Import PRD"
- **Expected**: Red error toast with "File is empty" or "File cannot be empty" message
- **Toast Type**: `validation-error`
- **Auto-dismiss**: 5 seconds

#### Test 1.1b: Whitespace-only PRD File

- **File**: `tests/files/test_invalid_prd_whitespace.md` (contains only spaces/newlines)
- **Steps**:
  1. Right-click system tray icon → "Import PRD"
  2. Select `tests/files/test_invalid_prd_whitespace.md`
  3. Click "Import PRD"
- **Expected**: Red error toast with empty file validation message
- **Toast Type**: `validation-error`
- **Auto-dismiss**: 5 seconds

#### Test 1.2: Large PRD File (Size Validation)

- **File**: `tests/files/test_large_prd.md`
- **Steps**:
  1. Right-click system tray icon → "Import PRD"
  2. Select `tests/files/test_large_prd.md`
  3. Click "Import PRD"
- **Expected**: Red error toast with "File size must be less than 10MB" message
- **Toast Type**: `validation-error`
- **Auto-dismiss**: 5 seconds

#### Test 1.3: Invalid File Type (PDF)

- **File**: `tests/files/test_invalid_binary.pdf`
- **Steps**:
  1. Right-click system tray icon → "Import PRD"
  2. Select `tests/files/test_invalid_binary.pdf`
  3. Click "Import PRD"
- **Expected**: Red error toast with "Invalid file type" message
- **Toast Type**: `validation-error`
- **Auto-dismiss**: 5 seconds

#### Test 1.4: Invalid File Extension (DOCX)

- **File**: `tests/files/test_invalid_extension.docx`
- **Steps**:
  1. Right-click system tray icon → "Import PRD"
  2. Select `tests/files/test_invalid_extension.docx`
  3. Click "Import PRD"
- **Expected**: Red error toast with "Invalid file type" or extension error message
- **Toast Type**: `validation-error`
- **Auto-dismiss**: 5 seconds

### 🔴 Test 2: PRD Import Processing Errors

These tests should trigger **ingest-error** toasts (auto-dismiss in 8 seconds).

#### Test 2.1: Drag & Drop Processing Error

- **Steps**:
  1. Open main application window
  2. Drag `tests/files/test_invalid_prd_empty.md` onto the main drop zone
  3. Wait for processing to complete
- **Expected**: Red error toast with "PRD Import Failed" and processing error details
- **Toast Type**: `ingest-error`
- **Auto-dismiss**: 8 seconds

#### Test 2.2: Modal Processing Error

- **Steps**:
  1. Right-click system tray icon → "Import PRD"
  2. Drag `tests/files/test_invalid_prd_empty.md` onto the modal drop zone
  3. Wait for processing to complete
- **Expected**: Red error toast with processing error details
- **Toast Type**: `ingest-error`
- **Auto-dismiss**: 8 seconds

### 🔴 Test 3: Transcript Import Errors

These tests should trigger **ingest-error** toasts (auto-dismiss in 8 seconds).

#### Test 3.1: Empty Transcript File

- **File**: `interviews/test_empty_transcript.txt` (0 bytes, truly empty)
- **Steps**:
  1. Right-click system tray icon → "Import Transcript"
  2. Select `interviews/test_empty_transcript.txt`
  3. Click "Import Transcript"
- **Expected**: Red error toast with "File cannot be empty" or "Transcript Import Failed" message
- **Toast Type**: `validation-error` or `ingest-error`
- **Auto-dismiss**: 5-8 seconds (depending on where validation catches it)

#### Test 3.2: Malformed Transcript File

- **File**: `interviews/test_malformed_transcript.txt`
- **Steps**:
  1. Right-click system tray icon → "Import Transcript"
  2. Select `interviews/test_malformed_transcript.txt`
  3. Click "Import Transcript"
- **Expected**: Red error toast with processing error details
- **Toast Type**: `ingest-error`
- **Auto-dismiss**: 8 seconds

#### Test 3.3: Drag & Drop Transcript Error

- **Steps**:
  1. Open transcript import modal
  2. Drag `interviews/test_malformed_transcript.txt` onto the modal
  3. Wait for processing to complete
- **Expected**: Red error toast with processing error details
- **Toast Type**: `ingest-error`
- **Auto-dismiss**: 8 seconds

### 🔴 Test 4: Manual Toast Dismiss

Test that users can manually dismiss toasts before auto-dismiss.

#### Test 4.1: Manual Dismiss

- **Steps**:
  1. Trigger any error toast (use Test 1.1)
  2. Click the "×" button on the toast before it auto-dismisses
- **Expected**: Toast immediately disappears
- **Verify**: Toast doesn't reappear after auto-dismiss timer

#### Test 4.2: Multiple Toasts

- **Steps**:
  1. Quickly trigger multiple errors (use different test files)
  2. Verify multiple toasts appear stacked
  3. Dismiss them individually
- **Expected**: Multiple toasts stack vertically, can be dismissed individually

### 🔴 Test 5: Toast Behavior Verification

#### Test 5.1: Toast Animation

- **Steps**:
  1. Trigger any error toast
  2. Watch the toast appearance animation
- **Expected**: Toast slides in from the right with smooth animation
- **Verify**: Toast slides out smoothly when dismissed

#### Test 5.2: Toast Positioning

- **Steps**:
  1. Trigger multiple toasts
  2. Verify positioning
- **Expected**: Toasts appear in top-right corner, stack vertically with proper spacing

#### Test 5.3: Toast Content

- **Steps**:
  1. Trigger different error types
  2. Verify each toast shows:
     - Appropriate error icon
     - Correct title
     - Detailed error message
     - File name (when applicable)
- **Expected**: All content displays correctly with proper formatting

### 🔴 Test 6: Error Types Verification

#### Test 6.1: Validation Error Styling

- **File**: Use any validation error test
- **Expected**: Risk-red styling, 5-second auto-dismiss
- **Verify**: Toast type is `validation-error`

#### Test 6.2: Ingest Error Styling

- **File**: Use any processing error test
- **Expected**: Risk-red styling, 8-second auto-dismiss
- **Verify**: Toast type is `ingest-error`

#### Test 6.3: General Error Styling

- **Steps**: This requires triggering application errors (not file-specific)
- **Expected**: Risk-red styling, 6-second auto-dismiss
- **Verify**: Toast type is `general-error`

### 🔴 Test 7: Cross-Platform Testing

#### Test 7.1: macOS Testing

- **Steps**: Run all above tests on macOS
- **Verify**: All functionality works consistently

#### Test 7.2: Windows Testing

- **Steps**: Run all above tests on Windows
- **Verify**: All functionality works consistently

#### Test 7.3: Linux Testing

- **Steps**: Run all above tests on Linux
- **Verify**: All functionality works consistently

## Debugging Tips

### Console Logging

Look for these console messages:

- `🚨 Global error emitted:` - Main process error emission
- `🎯 Error toast created:` - Toast creation in renderer
- `⏱️ Auto-dismiss timer started:` - Timer initialization

### IPC Communication

Watch for these IPC events in DevTools:

- `global-error` - Error event sent from main to renderer
- Check Network tab for any failed requests

### Toast State

Monitor React DevTools for:

- `errorToasts` state array
- Toast creation and removal
- Component re-renders

## Success Criteria

✅ **All tests should**:

- Display appropriate error toasts
- Show correct error messages
- Use proper styling (risk-red colors)
- Auto-dismiss after correct timeouts
- Be manually dismissible
- Stack properly when multiple toasts appear
- Work consistently across platforms

✅ **Toast should contain**:

- Error icon (exclamation triangle)
- Descriptive title
- Detailed error message
- File name (when applicable)
- Dismiss button (×)

✅ **No unexpected behavior**:

- No JavaScript errors in console
- No memory leaks from timers
- No UI blocking or freezing
- No duplicate toasts for same error

## Creating Custom Test Files

To create additional test files:

1. **PRD Test Files**: Place in `tests/files/` with `.md` extension
2. **Transcript Test Files**: Place in `interviews/` with `.txt` extension
3. **File Size Limits**: Current limit is 10MB for validation testing
4. **File Types**: Only `.md` and `.txt` files should be accepted

## Cleanup

After testing, you can remove the test files:

```bash
rm tests/files/test_invalid_prd_empty.md
rm tests/files/test_large_prd.md
rm tests/files/test_invalid_binary.pdf
rm interviews/test_empty_transcript.txt
rm interviews/test_malformed_transcript.txt
```

---

**🎯 Testing Goal**: Verify that all error scenarios properly trigger the global error toast system with appropriate styling, timing, and user experience.
