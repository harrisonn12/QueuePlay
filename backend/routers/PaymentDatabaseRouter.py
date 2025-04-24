import ast
from dotenv import load_dotenv
from fastapi import APIRouter
from commons.adapters.SupabaseDatabaseAdapter import SupabaseDatabaseAdapter

load_dotenv()

router = APIRouter(
    prefix="/paymentDatabase",
    tags=["Payment Service: Supabase"],
    responses={404: {"description": "Not found"}}
)

databaseAdapter = SupabaseDatabaseAdapter()

@router.post('/insert')
def insertData(
        table = 'testingTable' ,
        data = {"name": "this is a newName"}
    ):
    data = ast.literal_eval(data)
    return databaseAdapter.insertData(table, data)

@router.get('/read')
def getTable(table = 'testingTable'):
    return databaseAdapter.getTable(table)

@router.put('/update')
def updateTable(
        table: str,
        fieldFilter: str = "id",
        valueFilter: int =100,
        data: dict = {"name":"this one was just changed"}
    ):
    data = ast.literal_eval(data) # for testing purposes need to delete
    
    return databaseAdapter.updateTable(table, fieldFilter, valueFilter, data)

@router.delete('/deleteData')
def deleteData(
        table: str = 'testingTable',
        field: str = 'name',
        data: str = 'this is a newName'
    ):
    return databaseAdapter.deleteData(table, field, data)