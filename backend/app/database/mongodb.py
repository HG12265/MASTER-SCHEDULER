from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase
from app.config.settings import get_settings
from app.utils.logger import get_logger

logger = get_logger(__name__)
settings = get_settings()


class MongoDB:
    client: AsyncIOMotorClient = None
    db: AsyncIOMotorDatabase = None


db_instance = MongoDB()


async def connect_to_mongo() -> None:
    """Initialize connection to MongoDB using Motor async client."""
    logger.info("Connecting to MongoDB at: %s", settings.MONGODB_URL)
    try:
        db_instance.client = AsyncIOMotorClient(
            settings.MONGODB_URL,
            serverSelectionTimeoutMS=3000
        )
        db_instance.db = db_instance.client[settings.DATABASE_NAME]
        # Verify connection by pinging
        await db_instance.client.admin.command("ping")
        logger.info("Successfully connected to MongoDB database '%s'", settings.DATABASE_NAME)
    except Exception as exc:
        logger.warning(
            "Could not connect to MongoDB (%s). The server will continue running, "
            "but database-dependent operations will require MongoDB to be started.",
            exc
        )


async def close_mongo_connection() -> None:
    """Close MongoDB connection gracefully."""
    if db_instance.client:
        logger.info("Closing MongoDB connection...")
        db_instance.client.close()
        logger.info("MongoDB connection closed.")


def get_database() -> AsyncIOMotorDatabase:
    """Dependency helper to get the active database instance."""
    return db_instance.db
