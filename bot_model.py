import uuid
from datetime import datetime
from typing import List, Dict, Optional
import json
import os
import logging
from azure.data.tables import TableServiceClient, TableClient
from azure.core.exceptions import ResourceExistsError

# Configure logging
logging.basicConfig(
    level=logging.DEBUG,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

class BotModel:
    """
    Handles CRUD operations for bots in Azure Table Storage.
    """
    def __init__(self):
        """Initialize the bot model with Azure Table Storage connection."""
        self.connection_string = os.environ.get("AZURE_STORAGE_CONNECTION_STRING")
        self.table_name = "botscollection"
        
        if not self.connection_string:
            logger.error("No storage connection string found in environment variables")
            raise ValueError("Storage connection string not found")
        
        # Ensure table exists
        self._create_table_if_not_exists()
        logger.info(f"Bot model initialized with table: {self.table_name}")

    def _create_table_if_not_exists(self):
        """Create the bots table if it doesn't exist."""
        try:
            service_client = TableServiceClient.from_connection_string(self.connection_string)
            service_client.create_table_if_not_exists(self.table_name)
            logger.info(f"Table {self.table_name} created or verified")
        except Exception as e:
            logger.error(f"Error creating table: {str(e)}")
            raise

    def _get_table_client(self):
        """Get a table client for the bots table."""
        try:
            service_client = TableServiceClient.from_connection_string(self.connection_string)
            return service_client.get_table_client(self.table_name)
        except Exception as e:
            logger.error(f"Error getting table client: {str(e)}")
            raise

    def create_bot(self, name: str, description: str = "", settings: Dict = None) -> Dict:
        """
        Create a new bot.
        
        Args:
            name: User-friendly name for the bot
            description: Optional bot description
            settings: Optional bot-specific settings
            
        Returns:
            Dict containing the created bot information
        """
        bot_id = str(uuid.uuid4())
        created_at = datetime.utcnow().isoformat()
        
        if settings is None:
            settings = {}
        
        # Create entity for Table Storage
        bot_entity = {
            "PartitionKey": "bot",
            "RowKey": bot_id,
            "name": name,
            "description": description,
            "created_at": created_at,
            "document_ids": json.dumps([]),  # Empty list of document IDs
            "settings": json.dumps(settings)
        }
        
        try:
            table_client = self._get_table_client()
            table_client.create_entity(bot_entity)
            logger.info(f"Bot created with ID: {bot_id}")
            
            # Return the bot information in a cleaner format
            return {
                "id": bot_id,
                "name": name,
                "description": description,
                "created_at": created_at,
                "document_ids": [],
                "settings": settings
            }
        except Exception as e:
            logger.error(f"Error creating bot: {str(e)}")
            raise

    def get_all_bots(self) -> List[Dict]:
        """
        Get all bots.
        
        Returns:
            List of all bots
        """
        try:
            table_client = self._get_table_client()
            bots = []
            
            # Query all entities with PartitionKey 'bot'
            query_filter = "PartitionKey eq 'bot'"
            entities = table_client.query_entities(query_filter)
            
            for entity in entities:
                bot = {
                    "id": entity["RowKey"],
                    "name": entity["name"],
                    "description": entity.get("description", ""),
                    "created_at": entity["created_at"],
                    "document_ids": json.loads(entity.get("document_ids", "[]")),
                    "settings": json.loads(entity.get("settings", "{}"))
                }
                bots.append(bot)
            
            logger.info(f"Retrieved {len(bots)} bots")
            return bots
        except Exception as e:
            logger.error(f"Error retrieving bots: {str(e)}")
            raise

    def get_bot(self, bot_id: str) -> Optional[Dict]:
        """
        Get a specific bot by ID.
        
        Args:
            bot_id: The ID of the bot to retrieve
            
        Returns:
            Bot information or None if not found
        """
        try:
            table_client = self._get_table_client()
            
            try:
                entity = table_client.get_entity("bot", bot_id)
                
                bot = {
                    "id": entity["RowKey"],
                    "name": entity["name"],
                    "description": entity.get("description", ""),
                    "created_at": entity["created_at"],
                    "document_ids": json.loads(entity.get("document_ids", "[]")),
                    "settings": json.loads(entity.get("settings", "{}"))
                }
                
                logger.info(f"Retrieved bot: {bot_id}")
                return bot
            except Exception as e:
                logger.warning(f"Bot not found: {bot_id}, {str(e)}")
                return None
                
        except Exception as e:
            logger.error(f"Error retrieving bot: {str(e)}")
            raise

    def update_bot(self, bot_id: str, name: str = None, description: str = None, 
                  settings: Dict = None) -> Optional[Dict]:
        """
        Update a bot's information.
        
        Args:
            bot_id: The ID of the bot to update
            name: New name (optional)
            description: New description (optional)
            settings: New settings (optional)
            
        Returns:
            Updated bot information or None if not found
        """
        try:
            table_client = self._get_table_client()
            
            try:
                # Get the current entity
                entity = table_client.get_entity("bot", bot_id)
                
                # Update fields if provided
                if name is not None:
                    entity["name"] = name
                
                if description is not None:
                    entity["description"] = description
                
                if settings is not None:
                    entity["settings"] = json.dumps(settings)
                
                # Update the entity in the table
                table_client.update_entity(entity)
                
                # Return the updated bot information
                updated_bot = {
                    "id": entity["RowKey"],
                    "name": entity["name"],
                    "description": entity.get("description", ""),
                    "created_at": entity["created_at"],
                    "document_ids": json.loads(entity.get("document_ids", "[]")),
                    "settings": json.loads(entity.get("settings", "{}"))
                }
                
                logger.info(f"Updated bot: {bot_id}")
                return updated_bot
            except Exception as e:
                logger.warning(f"Bot not found for update: {bot_id}, {str(e)}")
                return None
                
        except Exception as e:
            logger.error(f"Error updating bot: {str(e)}")
            raise

    def delete_bot(self, bot_id: str) -> bool:
        """
        Delete a bot.
        
        Args:
            bot_id: The ID of the bot to delete
            
        Returns:
            True if deletion was successful, False otherwise
        """
        try:
            table_client = self._get_table_client()
            
            try:
                # Delete the entity
                table_client.delete_entity("bot", bot_id)
                logger.info(f"Deleted bot: {bot_id}")
                return True
            except Exception as e:
                logger.warning(f"Bot not found for deletion: {bot_id}, {str(e)}")
                return False
                
        except Exception as e:
            logger.error(f"Error deleting bot: {str(e)}")
            raise

    def add_document_to_bot(self, bot_id: str, document_id: str) -> Optional[Dict]:
        """
        Add a document to a bot.
        
        Args:
            bot_id: The ID of the bot
            document_id: The ID of the document to add
            
        Returns:
            Updated bot information or None if bot not found
        """
        try:
            table_client = self._get_table_client()
            
            try:
                # Get the current entity
                entity = table_client.get_entity("bot", bot_id)
                
                # Get the current document IDs and add the new one
                document_ids = json.loads(entity.get("document_ids", "[]"))
                
                # Only add if not already present
                if document_id not in document_ids:
                    document_ids.append(document_id)
                    entity["document_ids"] = json.dumps(document_ids)
                    
                    # Update the entity in the table
                    table_client.update_entity(entity)
                    
                    logger.info(f"Added document {document_id} to bot {bot_id}")
                else:
                    logger.info(f"Document {document_id} already exists in bot {bot_id}")
                
                # Return the updated bot information
                updated_bot = {
                    "id": entity["RowKey"],
                    "name": entity["name"],
                    "description": entity.get("description", ""),
                    "created_at": entity["created_at"],
                    "document_ids": document_ids,
                    "settings": json.loads(entity.get("settings", "{}"))
                }
                
                return updated_bot
            except Exception as e:
                logger.warning(f"Bot not found when adding document: {bot_id}, {str(e)}")
                return None
                
        except Exception as e:
            logger.error(f"Error adding document to bot: {str(e)}")
            raise

    def remove_document_from_bot(self, bot_id: str, document_id: str) -> Optional[Dict]:
        """
        Remove a document from a bot.
        
        Args:
            bot_id: The ID of the bot
            document_id: The ID of the document to remove
            
        Returns:
            Updated bot information or None if bot not found
        """
        try:
            table_client = self._get_table_client()
            
            try:
                # Get the current entity
                entity = table_client.get_entity("bot", bot_id)
                
                # Get the current document IDs and remove the specified one
                document_ids = json.loads(entity.get("document_ids", "[]"))
                
                if document_id in document_ids:
                    document_ids.remove(document_id)
                    entity["document_ids"] = json.dumps(document_ids)
                    
                    # Update the entity in the table
                    table_client.update_entity(entity)
                    
                    logger.info(f"Removed document {document_id} from bot {bot_id}")
                else:
                    logger.info(f"Document {document_id} not found in bot {bot_id}")
                
                # Return the updated bot information
                updated_bot = {
                    "id": entity["RowKey"],
                    "name": entity["name"],
                    "description": entity.get("description", ""),
                    "created_at": entity["created_at"],
                    "document_ids": document_ids,
                    "settings": json.loads(entity.get("settings", "{}"))
                }
                
                return updated_bot
            except Exception as e:
                logger.warning(f"Bot not found when removing document: {bot_id}, {str(e)}")
                return None
                
        except Exception as e:
            logger.error(f"Error removing document from bot: {str(e)}")
            raise
