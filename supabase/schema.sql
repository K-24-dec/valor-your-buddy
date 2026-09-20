-- LIFE RPG — PostgreSQL Database Schema Migration & Row Level Security

-- 1. Characters Table
CREATE TABLE IF NOT EXISTS public.characters (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL DEFAULT 'Hero',
    level INT NOT NULL DEFAULT 1,
    xp INT NOT NULL DEFAULT 0,
    xp_to_next_level INT NOT NULL DEFAULT 100,
    gold INT NOT NULL DEFAULT 50,
    current_streak INT NOT NULL DEFAULT 0,
    longest_streak INT NOT NULL DEFAULT 0,
    last_quest_completed_at TIMESTAMPTZ,
    -- Attributes
    strength INT NOT NULL DEFAULT 10,
    intelligence INT NOT NULL DEFAULT 10,
    wisdom INT NOT NULL DEFAULT 10,
    agility INT NOT NULL DEFAULT 10,
    discipline INT NOT NULL DEFAULT 10,
    -- Equipped Cosmetics
    equipped_avatar TEXT DEFAULT 'avatar_cyber_hero',
    equipped_frame TEXT DEFAULT 'frame_neon_cyan',
    equipped_theme TEXT DEFAULT 'theme_dark_cyberpunk',
    equipped_title TEXT DEFAULT 'Novice Adventurer',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Quests Table
CREATE TABLE IF NOT EXISTS public.quests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    category TEXT NOT NULL,
    difficulty TEXT NOT NULL,
    due_date TIMESTAMPTZ,
    is_recurring BOOLEAN DEFAULT FALSE,
    recurring_frequency TEXT,
    -- Anti-Gaming & Timed Quest Fields
    is_timed BOOLEAN DEFAULT FALSE,
    started_at TIMESTAMPTZ,
    min_duration_seconds INT DEFAULT 0,
    completed BOOLEAN DEFAULT FALSE,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Quest Completions History (Chronicle)
CREATE TABLE IF NOT EXISTS public.quest_completions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    quest_id UUID REFERENCES public.quests(id) ON DELETE SET NULL,
    quest_title TEXT NOT NULL,
    category TEXT NOT NULL,
    difficulty TEXT NOT NULL,
    xp_awarded INT NOT NULL,
    gold_awarded INT NOT NULL,
    attribute_boosted TEXT NOT NULL,
    attribute_amount INT NOT NULL,
    -- Honesty Nudge & Proof Fields
    reflection_note TEXT,
    verified_via TEXT DEFAULT 'self_report',
    proof_url TEXT,
    completed_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Guild Market Items
CREATE TABLE IF NOT EXISTS public.market_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    type TEXT NOT NULL,
    rarity TEXT NOT NULL,
    cost INT NOT NULL,
    description TEXT NOT NULL,
    icon TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. User Inventory (Arsenal)
CREATE TABLE IF NOT EXISTS public.user_inventory (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    item_id UUID NOT NULL REFERENCES public.market_items(id) ON DELETE CASCADE,
    acquired_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, item_id)
);

-- 6. Achievements
CREATE TABLE IF NOT EXISTS public.achievements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    description TEXT NOT NULL,
    icon TEXT NOT NULL,
    category TEXT NOT NULL,
    rarity TEXT NOT NULL DEFAULT 'COMMON'
);

-- 7. User Achievements
CREATE TABLE IF NOT EXISTS public.user_achievements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    achievement_id UUID NOT NULL REFERENCES public.achievements(id) ON DELETE CASCADE,
    unlocked_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, achievement_id)
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.characters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quest_completions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_achievements ENABLE ROW LEVEL SECURITY;

-- RLS Policies (Users can only read & modify their own data)
CREATE POLICY "Users access own character" ON public.characters FOR ALL USING (auth.uid() = id);
CREATE POLICY "Users access own quests" ON public.quests FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users access own chronicle" ON public.quest_completions FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users access own inventory" ON public.user_inventory FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users access own achievements" ON public.user_achievements FOR ALL USING (auth.uid() = user_id);

-- 8. Students Profile Table
CREATE TABLE IF NOT EXISTS public.students (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL DEFAULT 'Student',
    target_language TEXT NOT NULL DEFAULT 'English',
    native_language TEXT NOT NULL DEFAULT 'English',
    user_level TEXT DEFAULT 'intermediate',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. Student Mistakes Persistent Log Table
CREATE TABLE IF NOT EXISTS public.mistakes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id TEXT NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    type TEXT NOT NULL,
    original_text TEXT NOT NULL,
    correction TEXT NOT NULL,
    explanation TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast lookup by student_id and timestamp
CREATE INDEX IF NOT EXISTS idx_mistakes_student_created ON public.mistakes (student_id, created_at DESC);

