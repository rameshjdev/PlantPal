-- Insert sample plant data
INSERT INTO public.plants 
(name, species, other_names, image_url, care_level, light, water, description, family, family_common_name, genus, data, user_id)
VALUES
-- Snake Plant
('Snake Plant', 'Sansevieria trifasciata', ARRAY['Mother-in-law''s Tongue', 'Viper''s Bowstring Hemp'], 
'https://example.com/snake_plant.jpg', 'Easy',
ARRAY['Low Light', 'Indirect Light', 'Direct Light'],
'Low',
'A hardy succulent with stiff, upright leaves. Excellent air purifier and nearly indestructible.',
'Asparagaceae', 'Asparagus Family', 'Sansevieria',
'{"temperature_range": {"min": 60, "max": 85}, "humidity": "Low to moderate", "toxic_to_pets": true}'::jsonb,
'00000000-0000-0000-0000-000000000001'),

-- Monstera
('Monstera', 'Monstera deliciosa', ARRAY['Swiss Cheese Plant', 'Split-leaf Philodendron'],
'https://example.com/monstera.jpg', 'Moderate',
ARRAY['Bright Indirect Light'],
'Moderate',
'Tropical plant known for its distinctive split leaves and aerial roots.',
'Araceae', 'Arum Family', 'Monstera',
'{"temperature_range": {"min": 65, "max": 85}, "humidity": "High", "climbing": true}'::jsonb,
'00000000-0000-0000-0000-000000000001'),

-- Peace Lily
('Peace Lily', 'Spathiphyllum wallisii', ARRAY['Spath Lily', 'White Sail Plant'],
'https://example.com/peace_lily.jpg', 'Easy',
ARRAY['Low Light', 'Indirect Light'],
'Moderate',
'Elegant plant with glossy leaves and white flowers. Great air purifier.',
'Araceae', 'Arum Family', 'Spathiphyllum',
'{"temperature_range": {"min": 65, "max": 80}, "humidity": "High", "flowering": true}'::jsonb,
'00000000-0000-0000-0000-000000000001'),

-- Spider Plant
('Spider Plant', 'Chlorophytum comosum', ARRAY['Airplane Plant', 'Ribbon Plant'],
'https://example.com/spider_plant.jpg', 'Easy',
ARRAY['Bright Indirect Light'],
'Moderate',
'Fast-growing plant with arching leaves and plantlets that dangle like spiders.',
'Asparagaceae', 'Asparagus Family', 'Chlorophytum',
'{"temperature_range": {"min": 60, "max": 75}, "humidity": "Moderate", "propagation": "Plantlets"}'::jsonb,
'00000000-0000-0000-0000-000000000001'),

-- ZZ Plant
('ZZ Plant', 'Zamioculcas zamiifolia', ARRAY['Zanzibar Gem', 'Aroid Palm'],
'https://example.com/zz_plant.jpg', 'Easy',
ARRAY['Low Light', 'Indirect Light'],
'Low',
'Drought-tolerant plant with glossy, dark green leaves. Perfect for beginners.',
'Araceae', 'Arum Family', 'Zamioculcas',
'{"temperature_range": {"min": 65, "max": 85}, "humidity": "Low to moderate", "drought_tolerant": true}'::jsonb,
'00000000-0000-0000-0000-000000000001');