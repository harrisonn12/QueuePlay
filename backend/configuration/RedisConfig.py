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
        self._ssl = False
        self._ssl_cert_reqs = None

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
            
            # Safely parse integer values with error handling
            try:
                self._port = int(os.environ.get("REDIS_PORT", self._port))
            except (ValueError, TypeError):
                self._port = 6379  # fallback to default
                
            try:
                self._db = int(os.environ.get("REDIS_DB", self._db))
            except (ValueError, TypeError):
                self._db = 0  # fallback to default
                
            self._password = os.environ.get("REDIS_PASSWORD", self._password)
            
            try:
                self._socketTimeout = int(os.environ.get("REDIS_SOCKET_TIMEOUT", self._socketTimeout))
            except (ValueError, TypeError):
                self._socketTimeout = 5  # fallback to default

    def _parseRedisUrl(self, redis_url):
        """Parse Redis URL format: redis://[:password@]host:port[/db] or rediss:// for SSL"""
        import urllib.parse
        import ssl
        
        parsed = urllib.parse.urlparse(redis_url)
        self._host = parsed.hostname
        self._port = parsed.port
        self._password = parsed.password
        
        # Handle database selection
        if parsed.path and len(parsed.path) > 1:
            self._db = int(parsed.path[1:])
        
        # Handle SSL/TLS for Heroku Redis (rediss:// scheme)
        if parsed.scheme == 'rediss':
            self._ssl = True
            self._ssl_cert_reqs = ssl.CERT_NONE  # Heroku Redis uses self-signed certificates
        else:
            self._ssl = False

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

    @property
    def ssl(self):
        return self._ssl

    @property
    def ssl_cert_reqs(self):
        return self._ssl_cert_reqs

    def get_connection_params(self):
        """Get all connection parameters as a dictionary"""
        params = {
            "host": self._host,
            "port": self._port,
            "db": self._db,
            "password": self._password,
            "socket_timeout": self._socketTimeout,
            # Ensure decode_responses is consistently set for async direct connections
            "decode_responses": True 
        }
        
        # Add SSL parameters if SSL is enabled
        if self._ssl:
            # Simplified SSL configuration - let redis-py handle the connection class automatically
            params["ssl"] = True
            if self._ssl_cert_reqs is not None:
                params["ssl_cert_reqs"] = self._ssl_cert_reqs
            
        return params

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
