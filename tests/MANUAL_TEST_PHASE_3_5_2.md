# Manual Testing Guide: Phase 3.5.2 Third-Party Token Management

**Scope**: VSCode, Slack, Apple Notes (future) + existing OpenAI and Firebase Cloud services

## Test Environment Setup

1. **Build & Launch App**: `pnpm build && pnpm start`
2. **Open Developer Tools**: `Ctrl+Shift+I` (Windows/Linux) or `Cmd+Option+I` (Mac)
3. **Monitor Console**: Watch for logs, errors, and debug messages

## Test Suite 1: Token Validation

### Test 1.1: OpenAI Token Validation

**Valid Token Format:**

- [ ] **Action**: Open Settings modal (`Ctrl+,` or `Cmd+,`)
- [ ] **Action**: Enter a valid OpenAI API key format (50+ chars, starts with 'sk-') - use format: sk-[your-actual-key-here]
- [ ] **Expected**: No validation errors, token accepted
- [ ] **Console**: Should show validation success logs

**Invalid Token Format:**

- [ ] **Action**: Enter `invalid-token-123` (doesn't start with 'sk-')
- [ ] **Expected**: Validation error message displayed
- [ ] **Console**: Should show validation failure logs

### Test 1.2: VSCode Token Validation

**Valid Token Format (GitHub Classic):**

- [ ] **Action**: Use token starting with `ghp_` and 40+ characters
- [ ] **Test Token**: Use format `ghp_[your-40-char-github-token-here]`
- [ ] **Expected**: Should pass validation
- [ ] **Console**: Look for `✅ Token validation passed for vscode` log

**Valid Token Format (GitHub Fine-grained):**

- [ ] **Action**: Use token starting with `github_pat_` and 82+ characters
- [ ] **Test Token**: `github_pat_1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890`
- [ ] **Expected**: Should pass validation

**Invalid Token Format:**

- [ ] **Action**: Use `vscode_invalid_token_123`
- [ ] **Expected**: Should fail validation
- [ ] **Console**: Look for `❌ Token validation failed for vscode` log

### Test 1.3: Slack Token Validation

**Valid Token Format:**

- [ ] **Action**: Use token starting with `xoxb-` and 50+ characters
- [ ] **Test Token**: `xoxb-test123456-test123456-1234567890abcdef1234567890test`
- [ ] **Expected**: Should pass validation
- [ ] **Console**: Look for validation success logs

**Invalid Token Format:**

- [ ] **Action**: Use `slack_invalid_token_123`
- [ ] **Expected**: Should fail validation

### Test 1.4: Apple Notes Token Validation

**Valid Token Format (Future Implementation):**

- [ ] **Action**: Use token with 32+ characters
- [ ] **Test Token**: `apple_notes_1234567890abcdef1234567890abcdef`
- [ ] **Expected**: Should pass validation (placeholder implementation)
- [ ] **Console**: Look for `✅ Token validation passed for apple-notes` log

**Note:** Apple Notes API is not yet available, so this is placeholder validation.

**Invalid Token Format:**

- [ ] **Action**: Use `apple_notes_short`
- [ ] **Expected**: Should fail validation
- [ ] **Console**: Look for `❌ Token validation failed for apple-notes` log

## Test Suite 2: Token Storage & Retrieval

### Test 2.1: Token Storage

**Store Valid Tokens:**

- [ ] **Action**: Configure tokens for each service using valid formats
- [ ] **Expected**: Tokens should be stored successfully
- [ ] **Console**: Look for `✅ Third-party token configured successfully for service: [service]` logs

**Check Token Existence:**

- [ ] **Action**: Restart app and check if tokens are remembered
- [ ] **Expected**: Token status should show as configured
- [ ] **Console**: Look for token existence check logs

### Test 2.2: Token Status API

**Get Token Status:**

- [ ] **Action**: Open Settings modal
- [ ] **Expected**: Should display current status for all services
- [ ] **Console**: Look for token status retrieval logs

**Services Status Display:**

- [ ] **Expected**: Each service should show "Configured" or "Not Configured"
- [ ] **Expected**: Status should be accurate based on stored tokens

### Test 2.3: Token Removal

**Remove Tokens:**

- [ ] **Action**: Clear/remove tokens for configured services
- [ ] **Expected**: Tokens should be removed successfully
- [ ] **Console**: Look for `✅ Third-party token removed successfully for service: [service]` logs

**Verify Removal:**

- [ ] **Action**: Check token status after removal
- [ ] **Expected**: Services should show as "Not Configured"

## Test Suite 3: IPC Communication

### Test 3.1: IPC Channel Testing

**Set Third-Party Token:**

- [ ] **Action**: Configure a token through the UI
- [ ] **Expected**: IPC communication should work smoothly
- [ ] **Console**: Look for IPC channel logs in main process

**Get Token Status:**

- [ ] **Action**: Open Settings modal to view status
- [ ] **Expected**: Status should be retrieved via IPC
- [ ] **Console**: Look for `GET_TOKEN_STATUS` IPC calls

**Test Token:**

- [ ] **Action**: Test token connection (if test button exists)
- [ ] **Expected**: Test results should be communicated via IPC
- [ ] **Console**: Look for `TEST_THIRD_PARTY_TOKEN` IPC calls

### Test 3.2: Event Broadcasting

**Token Status Updates:**

- [ ] **Action**: Configure or remove tokens
- [ ] **Expected**: Status updates should be broadcast to renderer
- [ ] **Console**: Look for `TOKEN_STATUS_UPDATED` events

**Test Result Events:**

- [ ] **Action**: Test token connections
- [ ] **Expected**: Test results should be broadcast
- [ ] **Console**: Look for `THIRD_PARTY_TOKEN_TEST_RESULT` events

## Test Suite 4: Error Handling

### Test 4.1: Service Validation

**Unsupported Service:**

- [ ] **Action**: Try to configure token for unsupported service (manually via console)
- [ ] **Expected**: Should reject with proper error message
- [ ] **Console**: Look for `Unsupported service: [service]` errors

**Invalid Parameters:**

- [ ] **Action**: Try to configure token with missing parameters
- [ ] **Expected**: Should handle gracefully with error messages
- [ ] **Console**: Look for parameter validation errors

### Test 4.2: Database Errors

**Database Connection Issues:**

- [ ] **Action**: Test with corrupted database (if possible)
- [ ] **Expected**: Should handle database errors gracefully
- [ ] **Console**: Look for database error handling logs

**Encryption Errors:**

- [ ] **Action**: Test with invalid encryption setup
- [ ] **Expected**: Should handle encryption errors gracefully
- [ ] **Console**: Look for encryption error logs

## Test Suite 5: Integration Testing

### Test 5.1: Settings Hook Integration

**useSettings Hook:**

- [ ] **Action**: Open Settings modal and interact with token management
- [ ] **Expected**: React state should update correctly
- [ ] **Console**: Look for state management logs

**State Persistence:**

- [ ] **Action**: Configure tokens, close modal, reopen
- [ ] **Expected**: Token status should persist correctly
- [ ] **Console**: Look for state persistence logs

### Test 5.2: Type Safety

**TypeScript Compliance:**

- [ ] **Action**: Run `pnpm typecheck`
- [ ] **Expected**: Should pass without errors
- [ ] **Console**: Should show successful type checking

**API Parameter Types:**

- [ ] **Action**: Test with various parameter types
- [ ] **Expected**: Should handle type validation correctly
- [ ] **Console**: Look for type validation logs

## Test Suite 6: Performance Testing

### Test 6.1: Token Operations Performance

**Token Configuration Speed:**

- [ ] **Action**: Configure multiple tokens in sequence
- [ ] **Expected**: Operations should complete quickly (< 1 second each)
- [ ] **Console**: Look for performance timing logs

**Status Retrieval Speed:**

- [ ] **Action**: Open Settings modal multiple times
- [ ] **Expected**: Status should load quickly
- [ ] **Console**: Look for retrieval timing logs

### Test 6.2: Memory Usage

**Memory Leaks:**

- [ ] **Action**: Configure/remove tokens repeatedly
- [ ] **Expected**: Memory usage should remain stable
- [ ] **Console**: Monitor for memory warnings

## Test Suite 7: Security Testing

### Test 7.1: Token Encryption

**Encryption Verification:**

- [ ] **Action**: Configure tokens and check database directly
- [ ] **Expected**: Tokens should be encrypted in database
- [ ] **Console**: Look for encryption/decryption logs

**Key Rotation:**

- [ ] **Action**: Test token re-encryption if applicable
- [ ] **Expected**: Should handle key rotation correctly
- [ ] **Console**: Look for key rotation logs

### Test 7.2: Access Control

**API Access Control:**

- [ ] **Action**: Test token access from different processes
- [ ] **Expected**: Should respect access control boundaries
- [ ] **Console**: Look for access control logs

## Console Commands for Manual Testing

### Direct API Testing

```javascript
// Test token validation for VSCode
await window.electronAPI.settings.configureThirdPartyToken(
  'vscode',
  'ghp_test1234567890abcdef1234567890abcdeftest90'
);

// Test token validation for Slack
await window.electronAPI.settings.configureThirdPartyToken(
  'slack',
  'xoxb-test123456-test123456-1234567890abcdef1234567890test'
);

// Test token validation for Apple Notes (future)
await window.electronAPI.settings.configureThirdPartyToken(
  'apple-notes',
  'apple_notes_1234567890abcdef1234567890abcdef'
);

// Get token status
const status = await window.electronAPI.settings.getTokenStatus();
console.log('Token Status:', status);

// Test token
const testResult =
  await window.electronAPI.settings.testThirdPartyToken('vscode');
console.log('Test Result:', testResult);

// Remove token
await window.electronAPI.settings.removeThirdPartyToken('vscode');

// Get missing token warnings
const warnings = await window.electronAPI.settings.getMissingTokenWarnings();
console.log('Missing Token Warnings:', warnings);
```

### Database Direct Check

```javascript
// Check if tokens are encrypted in database
// (This would require direct database access - for advanced testing)
```

## Expected Log Messages

### Success Messages

- `✅ Third-party token configured successfully for service: [service]`
- `✅ Third-party token removed successfully for service: [service]`
- `✅ Token validation passed for [service]`

### Error Messages

- `❌ Failed to configure third-party token for [service]`
- `❌ Failed to remove third-party token for [service]`
- `❌ Token validation failed for [service]`
- `❌ Unsupported service: [service]`

### Validation Messages

- `Token format valid (full test pending)`
- `Invalid token format for [service]`

## Test Results Checklist

### Core Functionality

- [ ] Token validation works for all services
- [ ] Token storage and retrieval works
- [ ] Token removal works
- [ ] IPC communication works
- [ ] Error handling works
- [ ] Type safety maintained

### Integration

- [ ] Settings hook integration works
- [ ] UI updates correctly
- [ ] State persistence works
- [ ] Event broadcasting works

### Performance & Security

- [ ] Operations complete quickly
- [ ] Memory usage stable
- [ ] Tokens properly encrypted
- [ ] Access control respected

## Notes

- All token formats are based on the actual API requirements of each service
- Test tokens are fake and for validation testing only
- Monitor console logs throughout testing for detailed information
- Report any unexpected behavior or errors
- Take screenshots of error states for debugging
