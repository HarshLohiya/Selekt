input to the app
-- pg host
-- pg port
-- pg password
-- pg user
-- pg database



Tests

PGPASSWORD=random_dg_pass pg_dump -h localhost -p 5432 -U dg_user -d dg_local --schema-only > schema.sql



 PGPASSWORD=random_dg_pass pg_dump -h localhost -p 5432 -U dg_user -d dg_local --schema-only --no-privileges --no-owner --no-tablespaces --no-comments | grep -v '^--' > create_tables_v1.sql


  PGPASSWORD=random_dg_pass pg_dump -h localhost -p 5432 -U dg_user -d dg_local --schema-only --no-privileges --no-owner --no-tablespaces --no-comments | grep -v '^--' | grep -v '^$' > create_tables_v2.sql