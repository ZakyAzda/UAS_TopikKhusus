package services

import (
	"ecom-backend-go/config"
	"ecom-backend-go/models"
	"ecom-backend-go/repositories"
	"errors"
	"fmt"
	"strings"
	"time"
	"github.com/midtrans/midtrans-go"
	"github.com/midtrans/midtrans-go/snap"
)

type PaymentService struct {
	Repo repositories.PaymentRepository
}

type SnapTokenResult struct {
	SnapToken   string `json:"snap_token"`
	RedirectURL string `json:"redirect_url"`
	OrderID     string `json:"order_id"`
}

type WebhookPayload struct {
	OrderID           string `json:"order_id"`
	TransactionStatus string `json:"transaction_status"`
	FraudStatus       string `json:"fraud_status"`
	PaymentType       string `json:"payment_type"`
}

func (s *PaymentService) CreateSnapToken(userID string, orderID string) (SnapTokenResult, error) {
    order, err := s.Repo.GetOrderByIDAndUser(orderID, userID)
    if err != nil {
        return SnapTokenResult{}, err
    }

    if order.Status == "SELESAI" || order.Status == "PENGIRIMAN" {
        return SnapTokenResult{}, errors.New("order sudah dibayar atau sedang dikirim")
    }

    if order.SnapToken != "" && order.SnapTokenExpiredAt != nil {
        if time.Now().Before(*order.SnapTokenExpiredAt) {
            return SnapTokenResult{
                SnapToken: order.SnapToken,
                OrderID:   order.ID.Hex(),
            }, nil
        }
    }

    user, err := s.Repo.GetUserByID(userID)
    if err != nil {
        return SnapTokenResult{}, errors.New("gagal mengambil data user")
    }

    itemDetails := s.buildItemDetails(order.Items)

    expiredAt := time.Now().Add(23 * time.Hour) 

    snapReq := &snap.Request{
        TransactionDetails: midtrans.TransactionDetails{
            OrderID:  fmt.Sprintf("ORDER-%s-%d", order.ID.Hex(), expiredAt.Unix()),
            GrossAmt: int64(order.TotalAmount),
        },
        CustomerDetail: &midtrans.CustomerDetails{
            FName: user.Name,
            Email: user.Email,
            Phone: user.WhatsappNumber,
        },
        Items: &itemDetails,
    }

    snapResp, midErr := config.SnapClient.CreateTransaction(snapReq)
    if midErr != nil {
        return SnapTokenResult{}, fmt.Errorf("gagal membuat sesi pembayaran: %s", midErr.GetMessage())
    }

    if err := s.Repo.SaveSnapToken(order.ID.Hex(), snapResp.Token, expiredAt); err != nil {
        fmt.Printf("Warning: gagal menyimpan snap_token untuk order #%s: %v\n", order.ID.Hex(), err)
    }

    return SnapTokenResult{
        SnapToken:   snapResp.Token,
        RedirectURL: snapResp.RedirectURL,
        OrderID:     order.ID.Hex(),
    }, nil
}

func (s *PaymentService) HandleWebhook(payload WebhookPayload) error {
	internalOrderID := s.parseOrderID(payload.OrderID)
	if internalOrderID == "" {
		return fmt.Errorf("order_id tidak bisa diparsing: %s", payload.OrderID)
	}

	_, err := s.Repo.GetOrderByID(internalOrderID)
	if err != nil {
		return err
	}

	newStatus := s.resolveOrderStatus(payload.TransactionStatus, payload.FraudStatus)

	if err := s.Repo.UpdateOrderStatusAndPayment(internalOrderID, newStatus, payload.PaymentType); err != nil {
		return fmt.Errorf("gagal update status order #%s: %w", internalOrderID, err)
	}

	fmt.Printf("Order #%s diupdate → %s (tx_status: %s, payment: %s)\n",
		internalOrderID, newStatus, payload.TransactionStatus, payload.PaymentType)

	return nil
}

func (s *PaymentService) GetPaymentStatus(userID string, orderID string) (models.Order, error) {
	return s.Repo.GetOrderByIDAndUser(orderID, userID)
}

func (s *PaymentService) buildItemDetails(items []models.OrderItem) []midtrans.ItemDetails {
	var details []midtrans.ItemDetails
	for _, item := range items {
		details = append(details, midtrans.ItemDetails{
			ID:    fmt.Sprintf("PROD-%s", item.ProductID.Hex()),
			Name:  "Produk", 
			Price: int64(item.Price),
			Qty:   int32(item.Quantity),
		})
	}
	return details
}

func (s *PaymentService) parseOrderID(raw string) string {
	parts := strings.Split(raw, "-")
	if len(parts) == 3 && parts[0] == "ORDER" {
		return parts[1]
	}
	return raw
}

func (s *PaymentService) resolveOrderStatus(transactionStatus, fraudStatus string) string {
	switch transactionStatus {
	case "capture":
		if fraudStatus == "accept" {
			return "PENGIRIMAN"
		}
		return "BELUM_BAYAR"

	case "settlement":
		return "PENGIRIMAN"

	case "pending":
		return "BELUM_BAYAR"

	case "deny", "cancel", "expire", "refund":
		return "DIBATALKAN"

	default:
		return "BELUM_BAYAR"
	}
}

func (s *PaymentService) UpdateStatusAfterPayment(userID string, orderID string, status string) error {
	order, err := s.Repo.GetOrderByIDAndUser(orderID, userID)
	if err != nil {
		return err
	}

	if order.Status == "SELESAI" {
		return nil
	}

	return s.Repo.UpdateOrderStatusAndPayment(orderID, status, order.PaymentMethod)
}