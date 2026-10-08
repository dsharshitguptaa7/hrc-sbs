-- ============================================================================
-- HARISH-CHANDRA RESEARCH CENTRE (HRC-SBS)
-- Chhatrapati Shahu Ji Maharaj University (CSJMU), Kanpur & IIT Kanpur
-- SUPABASE DATABASE SCHEMA & ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- 0. Enable UUID generation extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. ADMIN PROFILES TABLE (Tied to Supabase auth.users)
CREATE TABLE IF NOT EXISTS public.admin_profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('admin', 'editor')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 2. LECTURE SERIES TABLE (Unique year-wise container)
CREATE TABLE IF NOT EXISTS public.lecture_series (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    year INTEGER UNIQUE NOT NULL CHECK (year >= 1923 AND year <= 2100),
    title TEXT NOT NULL,
    description TEXT,
    theme TEXT,
    featured BOOLEAN NOT NULL DEFAULT false,
    published BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 3. SPEAKERS TABLE
CREATE TABLE IF NOT EXISTS public.speakers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    designation TEXT,
    institution TEXT,
    bio TEXT,
    photo_url TEXT,
    website_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 4. LECTURES TABLE
CREATE TABLE IF NOT EXISTS public.lectures (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    lecture_series_id UUID NOT NULL REFERENCES public.lecture_series(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    lecture_date DATE,
    venue TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 5. LECTURE SPEAKERS (Many-to-Many junction)
CREATE TABLE IF NOT EXISTS public.lecture_speakers (
    lecture_id UUID NOT NULL REFERENCES public.lectures(id) ON DELETE CASCADE,
    speaker_id UUID NOT NULL REFERENCES public.speakers(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    PRIMARY KEY (lecture_id, speaker_id)
);

-- 6. EVENTS TABLE
CREATE TABLE IF NOT EXISTS public.events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    description TEXT,
    event_date DATE NOT NULL,
    end_date DATE,
    location TEXT,
    category TEXT NOT NULL CHECK (category IN ('lecture', 'workshop', 'discussion', 'seminar', 'other')),
    image_url TEXT,
    registration_url TEXT,
    featured BOOLEAN NOT NULL DEFAULT false,
    published BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 7. POSTERS TABLE (Year-grouped)
CREATE TABLE IF NOT EXISTS public.posters (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    description TEXT,
    year INTEGER NOT NULL CHECK (year >= 1923 AND year <= 2100),
    category TEXT DEFAULT 'lecture',
    image_url TEXT NOT NULL,
    featured BOOLEAN NOT NULL DEFAULT false,
    published BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 8. GALLERY ALBUMS TABLE
CREATE TABLE IF NOT EXISTS public.gallery_albums (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    description TEXT,
    year INTEGER NOT NULL CHECK (year >= 1923 AND year <= 2100),
    event_id UUID REFERENCES public.events(id) ON DELETE SET NULL,
    cover_image_url TEXT,
    published BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 9. GALLERY IMAGES TABLE
CREATE TABLE IF NOT EXISTS public.gallery_images (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    album_id UUID NOT NULL REFERENCES public.gallery_albums(id) ON DELETE CASCADE,
    image_url TEXT NOT NULL,
    caption TEXT,
    alt_text TEXT,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 10. RESEARCH PAPERS TABLE (PDF upload supported)
CREATE TABLE IF NOT EXISTS public.research_papers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    authors TEXT NOT NULL,
    abstract TEXT,
    publication_year INTEGER NOT NULL,
    category TEXT NOT NULL,
    journal TEXT,
    doi TEXT,
    pdf_url TEXT,
    external_url TEXT,
    featured BOOLEAN NOT NULL DEFAULT false,
    published BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 11. EXHIBITION PROJECTS (The 12 Digital Legacy 2026 tracks)
CREATE TABLE IF NOT EXISTS public.exhibition_projects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    track_number INTEGER NOT NULL CHECK (track_number >= 1 AND track_number <= 12),
    title TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    short_description TEXT,
    long_description TEXT,
    student_name TEXT,
    team_name TEXT,
    year INTEGER NOT NULL DEFAULT 2026,
    course TEXT,
    thumbnail_url TEXT,
    project_url TEXT,
    featured BOOLEAN NOT NULL DEFAULT false,
    published BOOLEAN NOT NULL DEFAULT true,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Migration support for exhibition_projects
ALTER TABLE public.exhibition_projects
ADD COLUMN IF NOT EXISTS course TEXT;

-- 12. ANNOUNCEMENTS TABLE (Only active public announcements shown)
CREATE TABLE IF NOT EXISTS public.announcements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    description TEXT,
    link_url TEXT,
    start_date DATE NOT NULL DEFAULT CURRENT_DATE,
    end_date DATE,
    published BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 13. SITE SETTINGS TABLE (Key-Value or Singleton row)
CREATE TABLE IF NOT EXISTS public.site_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    key TEXT UNIQUE NOT NULL,
    value JSONB NOT NULL,
    description TEXT,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- ============================================================================
-- HELPER FUNCTIONS FOR SECURITY (Check if caller is Admin or Editor)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.is_admin_or_editor()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.admin_profiles
    WHERE id = auth.uid()
    AND role IN ('admin', 'editor')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- ENABLE ROW LEVEL SECURITY (RLS) ON ALL TABLES
-- ============================================================================
ALTER TABLE public.admin_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lecture_series ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.speakers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lectures ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lecture_speakers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.posters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gallery_albums ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gallery_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.research_papers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exhibition_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- RLS POLICIES: PUBLIC READ (PUBLISHED ONLY) & ADMIN FULL PRIVILEGES
-- ============================================================================

-- 1. admin_profiles
CREATE POLICY "Admins can view their own profile or all profiles"
    ON public.admin_profiles FOR SELECT
    USING (auth.uid() = id OR public.is_admin_or_editor());

CREATE POLICY "Admins can update their own profile"
    ON public.admin_profiles FOR UPDATE
    USING (auth.uid() = id OR public.is_admin_or_editor());

-- 2. lecture_series
CREATE POLICY "Public read published lecture series"
    ON public.lecture_series FOR SELECT
    USING (published = true OR public.is_admin_or_editor());

CREATE POLICY "Admin write lecture series"
    ON public.lecture_series FOR ALL
    USING (public.is_admin_or_editor())
    WITH CHECK (public.is_admin_or_editor());

-- 3. speakers
CREATE POLICY "Public read speakers"
    ON public.speakers FOR SELECT
    USING (true);

CREATE POLICY "Admin write speakers"
    ON public.speakers FOR ALL
    USING (public.is_admin_or_editor())
    WITH CHECK (public.is_admin_or_editor());

-- 4. lectures
CREATE POLICY "Public read lectures"
    ON public.lectures FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM public.lecture_series ls 
        WHERE ls.id = lectures.lecture_series_id AND (ls.published = true OR public.is_admin_or_editor())
    ));

CREATE POLICY "Admin write lectures"
    ON public.lectures FOR ALL
    USING (public.is_admin_or_editor())
    WITH CHECK (public.is_admin_or_editor());

-- 5. lecture_speakers
CREATE POLICY "Public read lecture speakers"
    ON public.lecture_speakers FOR SELECT
    USING (true);

CREATE POLICY "Admin write lecture speakers"
    ON public.lecture_speakers FOR ALL
    USING (public.is_admin_or_editor())
    WITH CHECK (public.is_admin_or_editor());

-- 6. events
CREATE POLICY "Public read published events"
    ON public.events FOR SELECT
    USING (published = true OR public.is_admin_or_editor());

CREATE POLICY "Admin write events"
    ON public.events FOR ALL
    USING (public.is_admin_or_editor())
    WITH CHECK (public.is_admin_or_editor());

-- 7. posters
CREATE POLICY "Public read published posters"
    ON public.posters FOR SELECT
    USING (published = true OR public.is_admin_or_editor());

CREATE POLICY "Admin write posters"
    ON public.posters FOR ALL
    USING (public.is_admin_or_editor())
    WITH CHECK (public.is_admin_or_editor());

-- 8. gallery_albums
CREATE POLICY "Public read published gallery albums"
    ON public.gallery_albums FOR SELECT
    USING (published = true OR public.is_admin_or_editor());

CREATE POLICY "Admin write gallery albums"
    ON public.gallery_albums FOR ALL
    USING (public.is_admin_or_editor())
    WITH CHECK (public.is_admin_or_editor());

-- 9. gallery_images
CREATE POLICY "Public read gallery images of published albums"
    ON public.gallery_images FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM public.gallery_albums ga 
        WHERE ga.id = gallery_images.album_id AND (ga.published = true OR public.is_admin_or_editor())
    ));

CREATE POLICY "Admin write gallery images"
    ON public.gallery_images FOR ALL
    USING (public.is_admin_or_editor())
    WITH CHECK (public.is_admin_or_editor());

-- 10. research_papers
CREATE POLICY "Public read published research papers"
    ON public.research_papers FOR SELECT
    USING (published = true OR public.is_admin_or_editor());

CREATE POLICY "Admin write research papers"
    ON public.research_papers FOR ALL
    USING (public.is_admin_or_editor())
    WITH CHECK (public.is_admin_or_editor());

-- 11. exhibition_projects
CREATE POLICY "Public read published exhibition projects"
    ON public.exhibition_projects FOR SELECT
    USING (published = true OR public.is_admin_or_editor());

CREATE POLICY "Admin write exhibition projects"
    ON public.exhibition_projects FOR ALL
    USING (public.is_admin_or_editor())
    WITH CHECK (public.is_admin_or_editor());

-- 12. announcements
CREATE POLICY "Public read active published announcements"
    ON public.announcements FOR SELECT
    USING (published = true OR public.is_admin_or_editor());

CREATE POLICY "Admin write announcements"
    ON public.announcements FOR ALL
    USING (public.is_admin_or_editor())
    WITH CHECK (public.is_admin_or_editor());

-- 13. site_settings
CREATE POLICY "Public read site settings"
    ON public.site_settings FOR SELECT
    USING (true);

CREATE POLICY "Admin write site settings"
    ON public.site_settings FOR ALL
    USING (public.is_admin_or_editor())
    WITH CHECK (public.is_admin_or_editor());

-- ============================================================================
-- STORAGE BUCKETS & RLS POLICIES (public-assets & research-papers)
-- ============================================================================
-- Run in Supabase SQL editor:
INSERT INTO storage.buckets (id, name, public) 
VALUES ('public-assets', 'public-assets', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public) 
VALUES ('research-papers', 'research-papers', true)
ON CONFLICT (id) DO NOTHING;

-- Public read for assets & papers
CREATE POLICY "Public can view assets"
    ON storage.objects FOR SELECT
    USING (bucket_id IN ('public-assets', 'research-papers'));

-- Admin upload/update/delete for storage
CREATE POLICY "Admin can upload files"
    ON storage.objects FOR INSERT
    WITH CHECK (
        bucket_id IN ('public-assets', 'research-papers') 
        AND (public.is_admin_or_editor())
    );

CREATE POLICY "Admin can update files"
    ON storage.objects FOR UPDATE
    USING (
        bucket_id IN ('public-assets', 'research-papers') 
        AND (public.is_admin_or_editor())
    );

CREATE POLICY "Admin can delete files"
    ON storage.objects FOR DELETE
    USING (
        bucket_id IN ('public-assets', 'research-papers') 
        AND (public.is_admin_or_editor())
    );
