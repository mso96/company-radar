INSERT INTO app_config (key, value, updated_at)
VALUES (
  'agency_credit_packs',
  '[{"id":"credits-25","name":"Starter","credits":25,"pricePence":3750,"stripePriceId":"price_1U9147CQ5kTlNRIVytjjiHh5","active":true},{"id":"credits-100","name":"Growth","credits":100,"pricePence":15000,"stripePriceId":"price_1U9132CQ5kTlNRIVmFtnMoxA","active":true},{"id":"credits-500","name":"Scale","credits":500,"pricePence":75000,"stripePriceId":"price_1U914YCQ5kTlNRIVdTxQRgm6","active":true}]',
  datetime('now')
)
ON CONFLICT(key) DO UPDATE SET value=excluded.value, updated_at=excluded.updated_at;
