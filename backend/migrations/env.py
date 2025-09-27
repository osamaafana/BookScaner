from logging.config import fileConfig

from alembic import context
from app.config import settings
from app.db.models import Base
from sqlalchemy import engine_from_config, pool

# this is the Alembic Config object
config = context.config
fileConfig(config.config_file_name)

# Use direct connection string (bypassing security layer temporarily)
# Convert asyncpg SSL format back to psycopg2 format for migrations
migration_url = settings.POSTGRES_URL.replace("+asyncpg", "")
if "ssl=require" in migration_url:
    migration_url = migration_url.replace("ssl=require", "sslmode=require")
config.set_main_option("sqlalchemy.url", migration_url)

target_metadata = Base.metadata


def run_migrations_offline():
    context.configure(
        url=config.get_main_option("sqlalchemy.url"),
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )
    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online():
    connectable = engine_from_config(
        config.get_section(config.config_ini_section),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )
    with connectable.connect() as connection:
        context.configure(connection=connection, target_metadata=target_metadata)
        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
