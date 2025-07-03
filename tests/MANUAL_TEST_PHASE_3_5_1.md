# Manual Testing Checklist: Phase 3.5.1 AI Service Settings Modal

## Test Environment Setup

1. **Build & Launch App**: `npm run build && npm run start`
2. **Open Developer Tools**: `Ctrl+Shift+I` (Windows/Linux) or `Cmd+Option+I` (Mac)
3. **Monitor Console**: Watch for errors, warnings, and debug logs

## Test Suite 1: Modal Opening & Closing

### Test 1.1: Keyboard Shortcut

- [ ] **Action**: Press `Ctrl+,` (Windows/Linux) or `Cmd+,` (Mac)
- [ ] **Expected**: Settings modal opens with smooth animation
- [ ] **Verify**: Modal is centered, backdrop is visible, focus is on modal

### Test 1.2: Header Settings Button

- [ ] **Action**: Click gear icon in app header
- [ ] **Expected**: Settings modal opens
- [ ] **Verify**: Same behavior as keyboard shortcut

### Test 1.3: Tray Menu Access

- [ ] **Action**: Right-click system tray icon → "Settings"
- [ ] **Expected**: Main window opens + settings modal appears
- [ ] **Verify**: Both window and modal are visible

### Test 1.4: Modal Closing

- [ ] **Action**: Press `Escape` key
- [ ] **Expected**: Modal closes with animation
- [ ] **Action**: Click backdrop (outside modal)
- [ ] **Expected**: Modal closes
- [ ] **Action**: Click X button
- [ ] **Expected**: Modal closes

## Test Suite 2: Provider Selection

### Test 2.1: Default State

- [ ] **Expected**: "Local (OpenAI)" option is selected by default
- [ ] **Expected**: OpenAI API key input is visible
- [ ] **Expected**: Cloud subscription section is hidden

### Test 2.2: Switch to Cloud

- [ ] **Action**: Click "Personyx Cloud" radio button
- [ ] **Expected**: OpenAI key input becomes hidden
- [ ] **Expected**: Cloud subscription info appears
- [ ] **Expected**: Save button updates to reflect cloud selection

### Test 2.3: Switch Back to Local

- [ ] **Action**: Click "Local (OpenAI)" radio button
- [ ] **Expected**: Returns to local configuration view
- [ ] **Expected**: Previous API key value is preserved (if any)

## Test Suite 3: API Key Management

### Test 3.1: API Key Input

- [ ] **Action**: Enter test API key: `sk-` + test data
- [ ] **Expected**: Input accepts the value
- [ ] **Expected**: Characters are masked by default
- [ ] **Expected**: Show/hide toggle button appears

### Test 3.2: Show/Hide Toggle

- [ ] **Action**: Click eye icon to show key
- [ ] **Expected**: API key becomes visible as plain text
- [ ] **Expected**: Icon changes to "eye-off"
- [ ] **Action**: Click eye-off icon to hide key
- [ ] **Expected**: API key becomes masked again

### Test 3.3: API Key Validation

- [ ] **Action**: Enter invalid key: `invalid-key`
- [ ] **Expected**: No immediate validation error (validation happens on test)
- [ ] **Action**: Click "Test Connection" button with invalid key
- [ ] **Expected**: Error message appears: "Invalid API key format. OpenAI keys should start with 'sk-' and be at least 40 characters"
- [ ] **Expected**: Error appears in red box next to the Test Connection button
- [ ] **Action**: Enter valid format: `sk-` + 52 characters of test data
- [ ] **Expected**: Can test connection (may fail due to invalid key, but format validation passes)

## Test Suite 4: Connection Testing

### Test 4.1: Test Valid API Key

- [ ] **Setup**: Enter a valid OpenAI API key
- [ ] **Action**: Click "Test Connection" button
- [ ] **Expected**: Button shows "Testing..." state
- [ ] **Expected**: Success message appears after test
- [ ] **Expected**: Button returns to normal state

### Test 4.2: Test Invalid API Key

- [ ] **Setup**: Enter invalid API key
- [ ] **Action**: Click "Test Connection" button
- [ ] **Expected**: Error message appears
- [ ] **Expected**: Error is user-friendly (not raw API error)

### Test 4.3: Test Without API Key

- [ ] **Setup**: Clear API key field
- [ ] **Action**: Click "Test Connection" button
- [ ] **Expected**: Validation prevents test or shows appropriate message

## Test Suite 5: Cloud Subscription

### Test 5.1: Cloud Provider Selection

- [ ] **Action**: Select "Personyx Cloud" option
- [ ] **Expected**: Subscription status section appears
- [ ] **Expected**: Usage bars show current consumption
- [ ] **Expected**: Subscription details are displayed

### Test 5.2: Subscription Status Display

- [ ] **Verify**: Usage bars show meaningful percentages
- [ ] **Verify**: Subscription tier is displayed
- [ ] **Verify**: Renewal date is shown (if applicable)
- [ ] **Verify**: Usage limits are clear

## Test Suite 6: Saving & Persistence

### Test 6.1: Save Local Configuration

- [ ] **Setup**: Configure local OpenAI with valid key
- [ ] **Action**: Click "Save Settings" button
- [ ] **Expected**: Success message appears
- [ ] **Expected**: Modal closes automatically
- [ ] **Expected**: Settings persist after app restart

### Test 6.2: Save Cloud Configuration

- [ ] **Setup**: Select Personyx Cloud option
- [ ] **Action**: Click "Save Settings" button
- [ ] **Expected**: Configuration saves successfully
- [ ] **Expected**: Provider selection persists

### Test 6.3: Unsaved Changes Detection

- [ ] **Action**: Make changes but don't save
- [ ] **Action**: Try to close modal (Escape, X, or backdrop)
- [ ] **Expected**: Warning about unsaved changes appears
- [ ] **Expected**: Option to save, discard, or cancel

## Test Suite 7: Error Handling

### Test 7.1: Network Errors

- [ ] **Setup**: Disconnect from internet
- [ ] **Action**: Try to test API connection
- [ ] **Expected**: Network error message appears
- [ ] **Expected**: Error is user-friendly

### Test 7.2: Service Unavailable

- [ ] **Setup**: Enter valid key but service down
- [ ] **Action**: Test connection
- [ ] **Expected**: Appropriate error message
- [ ] **Expected**: Retry suggestion provided

### Test 7.3: Invalid Configuration

- [ ] **Action**: Try to save with invalid settings
- [ ] **Expected**: Validation prevents save
- [ ] **Expected**: Clear error messages guide user

## Test Suite 8: Accessibility & UX

### Test 8.1: Keyboard Navigation

- [ ] **Action**: Tab through all interactive elements
- [ ] **Expected**: Focus indicators are visible
- [ ] **Expected**: Logical tab order
- [ ] **Expected**: All buttons reachable via keyboard

### Test 8.2: Screen Reader Support

- [ ] **Expected**: Form labels are properly associated
- [ ] **Expected**: Error messages are announced
- [ ] **Expected**: Modal has proper ARIA labels

### Test 8.3: Visual Design

- [ ] **Expected**: Evidence Gate design compliance
- [ ] **Expected**: Proper spacing and typography
- [ ] **Expected**: Consistent with app design system
- [ ] **Expected**: Works in both light and dark modes

## Test Suite 9: Integration Tests

### Test 9.1: Settings Integration

- [ ] **Action**: Save local OpenAI configuration
- [ ] **Action**: Try to import a PRD
- [ ] **Expected**: Uses local OpenAI for processing
- [ ] **Expected**: No API key errors

### Test 9.2: Provider Switching

- [ ] **Action**: Switch from local to cloud
- [ ] **Action**: Process evidence or PRD
- [ ] **Expected**: Uses cloud service
- [ ] **Expected**: Seamless transition

### Test 9.3: Activity Log Integration

- [ ] **Action**: Save settings
- [ ] **Expected**: Activity log shows "Settings Updated" entry
- [ ] **Expected**: Entry includes relevant details

## Test Results Template

```
## Test Results - Phase 3.5.1 AI Service Settings Modal
**Date**: [DATE]
**Tester**: [NAME]
**Build**: [COMMIT/VERSION]

### Summary
- Total Tests: [X]
- Passed: [X]
- Failed: [X]
- Blocked: [X]

### Failed Tests
1. [Test Name] - [Description of failure]
2. [Test Name] - [Description of failure]

### Notes
- [Any additional observations]
- [Performance notes]
- [Suggestions for improvement]
```

## Quick Smoke Test (5 minutes)

1. Open app with `npm run start`
2. Press `Ctrl+,` to open settings
3. Enter a test API key
4. Click "Test Connection"
5. Save settings and verify they persist
6. Check that tray → settings also works

**If these 6 steps work, core functionality is operational.**
