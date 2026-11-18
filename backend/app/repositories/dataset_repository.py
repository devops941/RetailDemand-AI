from app.models.dataset import Dataset
from typing import Optional, List


class DatasetRepository:
    @staticmethod
    async def find_by_id(dataset_id: str) -> Optional[Dataset]:
        return await Dataset.get(dataset_id)

    @staticmethod
    async def find_by_user(user_id: str) -> List[Dataset]:
        return await Dataset.find(Dataset.uploaded_by == user_id).to_list()

    @staticmethod
    async def find_all() -> List[Dataset]:
        return await Dataset.find_all().to_list()

    @staticmethod
    async def create(dataset: Dataset) -> Dataset:
        await dataset.insert()
        return dataset

    @staticmethod
    async def update(dataset: Dataset) -> Dataset:
        await dataset.save()
        return dataset

    @staticmethod
    async def delete(dataset: Dataset):
        await dataset.delete()
