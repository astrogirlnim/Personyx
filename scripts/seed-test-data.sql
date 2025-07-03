-- Seed Test Evidence Data for Persona Score Differentiation Testing
-- This populates the database with mock evidence to demonstrate score differences

-- Insert personas
INSERT OR REPLACE INTO personas (id, name, description, primary_goal, main_pain_point, keywords, created_at, updated_at)
VALUES 
  ('solo_founder', 'Solo Founder', 'Independent entrepreneur building their first product with limited resources and time.', 'Ship MVP fast with minimal tooling overhead', 'Context switching between development and uncertain feature value', '["mvp","validation","lean startup","product-market fit","bootstrap","time to market","resource constraints","feature priority","user feedback","iteration speed"]', datetime('now'), datetime('now')),
  ('agency_marketer', 'Agency Marketer', 'Marketing professional at a digital agency managing multiple client campaigns.', 'Optimize funnels and deliver measurable client reporting', 'Copy iteration speed and proving return on investment', '["conversion optimization","funnel analysis","a/b testing","roi reporting","client management","campaign performance","lead generation","copywriting","analytics","attribution modeling"]', datetime('now'), datetime('now'));

-- Insert Solo Founder evidence (high importance, MVP/lean startup focused)
INSERT INTO evidence (id, persona_id, content, source, source_type, timestamp, tags, importance)
VALUES 
  ('evidence-solo-1', 'solo_founder', 'I need to validate my MVP quickly before running out of runway. Time to market is critical.', 'User Interview #1', 'interview', datetime('now', '-7 days'), '["mvp","validation","time to market"]', 9),
  ('evidence-solo-2', 'solo_founder', 'As a bootstrap founder, I cannot afford expensive tools. I need lean solutions that help me prioritize features.', 'Survey Response', 'interview', datetime('now', '-14 days'), '["bootstrap","lean startup","feature priority"]', 8),
  ('evidence-solo-3', 'solo_founder', 'Context switching between coding and business decisions is killing my productivity. I need faster feedback loops.', 'User Interview #2', 'interview', datetime('now', '-5 days'), '["context switching","feedback","productivity"]', 7),
  ('evidence-solo-4', 'solo_founder', 'Product-market fit is my #1 goal. Everything else is secondary until I achieve it.', 'Survey Response', 'interview', datetime('now', '-10 days'), '["product-market fit","validation"]', 9),
  ('evidence-solo-5', 'solo_founder', 'I waste too much time building features that users dont want. Need better user feedback before development.', 'User Interview #3', 'interview', datetime('now', '-3 days'), '["user feedback","feature priority","validation"]', 8),
  ('evidence-solo-6', 'solo_founder', 'Resource constraints mean I need to be very selective about which features to build first.', 'Survey Response', 'interview', datetime('now', '-12 days'), '["resource constraints","feature priority","mvp"]', 8);

-- Insert Agency Marketer evidence (high importance, conversion/ROI focused)  
INSERT INTO evidence (id, persona_id, content, source, source_type, timestamp, tags, importance)
VALUES
  ('evidence-agency-1', 'agency_marketer', 'ROI reporting is everything. Clients demand clear attribution and conversion tracking across all campaigns.', 'Client Meeting Notes', 'interview', datetime('now', '-8 days'), '["roi reporting","attribution","conversion tracking"]', 10),
  ('evidence-agency-2', 'agency_marketer', 'A/B testing copy variations takes too long. Need faster iteration tools to optimize funnels.', 'Team Standup', 'interview', datetime('now', '-6 days'), '["a/b testing","copywriting","funnel optimization"]', 8),
  ('evidence-agency-3', 'agency_marketer', 'Managing multiple client campaigns requires better analytics dashboards. Current tools are too slow.', 'Survey Response', 'interview', datetime('now', '-15 days'), '["client management","analytics","campaign performance"]', 7),
  ('evidence-agency-4', 'agency_marketer', 'Lead generation campaigns need better conversion optimization. Current funnel analysis is manual and time-consuming.', 'Client Meeting Notes', 'interview', datetime('now', '-4 days'), '["lead generation","conversion optimization","funnel analysis"]', 9),
  ('evidence-agency-5', 'agency_marketer', 'Attribution modeling across channels is our biggest pain point. Clients question spend effectiveness.', 'Survey Response', 'interview', datetime('now', '-9 days'), '["attribution modeling","campaign performance","roi reporting"]', 9),
  ('evidence-agency-6', 'agency_marketer', 'Copy iteration speed directly impacts campaign performance. We need faster testing workflows.', 'Team Meeting', 'interview', datetime('now', '-2 days'), '["copywriting","campaign performance","a/b testing"]', 8);

-- Verify the data was inserted
SELECT 'Personas created:' as info, COUNT(*) as count FROM personas
UNION ALL  
SELECT 'Solo Founder evidence:' as info, COUNT(*) as count FROM evidence WHERE persona_id = 'solo_founder'
UNION ALL
SELECT 'Agency Marketer evidence:' as info, COUNT(*) as count FROM evidence WHERE persona_id = 'agency_marketer'
UNION ALL
SELECT 'Total evidence:' as info, COUNT(*) as count FROM evidence; 