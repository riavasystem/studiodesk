from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.deps import get_current_superuser, get_current_user
from app.db.session import get_db
from app.domains.categories.schemas import CategoryCreate, CategoryRead, CategoryUpdate
from app.domains.categories.service import (
    create_category,
    delete_category,
    get_category,
    get_category_by_name,
    list_categories,
    update_category,
)
from app.domains.users.models import User

router = APIRouter(prefix="/categories", tags=["categories"])


@router.get("", response_model=list[CategoryRead])
def read_categories(
    db: Annotated[Session, Depends(get_db)],
    _: Annotated[User, Depends(get_current_user)],
    skip: int = 0,
    limit: int = 50,
):
    return list_categories(db, skip=skip, limit=limit)


@router.post("", response_model=CategoryRead, status_code=status.HTTP_201_CREATED)
def create_category_endpoint(
    category_in: CategoryCreate,
    db: Annotated[Session, Depends(get_db)],
    _: Annotated[User, Depends(get_current_superuser)],
):
    if get_category_by_name(db, category_in.name) is not None:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Ya existe una categoría con este nombre")
    return create_category(db, category_in)


@router.put("/{category_id}", response_model=CategoryRead)
def update_category_endpoint(
    category_id: int,
    category_in: CategoryUpdate,
    db: Annotated[Session, Depends(get_db)],
    _: Annotated[User, Depends(get_current_superuser)],
):
    category = get_category(db, category_id)
    if category is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Categoría no encontrada")
    return update_category(db, category, category_in)


@router.delete("/{category_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_category_endpoint(
    category_id: int,
    db: Annotated[Session, Depends(get_db)],
    _: Annotated[User, Depends(get_current_superuser)],
):
    category = get_category(db, category_id)
    if category is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Categoría no encontrada")
    delete_category(db, category)
