package services

import (
	"ecom-backend-go/models"
	"ecom-backend-go/repositories"
	"errors"
)

type ProductService struct {
	Repo repositories.ProductRepository
}

func (s *ProductService) GetAllProducts(search string, categoryId string) ([]models.Product, error) {
	return s.Repo.GetAll(search, categoryId)
}

func (s *ProductService) GetProductByID(id string) (models.Product, error) {
	product, err := s.Repo.GetByID(id)
	if err != nil {
		return product, errors.New("barangnya nggak ketemu lek")
	}
	return product, nil
}

func (s *ProductService) CreateProduct(input models.Product) (models.Product, error) {
	if input.Name == "" {
		return models.Product{}, errors.New("nama barang tidak boleh kosong")
	}
	err := s.Repo.Create(&input)
	return input, err
}

func (s *ProductService) UpdateProduct(id string, updateData map[string]interface{}) (models.Product, error) {
	// Cek dulu barangnya ada ga
	product, err := s.Repo.GetByID(id)
	if err != nil {
		return product, errors.New("barang nggak ketemu buat diupdate lek")
	}

	// Kalau ada, lakuin update pakai map
	err = s.Repo.Update(&product, updateData)
	
	// Panggil ulang biar dapet data yang udah di-refresh
	product, _ = s.Repo.GetByID(id)
	return product, err
}

func (s *ProductService) DeleteProduct(id string) error {
	// Cek dulu barangnya ada ga
	_, err := s.Repo.GetByID(id)
	if err != nil {
		return errors.New("barang nggak ketemu buat dihapus lek")
	}

	return s.Repo.Delete(id)
}