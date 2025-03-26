from fastapi import APIRouter
from PaymentService.adapters.DatabaseAdapter import DatabaseAdapter

router = APIRouter(
    prefix="/paymentDatabase",
    tags=["Payment Service: Supabase"],
    
    responses={404: {"description": "Not found"}}
)

databaseAdapter = DatabaseAdapter()

@router.get('/')
def getTable(table = 'membership'):
    return databaseAdapter.getTable(table)

@router.put('/insert')
def insertData(
        table = 'membership' ,
        data = {"tier_name": "super max ultra+",}
    ):
    return databaseAdapter.insertData(table, data)

@router.delete('/deleteData')
def deleteData(
        table = 'membership',
        field = 'tier_name',
        data = 'super max ultra+'
    ):
    return databaseAdapter.deleteData(table, field, data)