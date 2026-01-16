-- Normalize existing gift card numbers by removing dashes and spaces
-- Migration: 20260117_normalize_gift_cards.sql

UPDATE public.gift_cards
SET card_number = REGEXP_REPLACE(card_number, '[^a-zA-Z0-9]', '', 'g')
WHERE card_number ~ '[^a-zA-Z0-9]';
