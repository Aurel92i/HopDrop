-- Migration: Update delivery confirmation deadline from 12h to 24h
-- This migration updates the comments in the schema (no actual database changes needed)
-- The CONFIRMATION_DELAY_HOURS constant in the code has been changed from 12 to 24

-- No database changes required as this is a code-level constant change
