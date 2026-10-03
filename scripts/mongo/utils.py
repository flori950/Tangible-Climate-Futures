import random

from pymongo import MongoClient

COLLECTION_NAME = "datafiles"
DEFAULT_DATABASE = "datastore"


def generate_coordinates():
    """Function to generate random coordinates within Berlin area"""
    longitude = random.uniform(13.0832, 13.7612)
    latitude = random.uniform(52.3381, 52.6755)
    return [longitude, latitude]


def connect_mongo(mongoDB_url: str):
    """Connect to mongo and return collection.

    The database is taken from the URL path (``mongodb://host:27017/<db>``);
    query options such as ``?authSource=admin`` are ignored for the name, and
    ``datastore`` is used when the URL has no database.
    Close the client with ``collection.database.client.close()`` when done.
    """
    client = MongoClient(mongoDB_url)
    db = client.get_default_database(DEFAULT_DATABASE)
    return db[COLLECTION_NAME]
