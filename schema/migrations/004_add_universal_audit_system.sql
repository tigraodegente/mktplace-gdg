-- Migration: Universal Audit System
-- Date: 2024-06-02
-- Description: Adds audit_logs table for universal change tracking and supporting infrastructure

-- ==============================================
-- 1. AUDIT LOGS TABLE (Universal Change Tracking)
-- ==============================================
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Entity identification
    entity_type VARCHAR(50) NOT NULL, -- 'products', 'banners', 'users', etc.
    entity_id VARCHAR(100) NOT NULL, -- ID of the entity being tracked
    
    -- Action details
    action VARCHAR(20) NOT NULL CHECK (action IN ('create', 'update', 'delete', 'duplicate', 'restore', 'archive')),
    
    -- Change data
    changes JSONB, -- What actually changed (before/after)
    old_values JSONB, -- Complete old state (for rollback)
    new_values JSONB, -- Complete new state
    
    -- User context
    user_id UUID, -- Who made the change
    user_name VARCHAR(255), -- User name at time of change (for history)
    user_email VARCHAR(255), -- User email at time of change
    
    -- Request context
    ip_address INET, -- IP address of the request
    user_agent TEXT, -- Browser/client info
    session_id VARCHAR(255), -- Session ID for grouping
    
    -- Additional metadata
    metadata JSONB, -- Any additional context (source, reason, etc.)
    source VARCHAR(50) DEFAULT 'admin_panel', -- 'admin_panel', 'api', 'bulk_import', etc.
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Indexes for performance
    CONSTRAINT fk_audit_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

-- Indexes for optimal performance
CREATE INDEX IF NOT EXISTS idx_audit_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_user ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_created_at ON audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_source ON audit_logs(source);

-- Composite indexes for common queries
CREATE INDEX IF NOT EXISTS idx_audit_entity_date ON audit_logs(entity_type, entity_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_user_date ON audit_logs(user_id, created_at DESC);

-- ==============================================
-- 2. ENTITY CONFIGURATIONS TABLE
-- ==============================================
CREATE TABLE IF NOT EXISTS entity_configs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Entity identification
    entity_type VARCHAR(50) UNIQUE NOT NULL, -- 'products', 'banners', etc.
    
    -- Display configuration
    display_name VARCHAR(100) NOT NULL, -- 'Produto'
    display_name_plural VARCHAR(100) NOT NULL, -- 'Produtos'
    
    -- API configuration
    api_endpoint VARCHAR(200) NOT NULL, -- '/api/products'
    table_name VARCHAR(100) NOT NULL, -- 'products'
    primary_key VARCHAR(50) DEFAULT 'id', -- Primary key field name
    
    -- Features enabled
    features JSONB DEFAULT '{}', -- {"history": true, "duplicate": true, "archive": true}
    
    -- Duplication configuration
    duplication_config JSONB, -- Fields to exclude, transform, etc.
    
    -- Field mappings
    field_mappings JSONB DEFAULT '{}', -- Map internal fields to display fields
    
    -- UI configuration
    ui_config JSONB DEFAULT '{}', -- Specific UI behaviors
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Index for quick lookups
CREATE INDEX IF NOT EXISTS idx_entity_configs_type ON entity_configs(entity_type);

-- ==============================================
-- 3. AUDIT TRIGGERS SYSTEM
-- ==============================================

-- Function to automatically log changes
CREATE OR REPLACE FUNCTION log_entity_changes()
RETURNS TRIGGER AS $$
DECLARE
    entity_type_name VARCHAR(50);
    old_data JSONB;
    new_data JSONB;
    changes_data JSONB;
    action_type VARCHAR(20);
BEGIN
    -- Determine entity type from table name
    entity_type_name := TG_TABLE_NAME;
    
    -- Determine action type
    IF TG_OP = 'INSERT' THEN
        action_type := 'create';
        new_data := to_jsonb(NEW);
        old_data := NULL;
        changes_data := new_data;
    ELSIF TG_OP = 'UPDATE' THEN
        action_type := 'update';
        old_data := to_jsonb(OLD);
        new_data := to_jsonb(NEW);
        
        -- Calculate what actually changed
        changes_data := jsonb_build_object();
        FOR key IN SELECT jsonb_object_keys(new_data) LOOP
            IF old_data->>key IS DISTINCT FROM new_data->>key THEN
                changes_data := changes_data || jsonb_build_object(
                    key, jsonb_build_object(
                        'from', old_data->key,
                        'to', new_data->key
                    )
                );
            END IF;
        END LOOP;
        
        -- Skip if no actual changes
        IF changes_data = '{}'::jsonb THEN
            RETURN NULL;
        END IF;
    ELSIF TG_OP = 'DELETE' THEN
        action_type := 'delete';
        old_data := to_jsonb(OLD);
        new_data := NULL;
        changes_data := old_data;
    END IF;
    
    -- Insert audit log (user context will be added by application)
    INSERT INTO audit_logs (
        entity_type,
        entity_id,
        action,
        changes,
        old_values,
        new_values,
        created_at
    ) VALUES (
        entity_type_name,
        COALESCE(NEW.id::text, OLD.id::text),
        action_type,
        changes_data,
        old_data,
        new_data,
        CURRENT_TIMESTAMP
    );
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- ==============================================
-- 4. SEED ENTITY CONFIGURATIONS
-- ==============================================
INSERT INTO entity_configs (entity_type, display_name, display_name_plural, api_endpoint, table_name, features, duplication_config) VALUES 
('products', 'Produto', 'Produtos', '/api/products', 'products', 
 '{"history": true, "duplicate": true, "archive": true, "export": true}',
 '{"exclude_fields": ["id", "created_at", "updated_at"], "transform_fields": {"name": "{name} - Cópia", "sku": "{sku}-COPY-{timestamp}"}, "copy_relations": ["product_categories", "product_images", "product_options"]}'),

('banners', 'Banner', 'Banners', '/api/banners', 'banners',
 '{"history": true, "duplicate": true, "archive": true}',
 '{"exclude_fields": ["id", "created_at", "updated_at"], "transform_fields": {"title": "{title} - Cópia"}}'),

('users', 'Usuário', 'Usuários', '/api/users', 'users',
 '{"history": true, "archive": true}',
 '{"exclude_fields": ["id", "password", "created_at", "updated_at", "email"], "transform_fields": {"email": "{email}.copy"}}'),

('categories', 'Categoria', 'Categorias', '/api/categories', 'categories',
 '{"history": true, "duplicate": true}',
 '{"exclude_fields": ["id", "created_at", "updated_at"], "transform_fields": {"name": "{name} - Cópia", "slug": "{slug}-copy"}}'),

('orders', 'Pedido', 'Pedidos', '/api/orders', 'orders',
 '{"history": true, "export": true}',
 '{}')

ON CONFLICT (entity_type) DO UPDATE SET
    display_name = EXCLUDED.display_name,
    display_name_plural = EXCLUDED.display_name_plural,
    api_endpoint = EXCLUDED.api_endpoint,
    features = EXCLUDED.features,
    duplication_config = EXCLUDED.duplication_config,
    updated_at = CURRENT_TIMESTAMP;

-- ==============================================
-- 5. UTILITY FUNCTIONS
-- ==============================================

-- Function to get entity history
CREATE OR REPLACE FUNCTION get_entity_history(
    p_entity_type VARCHAR(50),
    p_entity_id VARCHAR(100),
    p_limit INT DEFAULT 50,
    p_offset INT DEFAULT 0
)
RETURNS TABLE (
    id UUID,
    action VARCHAR(20),
    changes JSONB,
    user_name VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        al.id,
        al.action,
        al.changes,
        al.user_name,
        al.created_at
    FROM audit_logs al
    WHERE al.entity_type = p_entity_type 
    AND al.entity_id = p_entity_id
    ORDER BY al.created_at DESC
    LIMIT p_limit OFFSET p_offset;
END;
$$ LANGUAGE plpgsql;

-- Function to get user activity summary
CREATE OR REPLACE FUNCTION get_user_activity_summary(
    p_user_id UUID,
    p_days INT DEFAULT 30
)
RETURNS TABLE (
    entity_type VARCHAR(50),
    action_count BIGINT,
    last_action TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        al.entity_type,
        COUNT(*) as action_count,
        MAX(al.created_at) as last_action
    FROM audit_logs al
    WHERE al.user_id = p_user_id 
    AND al.created_at >= CURRENT_TIMESTAMP - INTERVAL '%d days'
    GROUP BY al.entity_type
    ORDER BY action_count DESC;
END;
$$ LANGUAGE plpgsql;

-- ==============================================
-- 6. COMMENTS FOR DOCUMENTATION
-- ==============================================
COMMENT ON TABLE audit_logs IS 'Universal audit log for tracking all entity changes across the system';
COMMENT ON TABLE entity_configs IS 'Configuration for each entity type including features and duplication rules';
COMMENT ON FUNCTION log_entity_changes() IS 'Trigger function to automatically log entity changes';
COMMENT ON FUNCTION get_entity_history(VARCHAR, VARCHAR, INT, INT) IS 'Get change history for a specific entity';
COMMENT ON FUNCTION get_user_activity_summary(UUID, INT) IS 'Get user activity summary for the last N days'; 