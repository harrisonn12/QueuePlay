import ast
from dotenv import load_dotenv
from fastapi import APIRouter
from GamerManagementService.src.databases.GamersDatabase import GamersDatabase
from GamerManagementService.src.databases.Gamer import Gamer
from GamerManagementService.GamerManagementService import GamerManagementService
from commons.adapters.SupabaseDatabaseAdapter import SupabaseDatabaseAdapter

load_dotenv()

router = APIRouter(
    prefix="/paymentDatabase",
    tags=["Payment Service: Supabase"],
    responses={404: {"description": "Not found"}}
)

databaseAdapter = SupabaseDatabaseAdapter()
gamersDatabase = GamersDatabase(databaseAdapter)
gamerManagementService = GamerManagementService(gamersDatabase)

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
        table = 'testingTable',
        fieldFilter="id",
        valueFilter=100,
        data = {"name":"this one was just changed"}
    ):
    data = ast.literal_eval(data) # for testing purposes need to delete
    
    return databaseAdapter.updateTable(table, fieldFilter, valueFilter, data)

@router.delete('/deleteData')
def deleteData(
        table = 'testingTable',
        field = 'name',
        data = 'this is a newName'
    ):
    return databaseAdapter.deleteData(table, field, data)

@router.post('/addGamer')
def insertGamer(gamer : Gamer):
    return gamersDatabase.addGamer(gamer)

@router.post('/getGamer')
def getGamer(gamerId : str):
    return gamersDatabase.getGamer(gamerId)

@router.post('/getGamers')
def getGamers():
    return gamersDatabase.getGamers()

@router.post('/addCouponToGamer')
def addCouponToGamer(couponId: str, gamerId: str):
    return gamersDatabase.addCouponToGamer(couponId, gamerId)

@router.post('/removeCouponToGamer')
def removeCouponToGamer(couponId: str, gamerId: str):
    return gamersDatabase.removeCouponFromGamer(couponId, gamerId)

@router.post('/getExpiringGamers')
def getGamersWithExpiringCoupons():
    return gamerManagementService.getGamersWithExpiringCoupons()