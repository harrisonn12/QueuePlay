from commons.adapters.DatabaseAdapter import DatabaseAdapter
from commons.adapters.SupabaseDatabaseAdapter import SupabaseDatabaseAdapter
from commons.enums.DatabaseType import DatabaseType
from pydantic import BaseModel
from typing import List, Optional

class ProductData(BaseModel):
    id: Optional[int] = None
    storeId: int
    name: str
    description: Optional[str] = None
    isActive: bool = True
    createdAt: Optional[str] = None
    updatedAt: Optional[str] = None

class ProductsDatabase(DatabaseAdapter):

    def __init__(self, supabaseDatabaseAdapter: SupabaseDatabaseAdapter):
        self.database = DatabaseType.COUPONS
        self.supabaseDatabase = supabaseDatabaseAdapter
        
        # Mapping from camelCase (backend) to snake_case (database)
        self.field_mapping = {
            'storeId': 'store_id',
            'isActive': 'is_active',
            'createdAt': 'created_at',
            'updatedAt': 'updated_at'
        }
        
        # Reverse mapping for converting database results back to camelCase
        self.reverse_field_mapping = {v: k for k, v in self.field_mapping.items()}
    
    def _convert_to_snake_case(self, data: dict) -> dict:
        """Convert camelCase keys to snake_case for database operations"""
        converted = {}
        for key, value in data.items():
            db_key = self.field_mapping.get(key, key)
            converted[db_key] = value
        return converted
    
    def _convert_from_snake_case(self, data: dict) -> dict:
        """Convert snake_case keys from database to camelCase for backend"""
        converted = {}
        for key, value in data.items():
            backend_key = self.reverse_field_mapping.get(key, key)
            converted[backend_key] = value
        return converted

    def getProductsByStore(self, storeId: int) -> List[ProductData]:
        """Get all active products for a specific store"""
        # Convert filter keys to snake_case
        filters = self._convert_to_snake_case({"storeId": storeId, "isActive": True})
        response = self.supabaseDatabase.queryTable(
            table="products",
            filters=filters
        )
        
        if response.data:
            # Convert each result back to camelCase
            camel_products = [self._convert_from_snake_case(product) for product in response.data]
            return [ProductData.model_validate(product) for product in camel_products]
        return []

    def createProduct(self, product_data: ProductData) -> ProductData:
        """Create a new product in the database"""
        product_dict = product_data.model_dump(exclude={'id', 'createdAt', 'updatedAt'})
        
        # Convert to snake_case for database
        db_dict = self._convert_to_snake_case(product_dict)
        response = self.supabaseDatabase.insertData("products", db_dict)
        
        if response.data:
            # Convert response back to camelCase
            camel_data = self._convert_from_snake_case(response.data[0])
            return ProductData.model_validate(camel_data)
        else:
            raise Exception("Failed to create product")

    def getProductById(self, productId: int) -> Optional[ProductData]:
        """Get a specific product by ID"""
        response = self.supabaseDatabase.queryTable(
            table="products",
            filters={"id": productId}
        )
        
        if response.data:
            # Convert response back to camelCase
            camel_data = self._convert_from_snake_case(response.data[0])
            return ProductData.model_validate(camel_data)
        return None

    def updateProduct(self, productId: int, product_data: ProductData) -> ProductData:
        """Update an existing product"""
        product_dict = product_data.model_dump(exclude={'id'})
        
        # Convert to snake_case for database
        db_dict = self._convert_to_snake_case(product_dict)
        response = self.supabaseDatabase.updateTable("products", "id", productId, db_dict)
        
        if response.data:
            # Convert response back to camelCase
            camel_data = self._convert_from_snake_case(response.data[0])
            return ProductData.model_validate(camel_data)
        else:
            raise Exception("Failed to update product")

    def deleteProduct(self, productId: int) -> bool:
        """Soft delete a product by setting isActive to false"""
        try:
            # Convert field name to snake_case
            update_data = self._convert_to_snake_case({"isActive": False})
            response = self.supabaseDatabase.updateTable("products", "id", productId, update_data)
            if response.error:
                return False
            return True
        except Exception as e:
            print(f"Exception during product delete: {e}")
            return False