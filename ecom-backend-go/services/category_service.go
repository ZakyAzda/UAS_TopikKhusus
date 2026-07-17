package services

import (
	"ecom-backend-go/models"
	"ecom-backend-go/repositories"
)

type CategoryService struct {
	Repo repositories.CategoryRepository
}

func (s *CategoryService) GetAllCategories() ([]models.Category, error) {
	return s.Repo.GetAll()
}

func (s *CategoryService) CreateCategory(category models.Category) (models.Category, error) {
	err := s.Repo.Create(&category)
	return category, err
}

func (s *CategoryService) DeleteCategory(id string) error {
	return s.Repo.Delete(id)
}