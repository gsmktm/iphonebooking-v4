-- Additive bridge from the established inventory/ownership lifecycle to V3.
CREATE SEQUENCE "device_identity_number_seq";
ALTER TABLE "DeviceIdentity" ALTER COLUMN "canonicalId" SET DEFAULT 'DEVICE-IB-' || nextval('device_identity_number_seq')::text;
SELECT setval('device_identity_number_seq', GREATEST(COALESCE((SELECT MAX(substring("canonicalId" FROM '^DEVICE-IB-([0-9]+)$')::bigint) FROM "DeviceIdentity"), 0) + 1, 1), false);
ALTER TABLE "InventoryUnit" ADD COLUMN "stockId" TEXT;
ALTER TABLE "InventoryUnit" ADD CONSTRAINT "InventoryUnit_stockId_fkey" FOREIGN KEY ("stockId") REFERENCES "InventoryStock"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "DeviceIdentity" ADD COLUMN "unitId" TEXT;
CREATE UNIQUE INDEX "DeviceIdentity_unitId_key" ON "DeviceIdentity"("unitId");
ALTER TABLE "DeviceIdentity" ADD CONSTRAINT "DeviceIdentity_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "InventoryUnit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "DeviceEvent" ADD COLUMN "eventKey" TEXT, ADD COLUMN "customerVisible" BOOLEAN NOT NULL DEFAULT false;
CREATE UNIQUE INDEX "DeviceEvent_eventKey_key" ON "DeviceEvent"("eventKey");
-- Abort rather than merge possibly conflicting physical identities silently.
CREATE UNIQUE INDEX "IdentityLink_type_valueHash_key" ON "IdentityLink"("type", "valueHash");

UPDATE "InventoryUnit" u SET "stockId" = d."stockId" FROM (
 SELECT "variantId", MIN(id) AS "stockId" FROM "InventoryStock" GROUP BY "variantId" HAVING COUNT(*) = 1
) d WHERE u."variantId" = d."variantId";
-- Reuse any scaffold identity with the same registered serial digest.
UPDATE "DeviceIdentity" i SET "unitId" = u.id FROM "IdentityLink" l, "InventoryUnit" u
 WHERE l."deviceId" = i.id AND l.type = 'SERIAL' AND l."valueHash" = u."serialHash";
INSERT INTO "DeviceIdentity" (id, "unitId", "canonicalId", "productId", "variantId", status, "updatedAt")
 SELECT 'identity_' || u.id, u.id, 'DEVICE-IB-' || nextval('device_identity_number_seq')::text,
 v."productId", u."variantId", u.status, CURRENT_TIMESTAMP
 FROM "InventoryUnit" u JOIN "ProductVariant" v ON v.id = u."variantId"
 WHERE NOT EXISTS (SELECT 1 FROM "DeviceIdentity" i WHERE i."unitId" = u.id);
INSERT INTO "IdentityLink" (id, "deviceId", type, "valueHash", "valueLast4", source)
 SELECT 'serial_' || u.id, i.id, 'SERIAL', u."serialHash", u."serialLast4", 'INVENTORY_REGISTRY'
 FROM "InventoryUnit" u JOIN "DeviceIdentity" i ON i."unitId" = u.id
 ON CONFLICT (type, "valueHash") DO NOTHING;
INSERT INTO "DeviceEvent" (id, "deviceId", "eventKey", "eventType", actor, reference, metadata, "customerVisible")
 SELECT 'import_' || i.id, i.id, 'migration:' || i.id, 'RECORD_MIGRATED', 'system:migration', i."unitId",
 '{"source":"existing inventory; historical events not reconstructed"}'::jsonb, false
 FROM "DeviceIdentity" i WHERE i."unitId" IS NOT NULL;

CREATE FUNCTION reject_device_history_mutation() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN RAISE EXCEPTION 'Device history is append-only. Record a correction event instead.'; END;
$$;
CREATE TRIGGER "DeviceEvent_append_only" BEFORE UPDATE OR DELETE ON "DeviceEvent"
 FOR EACH ROW EXECUTE FUNCTION reject_device_history_mutation();
