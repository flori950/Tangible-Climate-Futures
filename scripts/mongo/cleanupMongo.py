from utils import connect_mongo


def cleanup_mongo(mongoDB_url: str):
    """Perform cleanup logic"""
    collection = connect_mongo(mongoDB_url)
    try:
        collection.delete_many({})
        print("MongoDB collection cleaned up.")
    except Exception as e:
        print(f"Failed to cleanup MongoDB: {e}")
    finally:
        collection.database.client.close()
