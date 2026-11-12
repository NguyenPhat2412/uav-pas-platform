ALTER TABLE media_assets ADD COLUMN confirmed boolean NOT NULL DEFAULT false;
ALTER TABLE media_assets ADD COLUMN confirmed_at timestamp(6);
ALTER TABLE inventory_movements ADD COLUMN request_id varchar(120);
CREATE UNIQUE INDEX uk_inventory_request_id ON inventory_movements(request_id);
ALTER TABLE media_assets ADD COLUMN deleted boolean NOT NULL DEFAULT false;
