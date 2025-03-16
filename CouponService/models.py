from sqlalchemy import Column, String, Integer, Boolean, DateTime
from sqlalchemy.sql import func
from datetime import datetime

Base = declarative_base()

class Coupon(Base):
    __tablename__ = 'coupons'

    coupon_id = Column(String, primary_key=True)  # Unique identifier
    store_id = Column(Integer, nullable=False)  # Store that owns the coupon
    game_id = Column(Integer, nullable=False)  # Game that issued the coupon
    type = Column(String, nullable=False)  # BOGO, discount, free item
    value = Column(String, nullable=True)  # Discount value (e.g., "20%")
    product_id = Column(Integer, nullable=False)  # Product associated with coupon
    assigned_boolean = Column(Boolean, default=False)  # If coupon has been assigned
    gamer_id = Column(String, nullable=True)  # ID of the player who won
    created_at = Column(DateTime, default=func.now())  # Created timestamp (default to current time)
    expiration_date = Column(DateTime, nullable=False)  # Expiration date of the coupon
    

# Database Connection (PostgreSQL Example)
DATABASE_URL = "postgresql://user:password@localhost/coupon_db"
engine = create_engine(DATABASE_URL)

# Create tables
Base.metadata.create_all(engine)

# Create session
SessionLocal = sessionmaker(bind=engine)
session = SessionLocal()
