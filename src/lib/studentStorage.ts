import { supabase } from './supabaseClient';

export interface StudentMistakeRecord {
  id?: string;
  student_id: string;
  type: 'grammar' | 'vocabulary' | 'sentence_formation' | 'pronunciation' | 'fluency' | 'general';
  original_text: string;
  correction: string;
  explanation: string;
  created_at?: string;
}

export interface StudentProfile {
  id: string;
  name: string;
  target_language: string;
  native_language: string;
  user_level: string;
  created_at?: string;
}

// In-Memory Storage fallback for offline / non-Supabase deployments
const inMemoryStudents: Map<string, StudentProfile> = new Map([
  [
    'default-student',
    {
      id: 'default-student',
      name: 'Student',
      target_language: 'English',
      native_language: 'English',
      user_level: 'intermediate',
    },
  ],
]);

const inMemoryMistakes: StudentMistakeRecord[] = [];

/**
 * Ensures student profile exists or creates default
 */
export async function getOrCreateStudentProfile(
  studentId: string = 'default-student',
  name: string = 'Student',
  targetLanguage: string = 'English',
  nativeLanguage: string = 'English'
): Promise<StudentProfile> {
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('students')
        .select('*')
        .eq('id', studentId)
        .maybeSingle();

      if (!error && data) {
        return data as StudentProfile;
      }

      // Insert if missing
      const newProfile: StudentProfile = {
        id: studentId,
        name,
        target_language: targetLanguage,
        native_language: nativeLanguage,
        user_level: 'intermediate',
      };

      const { data: created, error: insertErr } = await supabase
        .from('students')
        .insert(newProfile)
        .select()
        .single();

      if (!insertErr && created) {
        return created as StudentProfile;
      }
    } catch (err) {
      console.warn('[StudentStorage] Supabase profile query failed, using fallback:', err);
    }
  }

  // Fallback to in-memory
  let existing = inMemoryStudents.get(studentId);
  if (!existing) {
    existing = {
      id: studentId,
      name,
      target_language: targetLanguage,
      native_language: nativeLanguage,
      user_level: 'intermediate',
    };
    inMemoryStudents.set(studentId, existing);
  }
  return existing;
}

/**
 * Save new array of student mistakes to persistent storage
 */
export async function recordStudentMistakes(
  studentId: string,
  mistakes: Omit<StudentMistakeRecord, 'student_id'>[]
): Promise<void> {
  if (!mistakes || mistakes.length === 0) return;

  const recordsToInsert = mistakes.map((m) => ({
    student_id: studentId,
    type: m.type || 'grammar',
    original_text: m.original_text,
    correction: m.correction,
    explanation: m.explanation,
    created_at: new Date().toISOString(),
  }));

  // Store in memory first
  inMemoryMistakes.push(...recordsToInsert);

  // Attempt Supabase insert
  if (supabase) {
    try {
      const { error } = await supabase.from('mistakes').insert(recordsToInsert);
      if (error) {
        console.warn('[StudentStorage] Supabase mistake insert warning:', error.message);
      }
    } catch (err) {
      console.warn('[StudentStorage] Supabase exception during mistake record:', err);
    }
  }
}

/**
 * Retrieve recurring mistake history for a student
 */
export async function getStudentMistakes(
  studentId: string,
  limit: number = 20
): Promise<StudentMistakeRecord[]> {
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('mistakes')
        .select('*')
        .eq('student_id', studentId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (!error && data && data.length > 0) {
        return data as StudentMistakeRecord[];
      }
    } catch (err) {
      console.warn('[StudentStorage] Supabase fetch mistakes failed:', err);
    }
  }

  // Fallback memory search
  return inMemoryMistakes
    .filter((m) => m.student_id === studentId)
    .slice(-limit)
    .reverse();
}

/**
 * Builds a concise dynamic memory summary of the student's recurring mistakes
 * to inject into GPT-4o system prompt.
 */
export async function getStudentMistakeSummary(studentId: string): Promise<string> {
  const mistakes = await getStudentMistakes(studentId, 15);
  if (mistakes.length === 0) {
    return 'No prior recorded mistakes for this student.';
  }

  const categoryCounts: Record<string, number> = {};
  const recentExamples: string[] = [];

  for (const m of mistakes) {
    categoryCounts[m.type] = (categoryCounts[m.type] || 0) + 1;
    if (recentExamples.length < 5) {
      recentExamples.push(`"${m.original_text}" -> "${m.correction}" (${m.explanation})`);
    }
  }

  const breakdown = Object.entries(categoryCounts)
    .map(([cat, count]) => `${cat}: ${count}`)
    .join(', ');

  return `STUDENT RECURRING WEAKNESS MEMORY SUMMARY:
- Error Frequency Breakdown: ${breakdown}
- Top Recent Mistakes:
  ${recentExamples.map((ex, idx) => `${idx + 1}. ${ex}`).join('\n  ')}
Please gently monitor and target these persistent weakness areas during conversation.`;
}
