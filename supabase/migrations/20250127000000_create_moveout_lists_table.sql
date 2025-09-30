-- Create moveout_lists table
CREATE TABLE public.moveout_lists (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    items JSONB NOT NULL DEFAULT '[]'::jsonb,
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'generated', 'completed')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index on created_by for faster queries
CREATE INDEX idx_moveout_lists_created_by ON public.moveout_lists(created_by);

-- Create index on status for filtering
CREATE INDEX idx_moveout_lists_status ON public.moveout_lists(status);

-- Create index on created_at for sorting
CREATE INDEX idx_moveout_lists_created_at ON public.moveout_lists(created_at);

-- Enable RLS
ALTER TABLE public.moveout_lists ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own moveout lists" ON public.moveout_lists
    FOR SELECT USING (auth.uid() = created_by);

CREATE POLICY "Users can create moveout lists" ON public.moveout_lists
    FOR INSERT WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update their own moveout lists" ON public.moveout_lists
    FOR UPDATE USING (auth.uid() = created_by);

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
CREATE TRIGGER update_moveout_lists_updated_at
    BEFORE UPDATE ON public.moveout_lists
    FOR EACH ROW
    EXECUTE FUNCTION update_moveout_lists_updated_at();



