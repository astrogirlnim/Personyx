# Phase 3.1.6 Activity Log Implementation Plan

**Target Feature**: Implement Activity Log panel (ingest successes, errors, score updates)

## Current System Analysis

### ✅ Existing Architecture

- **Tray UI**: React-based with App.tsx as main component
- **IPC Events**: Comprehensive event system with 15+ event types
- **Storage**: SQLite database + localStorage for session persistence
- **Services**: WorkflowOrchestrator, TranscriptIngestService, SecureFileIngestService
- **Components**: Modals, toasts, evidence score gauge

### ✅ Available Activity Events

- `prd-imported` - PRD successfully imported
- `transcript-imported` - Transcript successfully processed
- `evidence-score-updated` - Evidence scores recalculated
- `global-error` - Various error types (ingest-error, validation-error, general-error)
- `transcript-success-toast` - Transcript analysis success

### ✅ Current Data Sources

- **Evidence Table**: Contains all processed evidence with timestamps
- **ProductDocuments Table**: Contains all imported PRDs
- **EvidenceScores Table**: Contains score calculations with timestamps
- **IPC Events**: Real-time activity notifications

## Implementation Strategy

### Phase A: Database & Schema Extensions

### Phase B: Main Process Activity Tracking Service

### Phase C: IPC Event Architecture

### Phase D: Renderer UI Components

### Phase E: Integration & Testing

---

## Phase A: Database & Schema Extensions

### [ ] **A.1 - Activity Log Database Schema**

- [ ] A.1.1 Create `activityLog` table in `src/main/db/schema.ts`
- [ ] A.1.2 Add activity log types (import-success, import-error, score-update, general-activity)
- [ ] A.1.3 Add database migration for activity log table
- [ ] A.1.4 Create ActivityLogRepo repository class
- [ ] A.1.5 Add activity log database indexes for performance

**Files to Create/Modify:**

- `src/main/db/schema.ts` - Add activityLog table
- `src/main/db/migrations/[timestamp]_add_activity_log.sql` - Migration
- `src/main/db/repositories/ActivityLogRepo.ts` - Repository
- `src/shared/types.ts` - Activity log types

### [ ] **A.2 - Activity Log Type Definitions**

- [ ] A.2.1 Define ActivityLogEntry interface in shared types
- [ ] A.2.2 Define ActivityLogType enum (import-success, import-error, score-update, etc.)
- [ ] A.2.3 Define ActivityLogMetadata interface for additional data
- [ ] A.2.4 Add IPC event types for activity log operations

**Files to Create/Modify:**

- `src/shared/types.ts` - ActivityLogEntry, ActivityLogType, ActivityLogMetadata
- `src/shared/constants.ts` - Activity log IPC channels

---

## Phase B: Main Process Activity Tracking Service

### [ ] **B.1 - ActivityLogService Implementation**

- [ ] B.1.1 Create ActivityLogService class with event listening
- [ ] B.1.2 Implement activity log persistence methods
- [ ] B.1.3 Add activity log retrieval with pagination
- [ ] B.1.4 Add activity log cleanup/archival logic
- [ ] B.1.5 Add activity statistics calculations

**Files to Create:**

- `src/main/services/ActivityLogService.ts` - Core service

### [ ] **B.2 - Service Integration Points**

- [ ] B.2.1 Integrate ActivityLogService into WorkflowOrchestrator
- [ ] B.2.2 Add activity logging to SecureFileIngestService
- [ ] B.2.3 Add activity logging to TranscriptIngestService
- [ ] B.2.4 Add activity logging to EvidenceScoreService
- [ ] B.2.5 Add error activity logging to global error handlers

**Files to Modify:**

- `src/main/services/WorkflowOrchestrator.ts` - Add activity logging
- `src/main/services/SecureFileIngestService.ts` - Add activity logging
- `src/main/services/TranscriptIngestService.ts` - Add activity logging
- `src/main/services/EvidenceScoreService.ts` - Add activity logging
- `src/main/main.ts` - Register ActivityLogService

### [ ] **B.3 - Activity Log Data Processing**

- [ ] B.3.1 Create activity log aggregation methods
- [ ] B.3.2 Add activity log filtering and search capabilities
- [ ] B.3.3 Add activity log export functionality
- [ ] B.3.4 Add activity log performance metrics
- [ ] B.3.5 Add activity log retention policies

---

## Phase C: IPC Event Architecture

### [ ] **C.1 - Activity Log IPC Events**

- [ ] C.1.1 Add activity-log-updated IPC event
- [ ] C.1.2 Add get-activity-log IPC event handler
- [ ] C.1.3 Add activity-log-stats IPC event handler
- [ ] C.1.4 Add clear-activity-log IPC event handler
- [ ] C.1.5 Add activity-log-export IPC event handler

**Files to Modify:**

- `src/shared/types.ts` - Add activity log IPC events
- `src/shared/constants.ts` - Add activity log IPC channels
- `src/main/preload.ts` - Add activity log IPC methods
- `src/renderer/global.d.ts` - Add ElectronAPI methods

### [ ] **C.2 - Real-time Activity Broadcasting**

- [ ] C.2.1 Implement real-time activity log broadcasting
- [ ] C.2.2 Add activity log event batching for performance
- [ ] C.2.3 Add activity log event throttling
- [ ] C.2.4 Add activity log event filtering options
- [ ] C.2.5 Add activity log event persistence confirmation

---

## Phase D: Renderer UI Components

### [ ] **D.1 - ActivityLogPanel Component**

- [ ] D.1.1 Create ActivityLogPanel.tsx component
- [ ] D.1.2 Add activity log entry display components
- [ ] D.1.3 Add activity log filtering controls
- [ ] D.1.4 Add activity log search functionality
- [ ] D.1.5 Add activity log pagination controls

**Files to Create:**

- `src/renderer/components/ActivityLogPanel.tsx` - Main panel component
- `src/renderer/components/ActivityLogEntry.tsx` - Individual entry component
- `src/renderer/components/ActivityLogFilters.tsx` - Filter controls
- `src/renderer/components/ActivityLogStats.tsx` - Statistics component

### [ ] **D.2 - Activity Log UI Integration**

- [ ] D.2.1 Add activity log panel to main App.tsx
- [ ] D.2.2 Add activity log toggle button to tray UI
- [ ] D.2.3 Add activity log keyboard shortcuts
- [ ] D.2.4 Add activity log panel responsive design
- [ ] D.2.5 Add activity log panel accessibility features

**Files to Modify:**

- `src/renderer/App.tsx` - Integrate ActivityLogPanel
- `src/renderer/styles/index.css` - Add activity log styles

### [ ] **D.3 - Activity Log State Management**

- [ ] D.3.1 Create useActivityLog hook
- [ ] D.3.2 Add activity log localStorage persistence
- [ ] D.3.3 Add activity log real-time updates
- [ ] D.3.4 Add activity log error handling
- [ ] D.3.5 Add activity log performance optimizations

**Files to Create:**

- `src/renderer/hooks/useActivityLog.ts` - Activity log hook
- `src/renderer/utils/activityLogStorage.ts` - localStorage utilities

### [ ] **D.4 - Activity Log Visual Design**

- [ ] D.4.1 Design activity log icons for different activity types
- [ ] D.4.2 Add activity log color coding (success=green, error=red, update=blue)
- [ ] D.4.3 Add activity log timestamp formatting
- [ ] D.4.4 Add activity log entry animations
- [ ] D.4.5 Add activity log Evidence Gate design compliance

---

## Phase E: Integration & Testing

### [ ] **E.1 - Component Testing**

- [ ] E.1.1 Create ActivityLogPanel component tests
- [ ] E.1.2 Create ActivityLogService unit tests
- [ ] E.1.3 Create ActivityLogRepo integration tests
- [ ] E.1.4 Create activity log IPC event tests
- [ ] E.1.5 Create activity log localStorage tests

**Files to Create:**

- `tests/test_phase_3_1_6_activity_log.mjs` - Comprehensive test suite

### [ ] **E.2 - Integration Testing**

- [ ] E.2.1 Test activity log with PRD import workflow
- [ ] E.2.2 Test activity log with transcript import workflow
- [ ] E.2.3 Test activity log with evidence score updates
- [ ] E.2.4 Test activity log with error scenarios
- [ ] E.2.5 Test activity log persistence across app restarts

### [ ] **E.3 - Performance Testing**

- [ ] E.3.1 Test activity log with high volume of activities
- [ ] E.3.2 Test activity log memory usage
- [ ] E.3.3 Test activity log database performance
- [ ] E.3.4 Test activity log UI responsiveness
- [ ] E.3.5 Test activity log cleanup/archival performance

### [ ] **E.4 - User Experience Testing**

- [ ] E.4.1 Test activity log keyboard navigation
- [ ] E.4.2 Test activity log screen reader compatibility
- [ ] E.4.3 Test activity log responsive design
- [ ] E.4.4 Test activity log dark/light mode
- [ ] E.4.5 Test activity log with real user workflows

---

## Technical Architecture

### Database Schema

```sql
-- Activity Log Table
CREATE TABLE activity_log (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL, -- 'import-success', 'import-error', 'score-update', etc.
  title TEXT NOT NULL,
  description TEXT,
  source TEXT, -- 'prd-import', 'transcript-import', 'evidence-score', etc.
  metadata TEXT, -- JSON metadata (file names, scores, errors, etc.)
  timestamp INTEGER NOT NULL,
  created_at INTEGER DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_activity_log_timestamp (timestamp),
  INDEX idx_activity_log_type (type),
  INDEX idx_activity_log_source (source)
);
```

### IPC Events

```typescript
// New IPC Events for Activity Log
'activity-log-updated': {
  entries: ActivityLogEntry[];
  totalCount: number;
  stats: ActivityLogStats;
};

'get-activity-log': {
  page?: number;
  limit?: number;
  filter?: ActivityLogFilter;
};

'activity-log-stats': {
  totalActivities: number;
  todayActivities: number;
  successRate: number;
  errorCount: number;
  lastActivity: Date;
};
```

### Component Architecture

```
ActivityLogPanel/
├── ActivityLogPanel.tsx (Main panel)
├── ActivityLogEntry.tsx (Individual entry)
├── ActivityLogFilters.tsx (Filter controls)
├── ActivityLogStats.tsx (Statistics)
└── ActivityLogEmpty.tsx (Empty state)
```

## Firebase Configuration Considerations

### Cloud Function Integration

- [ ] **F.1** - Add activity log events to Firebase Analytics
- [ ] **F.2** - Add activity log error tracking to Firebase Crashlytics
- [ ] **F.3** - Add activity log performance metrics to Firebase Performance
- [ ] **F.4** - Add activity log user engagement tracking

### Security Considerations

- [ ] **S.1** - Ensure activity log doesn't expose sensitive data
- [ ] **S.2** - Add activity log data encryption for sensitive operations
- [ ] **S.3** - Add activity log access control
- [ ] **S.4** - Add activity log audit trail

## Implementation Timeline

### Week 1: Foundation (Phases A & B)

- Database schema and migrations
- ActivityLogService implementation
- Service integration points

### Week 2: Communication (Phase C)

- IPC event architecture
- Real-time activity broadcasting
- Event handling optimization

### Week 3: UI Components (Phase D)

- ActivityLogPanel component
- State management and hooks
- Visual design and Evidence Gate compliance

### Week 4: Integration & Testing (Phase E)

- Component and integration testing
- Performance optimization
- User experience validation

## Success Criteria

### Functional Requirements

- [ ] Activity log captures all ingest successes, errors, and score updates
- [ ] Activity log panel displays activities in chronological order
- [ ] Activity log supports filtering and search
- [ ] Activity log persists across app restarts
- [ ] Activity log handles high volume of activities efficiently

### Non-Functional Requirements

- [ ] Activity log UI loads in <200ms
- [ ] Activity log supports 10,000+ entries without performance degradation
- [ ] Activity log panel is fully accessible (keyboard navigation, screen readers)
- [ ] Activity log complies with Evidence Gate design system
- [ ] Activity log handles errors gracefully

### Quality Assurance

- [ ] 100% test coverage for ActivityLogService
- [ ] 100% test coverage for ActivityLogPanel component
- [ ] Zero TypeScript errors
- [ ] Zero ESLint warnings
- [ ] All accessibility tests pass

---

## Risk Mitigation

### Technical Risks

- **Database Performance**: Use indexed queries and pagination
- **Memory Usage**: Implement activity log cleanup and archival
- **UI Responsiveness**: Use virtualization for large activity lists
- **Real-time Updates**: Implement event throttling and batching

### UX Risks

- **Information Overload**: Provide clear filtering and search
- **Visual Hierarchy**: Use consistent color coding and typography
- **Accessibility**: Ensure keyboard navigation and screen reader support
- **Performance**: Lazy load activity entries and optimize rendering

---

## Future Enhancements

### Phase 3.1.8 Integration

- [ ] Add "Interview Imported" activity log rows with persona evidence counts
- [ ] Integrate with Phase 3.1.8 activity log requirements
- [ ] Add activity log export to various formats (CSV, JSON, PDF)
- [ ] Add activity log analytics and insights

### Advanced Features

- [ ] Activity log search with full-text search
- [ ] Activity log clustering and categorization
- [ ] Activity log notifications and alerts
- [ ] Activity log integration with external systems (Slack, Linear, etc.)

This implementation plan provides a comprehensive roadmap for implementing Phase 3.1.6 Activity Log panel while maintaining compatibility with the existing Personyx architecture and the Evidence Gate design system.
