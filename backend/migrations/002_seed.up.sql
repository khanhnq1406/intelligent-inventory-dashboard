-- Seed dealerships
INSERT INTO dealerships (id, name, location) VALUES
    ('a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d', 'Metro Honda & Toyota', 'Los Angeles, CA'),
    ('b2c3d4e5-f6a7-4b8c-9d0e-1f2a3b4c5d6e', 'Elite European Motors', 'San Francisco, CA');

-- Seed vehicles for Metro Honda & Toyota (dealership 1)
-- Aging stock (stocked > 90 days ago)
INSERT INTO vehicles (id, dealership_id, make, model, year, vin, price, status, stocked_at) VALUES
    ('11111111-1111-4111-8111-111111111101', 'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d', 'Toyota', 'Camry', 2022, '1HGBH41JXMN109101', 24500.00, 'available', NOW() - INTERVAL '120 days'),
    ('11111111-1111-4111-8111-111111111102', 'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d', 'Honda', 'Civic', 2021, '2HGFC2F53MH501102', 19800.00, 'available', NOW() - INTERVAL '150 days'),
    ('11111111-1111-4111-8111-111111111103', 'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d', 'Toyota', 'RAV4', 2023, '2T3P1RFV5NW001103', 32000.00, 'available', NOW() - INTERVAL '105 days'),
    ('11111111-1111-4111-8111-111111111104', 'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d', 'Honda', 'Accord', 2020, '1HGCV1F34LA001104', 21500.00, 'reserved', NOW() - INTERVAL '200 days');

-- Recent stock (stocked < 90 days ago)
INSERT INTO vehicles (id, dealership_id, make, model, year, vin, price, status, stocked_at) VALUES
    ('11111111-1111-4111-8111-111111111105', 'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d', 'Toyota', 'Corolla', 2024, '2T1BURHE5RC001105', 23000.00, 'available', NOW() - INTERVAL '15 days'),
    ('11111111-1111-4111-8111-111111111106', 'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d', 'Honda', 'CR-V', 2024, '7FARW2H53RE001106', 35500.00, 'available', NOW() - INTERVAL '30 days'),
    ('11111111-1111-4111-8111-111111111107', 'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d', 'Toyota', 'Highlander', 2023, '5TDKK3DC5PS001107', 42000.00, 'sold', NOW() - INTERVAL '45 days'),
    ('11111111-1111-4111-8111-111111111108', 'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d', 'Honda', 'Pilot', 2024, '5FNYF6H92RB001108', 39800.00, 'available', NOW() - INTERVAL '10 days'),
    ('11111111-1111-4111-8111-111111111109', 'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d', 'Toyota', 'Tacoma', 2023, '3TMCZ5AN0PM001109', 36500.00, 'reserved', NOW() - INTERVAL '60 days'),
    ('11111111-1111-4111-8111-111111111110', 'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d', 'Honda', 'HR-V', 2024, '3CZRU6H31RM001110', 27500.00, 'sold', NOW() - INTERVAL '20 days');

-- Seed vehicles for Elite European Motors (dealership 2)
-- Aging stock
INSERT INTO vehicles (id, dealership_id, make, model, year, vin, price, status, stocked_at) VALUES
    ('22222222-2222-4222-8222-222222222201', 'b2c3d4e5-f6a7-4b8c-9d0e-1f2a3b4c5d6e', 'BMW', '3 Series', 2022, 'WBA5R1C55LA201201', 38900.00, 'available', NOW() - INTERVAL '130 days'),
    ('22222222-2222-4222-8222-222222222202', 'b2c3d4e5-f6a7-4b8c-9d0e-1f2a3b4c5d6e', 'Ford', 'Mustang', 2021, '1FA6P8TH5M5201202', 34500.00, 'available', NOW() - INTERVAL '95 days');

-- Recent stock
INSERT INTO vehicles (id, dealership_id, make, model, year, vin, price, status, stocked_at) VALUES
    ('22222222-2222-4222-8222-222222222203', 'b2c3d4e5-f6a7-4b8c-9d0e-1f2a3b4c5d6e', 'BMW', 'X5', 2024, '5UXCR6C05R9201203', 62000.00, 'available', NOW() - INTERVAL '25 days'),
    ('22222222-2222-4222-8222-222222222204', 'b2c3d4e5-f6a7-4b8c-9d0e-1f2a3b4c5d6e', 'Ford', 'F-150', 2024, '1FTEW1EP5RK201204', 55000.00, 'available', NOW() - INTERVAL '40 days'),
    ('22222222-2222-4222-8222-222222222205', 'b2c3d4e5-f6a7-4b8c-9d0e-1f2a3b4c5d6e', 'BMW', '5 Series', 2023, 'WBA53BH07PC201205', 52500.00, 'sold', NOW() - INTERVAL '70 days'),
    ('22222222-2222-4222-8222-222222222206', 'b2c3d4e5-f6a7-4b8c-9d0e-1f2a3b4c5d6e', 'Ford', 'Explorer', 2024, '1FMSK8DH5RG201206', 48000.00, 'reserved', NOW() - INTERVAL '35 days'),
    ('22222222-2222-4222-8222-222222222207', 'b2c3d4e5-f6a7-4b8c-9d0e-1f2a3b4c5d6e', 'BMW', 'X3', 2024, '5UX53DP09R9201207', 47500.00, 'available', NOW() - INTERVAL '5 days'),
    ('22222222-2222-4222-8222-222222222208', 'b2c3d4e5-f6a7-4b8c-9d0e-1f2a3b4c5d6e', 'Ford', 'Bronco', 2023, '1FMDE5BH5PL201208', 44000.00, 'available', NOW() - INTERVAL '50 days'),
    ('22222222-2222-4222-8222-222222222209', 'b2c3d4e5-f6a7-4b8c-9d0e-1f2a3b4c5d6e', 'BMW', 'Z4', 2022, 'WBAHF3C55SW201209', 75000.00, 'available', NOW() - INTERVAL '80 days'),
    ('22222222-2222-4222-8222-222222222210', 'b2c3d4e5-f6a7-4b8c-9d0e-1f2a3b4c5d6e', 'Ford', 'Maverick', 2024, '3FTTW8E37PR201210', 28000.00, 'sold', NOW() - INTERVAL '55 days');

-- Seed vehicle actions (on aging vehicles)
INSERT INTO vehicle_actions (id, vehicle_id, action_type, notes, created_by) VALUES
    ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaa001', '11111111-1111-4111-8111-111111111101', 'price_reduction', 'Reduced price by $2,000 to move aging Camry inventory', 'John Manager'),
    ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaa002', '11111111-1111-4111-8111-111111111101', 'marketing', 'Added to weekend sale flyer and website featured vehicles', 'Sarah Marketing'),
    ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaa003', '11111111-1111-4111-8111-111111111102', 'price_reduction', 'Reduced price by $1,500 — competitive analysis shows we are above market', 'John Manager'),
    ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaa004', '11111111-1111-4111-8111-111111111102', 'auction', 'Scheduled for dealer-only auction next Tuesday', 'Mike Sales'),
    ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaa005', '11111111-1111-4111-8111-111111111103', 'marketing', 'Featured in social media campaign targeting SUV buyers', 'Sarah Marketing'),
    ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaa006', '11111111-1111-4111-8111-111111111104', 'transfer', 'Initiating transfer to partner dealership in Sacramento', 'John Manager'),
    ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaa007', '11111111-1111-4111-8111-111111111104', 'wholesale', 'Wholesale offer received from Bay Area Auto Group — $18,500', 'Mike Sales'),
    ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaa008', '22222222-2222-4222-8222-222222222201', 'price_reduction', 'Reduced by $3,000 — sitting for over 4 months', 'Lisa Manager'),
    ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaa009', '22222222-2222-4222-8222-222222222201', 'marketing', 'Added to certified pre-owned promotion', 'Lisa Manager'),
    ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaa010', '22222222-2222-4222-8222-222222222202', 'price_reduction', 'Reduced by $2,500 to stay competitive with local inventory', 'Lisa Manager');
