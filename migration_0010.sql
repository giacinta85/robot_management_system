DO $$ BEGIN
    CREATE TYPE resourcelinktype AS ENUM ('motor_firmware', 'power_board', 'system_image');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS motor_firmware_versions (
    id UUID PRIMARY KEY,
    name VARCHAR(256) NOT NULL,
    machine_model VARCHAR(64),
    description TEXT,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS power_board_versions (
    id UUID PRIMARY KEY,
    name VARCHAR(256) NOT NULL,
    machine_model VARCHAR(64),
    description TEXT,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS system_image_versions (
    id UUID PRIMARY KEY,
    name VARCHAR(256) NOT NULL,
    machine_model VARCHAR(64),
    description TEXT,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS machine_resource_links (
    id UUID PRIMARY KEY,
    machine_id UUID NOT NULL REFERENCES machines(id) ON DELETE CASCADE,
    resource_type resourcelinktype NOT NULL,
    resource_id UUID NOT NULL,
    created_at TIMESTAMPTZ,
    CONSTRAINT uq_machine_resource_link UNIQUE (machine_id, resource_type, resource_id)
);

UPDATE alembic_version SET version_num = '0010';
