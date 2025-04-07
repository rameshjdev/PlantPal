-- Create plants table
CREATE TABLE IF NOT EXISTS public.plants (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    species VARCHAR(255),
    other_names TEXT,
    image_url TEXT,
    care_level VARCHAR(50),
    light TEXT[],
    water VARCHAR(50),
    description TEXT,
    family VARCHAR(255),
    family_common_name VARCHAR(255),
    genus VARCHAR(255),
    data JSONB,
    user_id UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

-- Create an index on the user_id for faster queries
CREATE INDEX IF NOT EXISTS idx_plants_user_id ON public.plants(user_id);

-- Enable Row Level Security
ALTER TABLE public.plants ENABLE ROW LEVEL SECURITY;

-- Create policy to allow users to see only their own plants
CREATE POLICY "Users can view their own plants" ON public.plants
    FOR SELECT
    USING (auth.uid() = user_id);

-- Create policy to allow users to insert their own plants
CREATE POLICY "Users can insert their own plants" ON public.plants
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Create policy to allow users to update their own plants
CREATE POLICY "Users can update their own plants" ON public.plants
    FOR UPDATE
    USING (auth.uid() = user_id);

-- Create policy to allow users to delete their own plants
CREATE POLICY "Users can delete their own plants" ON public.plants
    FOR DELETE
    USING (auth.uid() = user_id);