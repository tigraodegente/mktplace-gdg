DO $$
DECLARE
    r RECORD;
    count_result INTEGER;
BEGIN
    FOR r IN 
        SELECT tablename 
        FROM pg_tables 
        WHERE schemaname = 'public'
        ORDER BY tablename
    LOOP
        EXECUTE 'SELECT COUNT(*) FROM ' || quote_ident(r.tablename) INTO count_result;
        RAISE NOTICE '% : % registros', r.tablename, count_result;
    END LOOP;
END $$;
