from fastapi import APIRouter
from PaymentService.adapters.DatabaseAdapter import DatabaseAdapter

router = APIRouter(
    prefix="/paymentDatabase",
    tags=["Payment Service: Supabase"],
    
    responses={404: {"description": "Not found"}}
)

databaseAdapter = DatabaseAdapter()

@router.get('/')
def firstFetch():
    return databaseAdapter.firstFetch()