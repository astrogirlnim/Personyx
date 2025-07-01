# Phase 3.1 Tray UI Core Screens - Comprehensive Testing Guide

**Date: 2025-01-03**  
**Branch: phase-3.1-tray-ui-core-screen**  
**Status: Implementation Complete - Testing Required**

## Overview

Phase 3.1 has been implemented with all 4 sub-features according to the MVP checklist. This guide provides systematic testing for each component to verify functionality, integration, and error handling.

## Testing Environment Setup

### Prerequisites

- Application running via `./dev.sh`
- All Phase 2 backend services operational
- Sample PRD files available in `/samples` and `/tests/files`
- Personas loaded from `personas.yml`

### Test Data Available

- `samples/sample_prd.md` - Valid PRD for import testing
- `tests/files/sample_prd.md` - Additional test PRD
- `tests/files/empty_file.md` - Empty file for validation testing
- `tests/files/large_file.md` - Large file for size limit testing
- `tests/files/test.jpg` - Invalid file type for validation testing

## Phase 3.1 Feature Testing

### ✅ Feature 1.1: Chat with Persona Window

**Test Cases:**

#### 1.1.1 Modal Display & Persona Dropdown

- [ ] Click "💬 Chat with Persona" button opens modal
- [ ] Modal displays with proper header and close button
- [ ] Persona dropdown shows all loaded personas from backend
- [ ] Dropdown is functional and allows selection
- [ ] Selected persona name displays correctly
- [ ] Modal can be closed via X button or outside click

#### 1.1.2 Chat Functionality

- [ ] Empty state shows welcome message with persona name
- [ ] User can type messages in input field
- [ ] Messages are sent via Enter key (not Shift+Enter)
- [ ] User messages appear on right side with proper styling
- [ ] Persona responses appear on left side with persona name
- [ ] Auto-scroll works when new messages are added
- [ ] Typing indicator shows during response generation

#### 1.1.3 Persona Switching

- [ ] Changing persona clears previous chat history
- [ ] New persona context is loaded correctly
- [ ] Chat history is isolated per persona session

#### 1.1.4 Error Handling

- [ ] Network errors show appropriate error toast
- [ ] Backend communication failures handled gracefully
- [ ] Loading states prevent multiple simultaneous requests
- [ ] Error messages are user-friendly and actionable

### ✅ Feature 1.2: Import PRD Modal

**Test Cases:**

#### 1.2.1 Modal Display & UI

- [ ] Click "Import First PRD" button opens modal
- [ ] Modal displays with proper header and close button
- [ ] Drop zone displays with visual indicators
- [ ] Supported file types (.md, .txt, .markdown) are documented
- [ ] Modal can be closed when not importing

#### 1.2.2 Drag & Drop Functionality

- [ ] Dragging valid file over drop zone shows visual feedback
- [ ] Drop zone highlights on drag enter
- [ ] Drop zone unhighlights on drag leave
- [ ] Dropping valid file selects it for import
- [ ] Dragging invalid file types shows error
- [ ] Multiple file drop only selects first file

#### 1.2.3 File Selection & Validation

- [ ] Browse button opens file dialog
- [ ] Valid file types (.md, .txt, .markdown) can be selected
- [ ] Invalid file types show error message
- [ ] Empty files (0 bytes) are rejected
- [ ] Large files (>10MB) are rejected
- [ ] File information displays correctly (name, size, type)

#### 1.2.4 Import Progress & Completion

- [ ] Import button triggers upload process
- [ ] Progress bar animates during import
- [ ] Progress updates in real-time
- [ ] Successful import closes modal automatically
- [ ] Failed import shows error and keeps modal open
- [ ] Import button is disabled during upload
- [ ] Modal cannot be closed during import

#### 1.2.5 File Preview

- [ ] Selected file shows preview information
- [ ] File can be removed before import
- [ ] File replacement works correctly

### ✅ Feature 1.3: Real-time Evidence Score Banner

**Test Cases:**

#### 1.3.1 Score Display

- [ ] Banner appears after successful PRD import
- [ ] Average evidence score displays correctly
- [ ] Score classification shows (Excellent/Good/Needs Work)
- [ ] Color coding matches score level (green/amber/red)
- [ ] Numeric score displays with proper formatting

#### 1.3.2 Real-time Updates

- [ ] Banner updates automatically when new scores calculated
- [ ] Pulse animation triggers on score updates
- [ ] IPC events properly update UI state
- [ ] Multiple imports update scores correctly

#### 1.3.3 Persona Breakdown

- [ ] Individual persona scores display
- [ ] Persona names show correctly
- [ ] Score breakdown is accurate
- [ ] Mobile responsive design works
- [ ] Persona pills display with proper styling

#### 1.3.4 Visual Feedback

- [ ] Ring gauge visualization works
- [ ] Pulse animation respects `prefers-reduced-motion`
- [ ] Banner can be dismissed if desired
- [ ] Responsive design works on different screen sizes

### ✅ Feature 1.4: Global Error Toast System

**Test Cases:**

#### 1.4.1 Toast Display & Styling

- [ ] Error toast appears in top-right corner
- [ ] Toast displays with proper error styling (red background)
- [ ] Warning toast shows with amber styling
- [ ] Info toast shows with blue styling
- [ ] Toast has proper z-index (appears above all content)

#### 1.4.2 Auto-dismiss Functionality

- [ ] Toast auto-dismisses after 5 seconds (default)
- [ ] Progress bar counts down during auto-dismiss
- [ ] Custom auto-close delay works correctly
- [ ] Manual close button works immediately
- [ ] Toast slides out smoothly when dismissed

#### 1.4.3 Action Buttons

- [ ] Import/PRD errors show "Try Again" and "Get Help" buttons
- [ ] Action buttons trigger appropriate callbacks
- [ ] Buttons work correctly and dismiss toast
- [ ] Button styling matches toast type

#### 1.4.4 Multiple Toasts

- [ ] Multiple errors stack properly
- [ ] Toast positioning doesn't overlap
- [ ] Individual toasts can be dismissed separately
- [ ] Toast order is logical (newest on top)

## Integration Testing

### IPC Communication

- [ ] All IPC events are properly registered and handled
- [ ] Evidence score updates trigger UI changes
- [ ] PRD import completion events work correctly
- [ ] Error events propagate to UI properly
- [ ] Event cleanup prevents memory leaks

### Backend Integration

- [ ] Persona loading from backend works
- [ ] Chat service integration functional
- [ ] File import service integration works
- [ ] Evidence scoring service integration works
- [ ] Error handling across services is consistent

### State Management

- [ ] React state updates correctly for all features
- [ ] Component state is isolated and doesn't interfere
- [ ] Modal state management works properly
- [ ] Loading states prevent race conditions

## Performance Testing

### Responsiveness

- [ ] UI remains responsive during imports
- [ ] Chat responses don't block UI
- [ ] Animations are smooth (60fps)
- [ ] Large file handling doesn't freeze UI

### Memory Usage

- [ ] No memory leaks in long-running sessions
- [ ] Chat history doesn't cause memory bloat
- [ ] File uploads release memory properly
- [ ] Component cleanup works correctly

## Accessibility Testing

### Keyboard Navigation

- [ ] All interactive elements are keyboard accessible
- [ ] Tab order is logical
- [ ] Enter/Escape keys work as expected
- [ ] Focus indicators are visible

### Screen Reader Support

- [ ] ARIA labels are present where needed
- [ ] Error messages are announced
- [ ] Loading states are communicated
- [ ] Modal focus management works

## Cross-Platform Testing

### Operating Systems

- [ ] macOS functionality verified
- [ ] Windows functionality verified (if applicable)
- [ ] Linux functionality verified (if applicable)

### Display Sizes

- [ ] Desktop display (1920x1080+) works correctly
- [ ] Laptop display (1366x768) works correctly
- [ ] Mobile responsive design functions
- [ ] High DPI displays render properly

## Error Scenarios

### Network Issues

- [ ] Backend service unavailable
- [ ] API timeouts handled gracefully
- [ ] Connection loss during operations
- [ ] Service recovery after downtime

### File Issues

- [ ] Corrupted file upload
- [ ] Network interruption during upload
- [ ] Insufficient disk space
- [ ] Permission errors

### User Input Issues

- [ ] Invalid chat messages
- [ ] Extremely long messages
- [ ] Special characters in inputs
- [ ] XSS prevention in user content

## Test Execution Checklist

### Pre-Testing Setup

- [ ] Application built and running without errors
- [ ] All backend services initialized
- [ ] Test files prepared and accessible
- [ ] Browser developer tools open for debugging

### Manual Testing Session

- [ ] All Feature 1.1 test cases executed
- [ ] All Feature 1.2 test cases executed
- [ ] All Feature 1.3 test cases executed
- [ ] All Feature 1.4 test cases executed
- [ ] Integration tests completed
- [ ] Performance tests completed
- [ ] Accessibility tests completed

### Post-Testing Documentation

- [ ] Test results documented
- [ ] Issues identified and logged
- [ ] Performance metrics recorded
- [ ] Screenshots/videos captured for reference

## Success Criteria

### Phase 3.1 Complete Success

- All 4 features function as designed
- No critical bugs or crashes
- UI/UX meets Evidence Gate design standards
- Performance is acceptable for production use
- Error handling is comprehensive and user-friendly

### Ready for Phase 3.2

- All Phase 3.1 issues resolved
- Code quality meets standards
- Documentation is complete
- Team confidence in implementation quality

## Notes

- Test with realistic data sizes and scenarios
- Focus on user experience and workflow efficiency
- Verify error messages are helpful and actionable
- Ensure animations enhance rather than distract from UX
- Test edge cases and boundary conditions thoroughly

---

**Testing Status**: Ready for execution
**Next Phase**: Phase 3.2 Notion Scorecard Prototype OR Phase 2.5 Hybrid AI Key Management
