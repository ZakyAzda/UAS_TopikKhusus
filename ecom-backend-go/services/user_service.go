package services

import (
	"ecom-backend-go/repositories"
	"errors"
	"fmt"

	"golang.org/x/crypto/bcrypt"
)

type UserService struct {
	Repo repositories.UserRepository
}

func (s *UserService) ChangePassword(userID string, currentPassword string, newPassword string) error {
	user, err := s.Repo.GetByID(userID)
	if err != nil {
		return errors.New("User tidak ditemukan")
	}

	fmt.Printf("DEBUG ChangePassword - userID: %s, passwordHash length: %d\n", userID, len(user.Password))

	if user.Password == "" {
		return errors.New("Gagal mengambil data password dari database")
	}

	if err := bcrypt.CompareHashAndPassword([]byte(user.Password), []byte(currentPassword)); err != nil {
		fmt.Printf("DEBUG bcrypt error: %v\n", err)
		return errors.New("Password lama salah")
	}

	hashed, err := bcrypt.GenerateFromPassword([]byte(newPassword), 10)
	if err != nil {
		return errors.New("Gagal memproses password baru")
	}

	return s.Repo.UpdatePassword(userID, string(hashed))
}