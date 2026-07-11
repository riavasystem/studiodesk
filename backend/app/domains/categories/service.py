from sqlalchemy import select
from sqlalchemy.orm import Session

from app.domains.categories.models import Category
from app.domains.categories.schemas import CategoryCreate, CategoryUpdate


def get_category(db: Session, category_id: int) -> Category | None:
    return db.get(Category, category_id)


def get_category_by_name(db: Session, name: str) -> Category | None:
    return db.scalar(select(Category).where(Category.name == name))


def list_categories(db: Session, skip: int = 0, limit: int = 50) -> list[Category]:
    return list(db.scalars(select(Category).offset(skip).limit(limit)))


def create_category(db: Session, category_in: CategoryCreate) -> Category:
    category = Category(name=category_in.name)
    db.add(category)
    db.commit()
    db.refresh(category)
    return category


def update_category(db: Session, category: Category, category_in: CategoryUpdate) -> Category:
    category.name = category_in.name
    db.commit()
    db.refresh(category)
    return category


def delete_category(db: Session, category: Category) -> None:
    db.delete(category)
    db.commit()
