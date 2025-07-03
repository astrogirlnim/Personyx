# Phase 3.1.4 Global Error Toast Implementation Plan

**Feature:** Show global error toast for failed ingest events  
**Phase:** 3 - Interface Layer  
**Sub-feature:** 1.4 - Tray UI Core Screens  
**Status:** 📋 Planned  
**Created:** 2025-01-02  
**Updated:** 2025-01-02

---

## Executive Summary

This plan implements a comprehensive global error toast notification system for Personyx that displays real-time error notifications for failed ingest events (PRD imports, transcript processing, AI service failures, etc.). The system will integrate seamlessly with the existing Personyx Evidence Gate design system and provide users with actionable error information without disrupting their workflow.

## Current State Analysis

### Existing Error Handling Architecture

- **Main Process Errors**: Services emit errors via IPC using `error` event with `{ message: string; details?: unknown }` structure
- **Service Error Sources**:
  - `TranscriptIngestService`: Classification failures, timeout errors, service initialization
  - `SecureFileIngestService`: File validation, processing, embedding generation failures
  - `WorkflowOrchestrator`: Pipeline coordination errors, IPC communication failures
  - `EmbeddingProviderManager`: AI service connection failures
- **Current UI Error Display**: Local error states in modals (`TranscriptImportModal`, `ImportPRDModal`)
- **Missing**: No centralized global error notification system

### Key Error Categories Identified

1. **File Ingest Errors**: Invalid file types, size limits, processing failures
2. **AI Service Errors**: API key failures, rate limiting, service unavailability
3. **Transcript Processing Errors**: Classification failures, embedding generation errors
4. **Database Errors**: Connection issues, persistence failures
5. **System Errors**: IPC communication failures, service initialization errors

---

## Phase 3.1.4 Implementation Plan

### 📋 Phase 3.1.4.1 - Enhanced Error Type System

#### [ ] **3.1.4.1.1 - Expand Error Type Definitions**

- [ ] **File**: `src/shared/types.ts`
- [ ] **Task**: Extend error types with severity levels and categorization
- [ ] **Details**:
  - Add `ErrorSeverity` enum: `'info' | 'warning' | 'error' | 'critical'`
  - Add `ErrorCategory` enum: `'file_ingest' | 'ai_service' | 'transcript' | 'database' | 'system'`
  - Create `GlobalErrorEvent` interface with id, timestamp, retry actions
  - Extend `IPCEvents` interface with new error events

#### [ ] **3.1.4.1.2 - Create Error Classification System**

- [ ] **File**: `src/shared/constants.ts`
- [ ] **Task**: Define error classification constants and retry policies
- [ ] **Details**:
  - Error severity mapping rules
  - Retry attempt configurations per error type
  - Timeout values for different error categories
  - User-friendly error message templates

#### [ ] **3.1.4.1.3 - Update Service Error Emission**

- [ ] **Files**:
  - `src/main/services/TranscriptIngestService.ts`
  - `src/main/services/SecureFileIngestService.ts`
  - `src/main/services/WorkflowOrchestrator.ts`
  - `src/main/services/EmbeddingProviderManager.ts`
- [ ] **Task**: Enhance error emission with structured error data
- [ ] **Details**:
  - Replace generic error emissions with structured `GlobalErrorEvent`
  - Add error context (file names, operation types, user actions)
  - Include retry capabilities and suggested actions
  - Add error correlation IDs for tracking

### 📋 Phase 3.1.4.2 - Toast Component Architecture

#### [ ] **3.1.4.2.1 - Create Base Toast Component**

- [ ] **File**: `src/renderer/components/Toast.tsx`
- [ ] **Task**: Implement base toast component with Evidence Gate design compliance
- [ ] **Details**:
  - Support for different severity levels (info, warning, error, critical)
  - Auto-dismiss functionality with configurable timeout
  - Manual dismiss capability
  - Accessibility features (ARIA labels, keyboard navigation)
  - Animation states (slide-in, fade-out, pulse for critical errors)
  - Design system integration (colors, typography, spacing)

#### [ ] **3.1.4.2.2 - Create Toast Container System**

- [ ] **File**: `src/renderer/components/ToastContainer.tsx`
- [ ] **Task**: Implement toast container with multi-toast management
- [ ] **Details**:
  - Stack-based toast positioning (top-right corner)
  - Maximum concurrent toasts (limit: 5)
  - Z-index management for overlay priority
  - Toast queue system for overflow handling
  - Responsive positioning for different screen sizes

#### [ ] **3.1.4.2.3 - Create Toast State Management**

- [ ] **File**: `src/renderer/hooks/useToasts.ts`
- [ ] **Task**: Implement toast state management with React hooks
- [ ] **Details**:
  - Toast addition/removal methods
  - Auto-dismiss timer management
  - Toast persistence for critical errors
  - Duplicate toast prevention
  - Toast interaction tracking

### 📋 Phase 3.1.4.3 - Error Message Enhancement

#### [ ] **3.1.4.3.1 - Create Error Message Templates**

- [ ] **File**: `src/shared/errorMessages.ts`
- [ ] **Task**: Define user-friendly error messages with actionable guidance
- [ ] **Details**:
  - Template system for dynamic error messages
  - Severity-appropriate language and tone
  - Action-oriented error descriptions
  - Troubleshooting suggestions
  - Link to relevant documentation sections

#### [ ] **3.1.4.3.2 - Implement Error Context Enhancement**

- [ ] **File**: `src/main/utils/errorFormatter.ts`
- [ ] **Task**: Create error context formatting utility
- [ ] **Details**:
  - File name extraction and sanitization
  - Error cause analysis and categorization
  - Suggested user actions based on error type
  - Context preservation for debugging
  - Privacy-safe error logging

### 📋 Phase 3.1.4.4 - IPC Integration Layer

#### [ ] **3.1.4.4.1 - Enhanced IPC Event Handlers**

- [ ] **File**: `src/main/preload.ts`
- [ ] **Task**: Add enhanced error event handlers
- [ ] **Details**:
  - New IPC event listeners for global errors
  - Error event filtering and prioritization
  - Batch error handling for multiple simultaneous errors
  - Error acknowledgment system

#### [ ] **3.1.4.4.2 - Renderer Error Event Integration**

- [ ] **File**: `src/renderer/App.tsx`
- [ ] **Task**: Integrate global error handling with main app component
- [ ] **Details**:
  - Global error event listeners
  - Toast system initialization
  - Error event processing and display
  - Error state persistence during navigation

### 📋 Phase 3.1.4.5 - Design System Integration

#### [ ] **3.1.4.5.1 - Toast Design System Classes**

- [ ] **File**: `src/renderer/styles/index.css`
- [ ] **Task**: Add toast-specific design system classes
- [ ] **Details**:
  - Toast container positioning classes
  - Severity-specific color schemes (evidence blue, persona green, risk red)
  - Animation keyframes for toast transitions
  - Dark mode support for toast components
  - Responsive breakpoints for mobile/desktop

#### [ ] **3.1.4.5.2 - Toast Icon System**

- [ ] **File**: `src/renderer/components/ToastIcon.tsx`
- [ ] **Task**: Implement toast icon component with Lucide icons
- [ ] **Details**:
  - Severity-mapped icon selection
  - Consistent icon sizing and positioning
  - Icon animation states
  - Accessibility attributes for screen readers

### 📋 Phase 3.1.4.6 - Error Recovery & Retry System

#### [ ] **3.1.4.6.1 - Retry Logic Implementation**

- [ ] **File**: `src/main/utils/retryHandler.ts`
- [ ] **Task**: Implement intelligent retry logic for recoverable errors
- [ ] **Details**:
  - Exponential backoff strategy
  - Max retry attempts per error type
  - Retry condition evaluation
  - User-initiated retry functionality
  - Retry state persistence

#### [ ] **3.1.4.6.2 - Toast Action Buttons**

- [ ] **File**: `src/renderer/components/ToastActions.tsx`
- [ ] **Task**: Implement action buttons for toast interactions
- [ ] **Details**:
  - "Retry" button for recoverable errors
  - "View Details" button for complex errors
  - "Dismiss" button for all toasts
  - "Don't Show Again" option for non-critical errors
  - Keyboard shortcuts for toast actions

### 📋 Phase 3.1.4.7 - Testing & Validation

#### [ ] **3.1.4.7.1 - Unit Test Coverage**

- [ ] **File**: `tests/test_phase_3_1_4_error_toast.mjs`
- [ ] **Task**: Comprehensive unit tests for error toast system
- [ ] **Details**:
  - Toast component rendering tests
  - Error event handling tests
  - State management validation
  - Accessibility compliance tests
  - Performance benchmarks

#### [ ] **3.1.4.7.2 - Integration Test Suite**

- [ ] **File**: `tests/test_phase_3_1_4_integration.mjs`
- [ ] **Task**: End-to-end integration tests
- [ ] **Details**:
  - File import error scenarios
  - AI service failure simulation
  - Toast display and interaction tests
  - Error recovery workflow tests
  - Multi-toast scenario testing

#### [ ] **3.1.4.7.3 - Error Scenario Testing**

- [ ] **File**: `tests/test_phase_3_1_4_error_scenarios.mjs`
- [ ] **Task**: Test specific error scenarios
- [ ] **Details**:
  - File validation failure tests
  - AI service timeout simulation
  - Database connection error tests
  - Network failure scenarios
  - Edge case error handling

### 📋 Phase 3.1.4.8 - Documentation & Deployment

#### [ ] **3.1.4.8.1 - Update Documentation**

- [ ] **Files**:
  - `docs/DEVELOPMENT.md`
  - `docs/file_structure.md`
  - `memory_bank/mmemory_bank_systemPatterns.md`
- [ ] **Task**: Update project documentation
- [ ] **Details**:
  - Add error toast system architecture
  - Document new error handling patterns
  - Update component library documentation
  - Add troubleshooting guide

#### [ ] **3.1.4.8.2 - Production Deployment**

- [ ] **Task**: Deploy error toast system to production
- [ ] **Details**:
  - Code review and approval
  - Git commit with proper message format
  - Integration with existing CI/CD pipeline
  - Performance monitoring setup
  - User feedback collection system

---

## Technical Architecture

### Component Hierarchy

```
App.tsx
├── ToastContainer.tsx
    ├── Toast.tsx (multiple instances)
        ├── ToastIcon.tsx
        ├── ToastActions.tsx
        └── ToastContent.tsx
```

### Data Flow

```
Service Error → IPC Event → Global Error Handler → Toast State → Toast Display
```

### Error Event Structure

```typescript
interface GlobalErrorEvent {
  id: string;
  timestamp: Date;
  severity: ErrorSeverity;
  category: ErrorCategory;
  message: string;
  context: {
    fileName?: string;
    operation?: string;
    serviceType?: string;
    userId?: string;
  };
  retry: {
    canRetry: boolean;
    maxAttempts: number;
    currentAttempt: number;
    retryAction?: () => Promise<void>;
  };
  actions: {
    primary?: ToastAction;
    secondary?: ToastAction;
  };
}
```

### Design System Integration

- **Colors**: Evidence Blue (`#2F80ED`), Persona Green (`#27AE60`), Risk Red (`#E74C3C`)
- **Typography**: Design system text classes (`text-body`, `text-caption`)
- **Spacing**: Consistent with Evidence Gate design (`p-4`, `gap-lg`)
- **Animations**: Respects `prefers-reduced-motion` for accessibility

### Firebase Configuration Considerations

- **Error Logging**: Optional Firebase error reporting integration
- **User Analytics**: Track error frequencies for improvement
- **Remote Config**: Dynamic error message templates
- **Performance Monitoring**: Toast rendering performance metrics

---

## Key Files and Dependencies

### New Files to Create

1. `src/renderer/components/Toast.tsx` - Base toast component
2. `src/renderer/components/ToastContainer.tsx` - Toast container system
3. `src/renderer/components/ToastIcon.tsx` - Toast icon component
4. `src/renderer/components/ToastActions.tsx` - Toast action buttons
5. `src/renderer/hooks/useToasts.ts` - Toast state management
6. `src/shared/errorMessages.ts` - Error message templates
7. `src/main/utils/errorFormatter.ts` - Error formatting utility
8. `src/main/utils/retryHandler.ts` - Retry logic implementation
9. `tests/test_phase_3_1_4_error_toast.mjs` - Unit tests
10. `tests/test_phase_3_1_4_integration.mjs` - Integration tests

### Files to Modify

1. `src/shared/types.ts` - Add error type definitions
2. `src/shared/constants.ts` - Add error constants
3. `src/main/preload.ts` - Add IPC event handlers
4. `src/renderer/App.tsx` - Integrate toast system
5. `src/renderer/styles/index.css` - Add toast styles
6. `src/main/services/TranscriptIngestService.ts` - Enhanced error emission
7. `src/main/services/SecureFileIngestService.ts` - Enhanced error emission
8. `src/main/services/WorkflowOrchestrator.ts` - Enhanced error emission
9. `src/main/services/EmbeddingProviderManager.ts` - Enhanced error emission

### Dependencies Required

- No new external dependencies (uses existing React, Tailwind, Lucide icons)
- Leverage existing Electron IPC system
- Integrate with existing design system classes

---

## Risk Assessment & Mitigation

### Technical Risks

1. **Performance Impact**: Multiple toasts could impact UI performance
   - **Mitigation**: Implement toast queue with maximum limit (5 concurrent)
2. **Memory Leaks**: Toast timers could cause memory leaks
   - **Mitigation**: Proper cleanup in useEffect hooks
3. **Accessibility**: Toast notifications could interfere with screen readers
   - **Mitigation**: Implement ARIA live regions and keyboard navigation

### User Experience Risks

1. **Toast Overload**: Too many error toasts could overwhelm users
   - **Mitigation**: Implement error deduplication and grouping
2. **Non-Actionable Errors**: Showing errors users can't fix
   - **Mitigation**: Filter errors by actionability and provide clear guidance

### Implementation Risks

1. **IPC Event Conflicts**: New error events could conflict with existing ones
   - **Mitigation**: Thorough testing and backward compatibility
2. **Design System Inconsistency**: Toast styling could break design consistency
   - **Mitigation**: Strict adherence to Evidence Gate design tokens

---

## Success Metrics

### Functional Metrics

- [ ] All error scenarios display appropriate toast notifications
- [ ] Toast animations comply with accessibility standards
- [ ] Error recovery actions work correctly
- [ ] Toast system handles concurrent errors gracefully

### Performance Metrics

- [ ] Toast rendering time < 100ms
- [ ] Memory usage increase < 5MB with 5 concurrent toasts
- [ ] No impact on main thread performance
- [ ] Smooth animations at 60fps

### User Experience Metrics

- [ ] Error messages are clear and actionable
- [ ] Toast positioning doesn't interfere with workflows
- [ ] Users can successfully retry failed operations
- [ ] Toast accessibility meets WCAG 2.1 AA standards

---

## Implementation Timeline

### Phase 3.1.4.1-3 (Foundation - 3 days)

- Day 1: Enhanced error types and constants
- Day 2: Base toast components and container
- Day 3: Error message templates and formatting

### Phase 3.1.4.4-5 (Integration - 2 days)

- Day 4: IPC integration and design system classes
- Day 5: Toast icon system and styling

### Phase 3.1.4.6-7 (Advanced Features - 2 days)

- Day 6: Error recovery and retry system
- Day 7: Toast actions and user interactions

### Phase 3.1.4.8 (Testing & Deployment - 1 day)

- Day 8: Testing, documentation, and deployment

**Total Estimated Duration**: 8 development days

---

## Conclusion

This implementation plan provides a comprehensive approach to implementing Phase 3.1.4 - Global Error Toast for Failed Ingest Events. The system will enhance user experience by providing clear, actionable error notifications while maintaining consistency with the Personyx Evidence Gate design system. The modular architecture ensures maintainability and extensibility for future enhancements.

The plan addresses all technical requirements, user experience considerations, and maintains alignment with the existing codebase architecture. Upon completion, users will have a robust error notification system that guides them through error recovery and provides transparency into system operations.
