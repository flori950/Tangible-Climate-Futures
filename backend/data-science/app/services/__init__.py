from .data_processing_service import DataProcessingService

# Shared service instance used by the controllers
data_processing_service = DataProcessingService()

__all__ = ["DataProcessingService", "data_processing_service"]
