-- Create moveout_lists table
CREATE TABLE IF NOT EXISTS public.moveout_lists (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_by UUID NOT NULL,
    items JSONB NOT NULL DEFAULT '[]'::jsonb,
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'generated', 'completed')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_moveout_lists_created_by ON public.moveout_lists(created_by);
CREATE INDEX IF NOT EXISTS idx_moveout_lists_status ON public.moveout_lists(status);
CREATE INDEX IF NOT EXISTS idx_moveout_lists_created_at ON public.moveout_lists(created_at);

-- Enable RLS
ALTER TABLE public.moveout_lists ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
DROP POLICY IF EXISTS "Users can view their own moveout lists" ON public.moveout_lists;
CREATE POLICY "Users can view their own moveout lists" ON public.moveout_lists
    FOR SELECT USING (auth.uid() = created_by);

DROP POLICY IF EXISTS "Users can create moveout lists" ON public.moveout_lists;
CREATE POLICY "Users can create moveout lists" ON public.moveout_lists
    FOR INSERT WITH CHECK (auth.uid() = created_by);

DROP POLICY IF EXISTS "Users can update their own moveout lists" ON public.moveout_lists;
CREATE POLICY "Users can update their own moveout lists" ON public.moveout_lists
    FOR UPDATE USING (auth.uid() = created_by);

DROP POLICY IF EXISTS "Users can delete their own moveout lists" ON public.moveout_lists;
CREATE POLICY "Users can delete their own moveout lists" ON public.moveout_lists
    FOR DELETE USING (auth.uid() = created_by);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_moveout_lists_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at
DROP TRIGGER IF EXISTS update_moveout_lists_updated_at ON public.moveout_lists;
CREATE TRIGGER update_moveout_lists_updated_at
    BEFORE UPDATE ON public.moveout_lists
    FOR EACH ROW
    EXECUTE FUNCTION update_moveout_lists_updated_at();


