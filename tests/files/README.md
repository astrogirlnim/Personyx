# Test Files for Transcript Import Testing

This directory contains test files for Phase 3.1.5 - Import Interview Transcript Modal functionality.

## Test Files Overview

### 📋 **Valid Transcript Files**

#### `test_transcript_solo_founder.md` (3.2KB)

- **Purpose**: Tests Solo Founder persona classification
- **Content**: Comprehensive interview about PRD challenges, feature validation, and documentation workflow
- **Key phrases**: "scope creep", "scattered feedback", "GitHub issues", "validation"
- **Expected outcome**: Should match Solo Founder persona with high confidence

#### `test_transcript_agency_marketer.txt` (3.8KB)

- **Purpose**: Tests Agency Marketer persona classification and .txt file support
- **Content**: Interview about client management, campaign performance, and tool integration
- **Key phrases**: "conversion rates", "Monday.com", "client requirements", "CAC/LTV"
- **Expected outcome**: Should match Agency Marketer persona with high confidence

#### `test_transcript_special_chars.markdown` (2.1KB)

- **Purpose**: Tests Unicode/special character handling and .markdown extension
- **Content**: International product manager interview with multilingual content
- **Features**:
  - Special characters: ñ, ü, ç, etc.
  - Multiple languages: English, Spanish, German, Chinese, Japanese
  - Emojis and symbols: 🇧🇷, ®, ©, ™
- **Expected outcome**: Should process without encoding issues

### ❌ **Validation Test Files**

#### `test_transcript_empty.md` (0KB)

- **Purpose**: Tests empty file validation
- **Expected outcome**: Should show "File cannot be empty" error

### 🧪 **Test Scenarios**

## Manual Testing Workflow

### 1. **Basic Import Flow**

```bash
# In the Electron app:
1. Press Ctrl+T to open transcript modal
2. Drag test_transcript_solo_founder.md onto modal
3. Verify 5-stage progress indicator completes
4. Check that evidence scores update
```

### 2. **File Type Validation**

```bash
# Test different extensions:
- test_transcript_solo_founder.md ✅ Should work
- test_transcript_agency_marketer.txt ✅ Should work
- test_transcript_special_chars.markdown ✅ Should work
- test_transcript_empty.md ❌ Should show empty file error
```

### 3. **Persona Classification**

```bash
# Expected persona matches:
- solo_founder.md → Solo Founder persona
- agency_marketer.txt → Agency Marketer persona
- special_chars.markdown → Mixed/uncertain classification
```

### 4. **Edge Cases**

```bash
# Test special scenarios:
- Unicode characters (special_chars.markdown)
- Different file extensions (.md, .txt, .markdown)
- Empty files (empty.md)
```

## Automated Testing

Run the automated test suite:

```bash
node tests/test_phase_3_1_5_transcript_import.mjs
```

This will validate:

- File processing pipeline
- IPC event structure
- Evidence score integration
- UX flow scenarios

## File Properties

| File                                     | Size   | Extension | Persona Target  | Special Features        |
| ---------------------------------------- | ------ | --------- | --------------- | ----------------------- |
| `test_transcript_solo_founder.md`        | ~3.2KB | .md       | Solo Founder    | Comprehensive interview |
| `test_transcript_agency_marketer.txt`    | ~3.8KB | .txt      | Agency Marketer | Multi-client scenarios  |
| `test_transcript_special_chars.markdown` | ~2.1KB | .markdown | Mixed           | Unicode/multilingual    |
| `test_transcript_empty.md`               | 0KB    | .md       | N/A             | Validation testing      |

## Expected Outcomes

### ✅ **Success Cases**

- Files process through all 5 stages
- Evidence scores recalculated
- Success message shows filename and character count
- No console errors

### ❌ **Error Cases**

- Empty file: "File cannot be empty"
- Invalid extension: "Please select a valid transcript file"
- Oversized file: "File size must be less than 10MB"

## Usage in Development

### Quick Test Command

```bash
# Create and test with a simple file:
echo "Interview with user about PRD challenges" > /tmp/quick_test.md
# Then drag into the app
```

### Performance Testing

```bash
# Test with larger content:
cat test_transcript_*.md > /tmp/large_transcript.md
# Should still process under 10MB limit
```

## Adding New Test Files

When adding new test files:

1. Use descriptive filenames: `test_transcript_[persona]_[scenario].ext`
2. Include clear persona indicators in content
3. Add entry to this README
4. Test both success and failure scenarios
5. Verify encoding with special characters

---

**Note**: These files are used for both manual and automated testing of the transcript import functionality. They should not be deleted and are safe to commit to the repository.
