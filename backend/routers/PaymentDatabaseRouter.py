from fastapi import APIRouter
from PaymentService.adapters.DatabaseAdapter import DatabaseAdapter

router = APIRouter(
    prefix="/paymentDatabase",
    tags=["Payment Service: Database Adapter"],
    responses={404: {"description": "Not found"}}
)

databaseAdapter = DatabaseAdapter()