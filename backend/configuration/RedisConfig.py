import os
from enum import Enum
from commons.enums.Stage import Stage
from configuration.AppConfig import AppConfig

class RedisConfig:
    '''
    handles the redis configuration for the application.
    uses the AppConfig to get the stage and the environment variables to get the redis configuration.
    '''
    def __init__(self, stage=Stage.DEVO):
        self.appConfig = AppConfig(stage)

        # Default values
        self._host = "localhost"
        self._port = 6379
        self._db = 0
        self._password = None
        self._socketTimeout = 5

        # Try to load from environment variables
        self._loadFromEnv()

    def _loadFromEnv(self):
        """Load Redis configuration from environment variables"""
        # Check for Heroku Redis URL format first
        redis_url = os.environ.get("REDIS_URL")
        if redis_url:
            self._parseRedisUrl(redis_url)
        else:
            # Fall back to individual environment variables
            self._host = os.environ.get("REDIS_HOST", self._host)
            self._port = int(os.environ.get("REDIS_PORT", self._port))
            self._db = int(os.environ.get("REDIS_DB", self._db))
            self._password = os.environ.get("REDIS_PASSWORD", self._password)
            self._socketTimeout = int(os.environ.get("REDIS_SOCKET_TIMEOUT", self._socketTimeout))

    def _parseRedisUrl(self, redis_url):
        """Parse Redis URL format: redis://[:password@]host:port[/db]"""
        import urllib.parse
        parsed = urllib.parse.urlparse(redis_url)
        self._host = parsed.hostname or self._host
        self._port = parsed.port or self._port
        self._password = parsed.password or self._password
        if parsed.path and len(parsed.path) > 1:
            self._db = int(parsed.path[1:]) or self._db

    @property
    def host(self):
        return self._host

    @property
    def port(self):
        return self._port

    @property
    def db(self):
        return self._db

    @property
    def password(self):
        return self._password

    @property
    def socket_timeout(self):
        return self._socketTimeout

    def get_connection_params(self):
        """Get all connection parameters as a dictionary"""
        return {
            "host": self._host,
            "port": self._port,
            "db": self._db,
            "password": self._password,
            "socket_timeout": self._socketTimeout
        }

class RedisKeyPrefix(Enum):
    '''for caching'''
    CONNECTION = "conn"
    GAME = "game"
    PLAYER = "player"
    SESSION = "session"

class RedisChannelPrefix(Enum):
    '''for pub/sub'''
    GAME = "game"
    CONNECTION = "conn"
    SYSTEM = "system"
    LOBBY = "lobby"
