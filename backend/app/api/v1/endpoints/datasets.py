from fastapi import APIRouter, Depends, UploadFile, File, Form, HTTPException, BackgroundTasks
from app.api.dependencies import get_current_user, require_analyst_or_admin
from app.models.user import User
from app.services.dataset_service import DatasetService
from app.schemas.common import APIResponse

router = APIRouter()


@router.post("/upload", response_model=APIResponse)
async def upload_dataset(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    name: str = Form(...),
    current_user: User = Depends(require_analyst_or_admin)
):
    dataset = await DatasetService.upload(file, name, str(current_user.id))
    return APIResponse(success=True, message="Dataset uploaded successfully", data={"id": str(dataset.id), "name": dataset.name, "status": dataset.status})


@router.get("/", response_model=APIResponse)
async def list_datasets(current_user: User = Depends(get_current_user)):
    datasets = await DatasetService.list_datasets(str(current_user.id), current_user.role)
    return APIResponse(success=True, data=datasets)


@router.get("/{dataset_id}", response_model=APIResponse)
async def get_dataset(dataset_id: str, current_user: User = Depends(get_current_user)):
    dataset = await DatasetService.get_dataset(dataset_id, str(current_user.id))
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found")
    return APIResponse(success=True, data=dataset)


@router.delete("/{dataset_id}", response_model=APIResponse)
async def delete_dataset(dataset_id: str, current_user: User = Depends(require_analyst_or_admin)):
    await DatasetService.delete_dataset(dataset_id, str(current_user.id), current_user.role)
    return APIResponse(success=True, message="Dataset deleted")


@router.post("/{dataset_id}/validate", response_model=APIResponse)
async def validate_dataset(dataset_id: str, background_tasks: BackgroundTasks, current_user: User = Depends(require_analyst_or_admin)):
    result = await DatasetService.validate_dataset(dataset_id, str(current_user.id))
    return APIResponse(success=True, message="Validation complete", data=result)


@router.post("/{dataset_id}/process", response_model=APIResponse)
async def process_dataset(dataset_id: str, background_tasks: BackgroundTasks, current_user: User = Depends(require_analyst_or_admin)):
    result = await DatasetService.process_dataset(dataset_id, str(current_user.id))
    return APIResponse(success=True, message="Processing complete", data=result)
