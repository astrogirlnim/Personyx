# Testing Guide: Phase 2.7 Automatic Persona Evolution

This guide provides comprehensive testing procedures for the newly implemented Automatic Persona Evolution feature.

## 🎯 **Testing Overview**

The Persona Evolution feature automatically analyzes interview transcripts and updates persona definitions when confidence thresholds are met. Here's how to test every aspect:

---

## 🚀 **1. Launch Application & Basic Setup**

### Start the Application

```bash
pnpm dev
```

### Verify Database Migration

Check that the `persona_history` table was created:

```bash
# Check if migration was applied
ls -la src/main/db/migrations/0003_persona_history_table.sql

# Verify the schema includes persona_history
grep -n "persona_history" src/main/db/schema.ts
```

---

## 📝 **2. Manual Testing Scenarios**

### **Test Scenario 1: Basic Persona Evolution Flow**

1. **Open the Personyx tray application**
   - Verify the main Evidence Gate interface loads correctly
   - Check that personas are visible in the personas card

2. **Create a test transcript with persona-relevant content:**

   ```markdown
   # Interview Transcript - Sarah Chen, Product Manager

   ## Goals and Objectives

   - My primary goal is to increase user engagement by 30% this quarter
   - I want to streamline the onboarding process to reduce drop-off rates
   - We need better analytics to understand user behavior patterns
   - Looking to implement real-time notifications for user actions

   ## Pain Points and Challenges

   - Current dashboard is too complex for new users
   - Takes too long to get actionable insights from data
   - Limited budget for new tools and integrations
   - Team communication issues when prioritizing features
   - Difficult to track user journey across multiple touchpoints

   ## Terminology and Keywords

   - User experience optimization
   - Conversion funnel analysis
   - Real-time dashboards
   - Cross-platform analytics
   - Behavioral segmentation
   ```

3. **Import the transcript via the Import Transcript modal**
   - Drag and drop or select the file
   - Monitor the processing progress
   - Wait for completion notification

4. **Expected Behavior:**
   - ✅ Success toast: "Transcript Analysed – evidence added"
   - ✅ Activity Log entry: "Interview Imported"
   - ✅ Evidence scores recalculated (if PRD exists)
   - ✅ **NEW**: If persona changes detected → "Persona Evolution Completed" activity log entry
   - ✅ **NEW**: If personas updated → Automatic persona reload without restart

### **Test Scenario 2: Persona Evolution Detection**

Create a transcript that specifically targets existing persona updates:

```markdown
# Strategic Interview - Alex Rodriguez, Solo Founder

## Current Goals (Updated)

- Bootstrap to $10k MRR within 6 months (previous: $5k)
- Build a lean team of 3 remote developers
- Focus on B2B SaaS market instead of B2C
- Implement automated customer onboarding

## New Pain Points

- Struggling with pricing strategy for enterprise clients
- Need better competitor analysis tools
- Cash flow management during growth phase
- Finding reliable freelance developers

## Technical Requirements

- API-first architecture for integrations
- Multi-tenant database design
- Automated billing and invoicing
- Advanced analytics and reporting
```

**Expected Evolution Behavior:**

- New keywords detected: "API-first", "multi-tenant", "automated billing"
- Goal changes: "$10k MRR" vs previous "$5k MRR"
- Pain point additions: "pricing strategy", "competitor analysis"
- If confidence ≥ 60% → Persona updated automatically
- If confidence ≥ 80% → Consider new persona creation (logged for review)

### **Test Scenario 3: Verify Evolution History**

1. **Check Database for History Records:**

   ```sql
   -- Open SQLite database and query
   SELECT * FROM persona_history
   ORDER BY timestamp DESC
   LIMIT 10;
   ```

2. **Verify Activity Log Integration:**
   - Open Activity Log panel
   - Look for "Persona Evolution Completed" entries
   - Check metadata includes persona IDs and change counts

---

## 🔍 **3. Database Verification Tests**

### Check Evolution Configuration

```typescript
// Verify thresholds in src/main/services/DeltaAnalyzer.ts
export const EVOLUTION_CONFIG = {
  deltaThreshold: 0.6, // 60% for updates
  newPersonaThreshold: 0.8, // 80% for new personas
  maxKeywords: 12, // Keyword limit
  minContentLength: 50, // Min content length
};
```

### Inspect Persona History Table

```sql
-- Structure verification
.schema persona_history

-- Sample queries
SELECT
  persona_id,
  change_type,
  confidence,
  datetime(timestamp/1000, 'unixepoch') as change_time
FROM persona_history
ORDER BY timestamp DESC;

-- Count changes by persona
SELECT
  persona_id,
  COUNT(*) as total_changes,
  AVG(confidence) as avg_confidence
FROM persona_history
GROUP BY persona_id;
```

---

## 📡 **4. IPC Event Testing**

### Monitor IPC Events in Browser DevTools

1. **Open Developer Tools** in the Electron app (View → Toggle Developer Tools)
2. **Watch Console for IPC Events:**
   ```javascript
   // Look for these console messages:
   '🧬 Persona evolved event received:';
   '✨ Personas evolved, triggering reload...';
   '📢 Emitted persona-evolved event';
   ```

### Test Event Structure

The `persona-evolved` event should contain:

```javascript
{
  personasUpdated: ["persona-id-1"],  // Array of updated persona IDs
  personasCreated: [],                // Array of new persona IDs
  totalChanges: 1,                    // Total number of changes
  timestamp: "2025-07-03T17:24:41.605Z" // ISO timestamp
}
```

---

## 🧪 **5. Advanced Testing Scenarios**

### **Test Evolution Thresholds**

1. **Low Confidence Content (< 60%):**

   ```markdown
   # Brief Interview - Minimal Content

   Just a quick chat about some basic needs.
   Maybe need better tools.
   ```

   **Expected:** No persona changes, logged for analytics

2. **Medium Confidence Content (60-79%):**

   ```markdown
   # Detailed Interview - Moderate Changes

   Clear discussion of updated goals and specific pain points
   that relate to existing personas but with moderate changes.
   ```

   **Expected:** Existing persona updated

3. **High Confidence Content (≥ 80%):**
   ```markdown
   # Comprehensive Interview - Significant New Insights

   Detailed discussion of completely new user type with
   distinct goals, pain points, and terminology not covered
   by existing personas.
   ```
   **Expected:** New persona creation consideration (logged for review)

### **Test Error Handling**

1. **Malformed Transcript Content:**
   - Empty files
   - Binary files
   - Very large files (>10MB)
2. **Database Connection Issues:**
   - Temporarily corrupt database
   - Full disk space
3. **Service Failures:**
   - LLM API unavailable (should fallback to heuristic analysis)
   - Embedding service timeout

---

## 📊 **6. Performance Testing**

### Load Testing

- Import 10+ transcripts in rapid succession
- Monitor memory usage and response times
- Verify evolution processing doesn't block UI

### Evolution Processing Time

- Single transcript: Target < 5 seconds
- Batch processing: Target < 30 seconds for 10 transcripts
- UI responsiveness maintained throughout

---

## ✅ **7. Success Criteria Checklist**

### Core Functionality

- [ ] Transcripts processed and evidence created
- [ ] Persona evolution analysis triggered automatically
- [ ] Changes detected when confidence thresholds met
- [ ] Persona definitions updated in database
- [ ] History records created for all changes
- [ ] Activity log entries created for evolution events

### UI Integration

- [ ] No application restart required after persona changes
- [ ] usePersonas hook automatically reloads updated personas
- [ ] Success toasts shown for completed evolution
- [ ] Activity log displays evolution events with metadata
- [ ] Error handling graceful with user feedback

### Data Integrity

- [ ] Persona history table populated correctly
- [ ] Original persona data preserved in previous_data field
- [ ] Change confidence scores recorded accurately
- [ ] Evidence scores recalculated after persona changes

### Performance & Reliability

- [ ] Evolution processing doesn't block UI
- [ ] Graceful fallback when LLM unavailable
- [ ] Memory usage reasonable during batch processing
- [ ] No data corruption or race conditions

---

## 🐛 **8. Troubleshooting Common Issues**

### Evolution Not Triggering

1. Check transcript content length (minimum 50 characters)
2. Verify EVOLUTION_CONFIG.enableEvolution = true
3. Look for error messages in console logs
4. Confirm database migration applied correctly

### Low Evolution Confidence

1. Transcript content may be too generic
2. Check existing persona keywords for overlap
3. Consider adjusting deltaThreshold for testing

### UI Not Updating

1. Verify IPC events emitted (check browser console)
2. Check usePersonas hook event listeners
3. Confirm PersonaManagerService.reload() called

### Database Issues

1. Run database migrations: `pnpm drizzle-kit push`
2. Check SQLite file permissions
3. Verify schema matches expectations

---

## 📚 **9. Quick Verification Commands**

```bash
# Check implementation completeness
pnpm typecheck                                    # No TypeScript errors
pnpm build                                        # Clean build
grep -r "persona-evolved" src/                    # IPC event references
ls src/main/db/migrations/0003_persona_history*   # Migration exists

# Database verification
sqlite3 personyx.db ".tables" | grep persona_history  # Table exists
sqlite3 personyx.db "SELECT COUNT(*) FROM persona_history;"  # History records

# Test file verification
node tests/test_phase_2_7_persona_evolution.mjs   # Structure tests
```

---

## 🎉 **Testing Complete!**

If all tests pass, the Phase 2.7 Automatic Persona Evolution feature is ready for production use. The system will automatically adapt persona definitions as new interview evidence emerges, providing a truly intelligent and evolving user insight platform.

For any issues or questions, refer to the troubleshooting section or check the comprehensive error logging in the Electron console.
