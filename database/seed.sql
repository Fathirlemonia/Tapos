-- DEMO catalog and business profile data only. No sales are represented here.
INSERT INTO roles (id, name, description) VALUES
  ('11111111-1111-1111-1111-111111111111', 'owner', 'Pemilik usaha'),
  ('22222222-2222-2222-2222-222222222222', 'cashier', 'Kasir operasional')
ON CONFLICT (name) DO NOTHING;

INSERT INTO business_profile (id, business_name, owner_name, phone, address) VALUES
  ('33333333-3333-3333-3333-333333333333', 'Warkop Meteora', 'Pemilik Warkop', '08123456789', 'Bandung, Indonesia')
ON CONFLICT (id) DO NOTHING;

INSERT INTO devices (id, device_name, device_type, status) VALUES
  ('13131313-1313-1313-1313-131313131313', 'Tablet Kasir Demo', 'cashier_tablet', 'online')
ON CONFLICT (id) DO NOTHING;

INSERT INTO categories (id, name, description) VALUES
  ('44444444-4444-4444-4444-444444444444', 'Minuman', 'Minuman dingin dan panas'),
  ('55555555-5555-5555-5555-555555555555', 'Makanan', 'Makanan ringan dan utama')
ON CONFLICT (name) DO NOTHING;

INSERT INTO products (id, category_id, name, price, sku, is_active) VALUES
  ('66666666-6666-6666-6666-666666666666', '44444444-4444-4444-4444-444444444444', 'Kopi Susu Meteora', 20000, 'KS-001', TRUE),
  ('77777777-7777-7777-7777-777777777777', '44444444-4444-4444-4444-444444444444', 'Es Kopi Aren', 20000, 'EKA-001', TRUE),
  ('88888888-8888-8888-8888-888888888888', '55555555-5555-5555-5555-555555555555', 'Mie Goreng', 20000, 'MG-001', TRUE),
  ('99999999-9999-9999-9999-999999999999', '44444444-4444-4444-4444-444444444444', 'Teh Tarik', 15000, 'TT-001', TRUE),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '55555555-5555-5555-5555-555555555555', 'Roti Bakar', 18000, 'RB-001', TRUE)
ON CONFLICT (sku) DO NOTHING;

INSERT INTO inventory (id, product_id, item_name, unit, quantity, min_quantity) VALUES
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '66666666-6666-6666-6666-666666666666', 'Biji kopi', 'kg', 4, 3),
  ('cccccccc-cccc-cccc-cccc-cccccccccccc', '77777777-7777-7777-7777-777777777777', 'Susu UHT', 'liter', 2, 5),
  ('dddddddd-dddd-dddd-dddd-dddddddddddd', '88888888-8888-8888-8888-888888888888', 'Mie instan', 'pcs', 24, 10),
  ('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Gula aren', 'kg', 1, 2)
ON CONFLICT (item_name) DO NOTHING;
