import ast
from fastapi import APIRouter
from PaymentService.adapters.DatabaseAdapter import DatabaseAdapter

router = APIRouter(
    prefix="/paymentDatabase",
    tags=["Payment Service: Supabase"],
    responses={404: {"description": "Not found"}}
)

databaseAdapter = DatabaseAdapter()

@router.get('/')
def getTable(table = 'testingTable'):
    return databaseAdapter.getTable(table)

@router.put('/insert')
def insertData(
        table = 'testingTable' ,
        data = {"name": "this is a newName"}
    ):
    data = ast.literal_eval(data) # for testing purposes need to delete
    return databaseAdapter.insertData(table, data)

@router.delete('/deleteData')
def deleteData(
        table = 'testingTable',
        field = 'name',
        data = 'this is a newName'
    ):
    return databaseAdapter.deleteData(table, field, data)