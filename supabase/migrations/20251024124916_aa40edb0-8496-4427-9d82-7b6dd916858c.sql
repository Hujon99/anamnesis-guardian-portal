-- Add 'CISS-formulär' to the examination type enum
-- This allows CISS forms to be saved in the anamnes_forms table

ALTER TYPE "Synundersökning" ADD VALUE IF NOT EXISTS 'CISS-formulär';

-- Add 'ciss' as a lowercase alternative for consistency with the codebase
ALTER TYPE "Synundersökning" ADD VALUE IF NOT EXISTS 'ciss';

-- Add comment to document all valid values
COMMENT ON TYPE "Synundersökning" IS 'Valid examination types: Synundersökning, Körkortsundersökning, Linsundersökning, Allmän, CISS-formulär, ciss';