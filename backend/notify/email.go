package notify

import (
	"encoding/json"
	"fmt"
	"log"
	"net"
	"net/smtp"
	"os"
	"strings"
	"time"

	"portfoliopro-backend/database"
	"portfoliopro-backend/models"
)

type cartLine struct {
	ID    int     `json:"id"`
	Title string  `json:"title"`
	Price float64 `json:"price"`
}

func smtpConfigured() bool {
	return os.Getenv("SMTP_HOST") != "" && os.Getenv("SMTP_FROM") != ""
}

func adminNotifyEmail() string {
	if email := os.Getenv("ADMIN_EMAIL"); email != "" {
		return email
	}
	return os.Getenv("SMTP_FROM")
}

func siteURL() string {
	if url := os.Getenv("SITE_URL"); url != "" {
		return strings.TrimRight(url, "/")
	}
	return "http://localhost:5173"
}

func myProjectsURL() string {
	return siteURL() + "/my-projects"
}

func depositSLA(percent int) string {
	switch percent {
	case 100:
		return "คิวด่วน · เริ่มภายใน 1–2 วันทำการ"
	case 50:
		return "คิวปกติ · เริ่มภายใน 3–5 วันทำการ"
	case 30:
		return "คิวรอ · เริ่มภายใน 7–14 วันทำการ"
	default:
		return ""
	}
}

type projectNotifyInfo struct {
	ProjectID     uint
	ProjectTitle  string
	CustomerName  string
	CustomerEmail string
	OrderID       *uint
}

func loadProjectNotifyInfo(projectID uint) (projectNotifyInfo, error) {
	var project models.Project
	if err := database.DB.First(&project, projectID).Error; err != nil {
		return projectNotifyInfo{}, err
	}
	var user models.User
	if err := database.DB.First(&user, project.UserID).Error; err != nil {
		return projectNotifyInfo{}, err
	}
	return projectNotifyInfo{
		ProjectID:     project.ID,
		ProjectTitle:  project.Title,
		CustomerName:  user.Name,
		CustomerEmail: user.Email,
		OrderID:       project.OrderID,
	}, nil
}

func runAsync(label string, fn func() error) {
	go func() {
		if err := fn(); err != nil {
			log.Printf("[notify] %s: %v", label, err)
		}
	}()
}

// ContractSentAsync notifies customer that a contract is ready to accept.
func ContractSentAsync(projectID uint) {
	runAsync(fmt.Sprintf("contract sent project #%d", projectID), func() error {
		return ContractSent(projectID)
	})
}

func ContractSent(projectID uint) error {
	if !smtpConfigured() {
		log.Printf("[notify] SMTP not configured — skipped contract email for project #%d", projectID)
		return nil
	}
	info, err := loadProjectNotifyInfo(projectID)
	if err != nil {
		return err
	}
	if info.CustomerEmail == "" {
		return nil
	}

	subject := fmt.Sprintf("สัญญาพร้อมให้ยอมรับ — %s", info.ProjectTitle)
	body := fmt.Sprintf(`สวัสดีคุณ %s,

แอดมินได้ส่งสัญญาสำหรับงาน "%s" ให้คุณแล้ว
กรุณาเข้าสู่ระบบและกด "ยอมรับสัญญา" เพื่อเริ่มดำเนินการ

เปิดดูงานของฉัน: %s

PortfolioPro Studio
`, info.CustomerName, info.ProjectTitle, myProjectsURL())

	return sendMail([]string{info.CustomerEmail}, subject, body)
}

// DeliverySentAsync notifies customer that deliverables are ready.
func DeliverySentAsync(projectID uint) {
	runAsync(fmt.Sprintf("delivery sent project #%d", projectID), func() error {
		return DeliverySent(projectID)
	})
}

func DeliverySent(projectID uint) error {
	if !smtpConfigured() {
		log.Printf("[notify] SMTP not configured — skipped delivery email for project #%d", projectID)
		return nil
	}
	info, err := loadProjectNotifyInfo(projectID)
	if err != nil {
		return err
	}
	if info.CustomerEmail == "" {
		return nil
	}

	subject := fmt.Sprintf("งานพร้อมส่งมอบ — %s", info.ProjectTitle)
	body := fmt.Sprintf(`สวัสดีคุณ %s,

งาน "%s" พร้อมส่งมอบแล้ว
กรุณาเข้าสู่ระบบเพื่อดูลิงก์งานและกด "ยืนยันรับงานแล้ว"

เปิดดูงานของฉัน: %s

PortfolioPro Studio
`, info.CustomerName, info.ProjectTitle, myProjectsURL())

	return sendMail([]string{info.CustomerEmail}, subject, body)
}

// OrderBalancePaidAsync notifies customer when remaining balance is paid.
func OrderBalancePaidAsync(order models.Order) {
	runAsync(fmt.Sprintf("balance paid order #%d", order.ID), func() error {
		return OrderBalancePaid(order.ID)
	})
}

func OrderBalancePaid(orderID uint) error {
	if !smtpConfigured() {
		log.Printf("[notify] SMTP not configured — skipped balance email for order #%d", orderID)
		return nil
	}
	var order models.Order
	if err := database.DB.First(&order, orderID).Error; err != nil {
		return err
	}
	if order.CustomerEmail == "" {
		return nil
	}

	subject := fmt.Sprintf("ชำระยอดที่เหลือครบแล้ว #%d — PortfolioPro Studio", order.ID)
	body := fmt.Sprintf(`สวัสดีคุณ %s,

เราได้รับยอดที่เหลือครบแล้ว — ชำระรวม ฿%s
งานจะดำเนินการส่งมอบตามขั้นตอน

เปิดงานของฉัน: %s

PortfolioPro Studio
`, order.CustomerName, formatBaht(order.Total), myProjectsURL())

	return sendMail([]string{order.CustomerEmail}, subject, body)
}

// SlipSubmittedAsync tells admin a customer uploaded a payment slip.
func SlipSubmittedAsync(order models.Order) {
	runAsync(fmt.Sprintf("slip submitted order #%d", order.ID), func() error {
		if !smtpConfigured() {
			log.Printf("[notify] SMTP not configured — skipped slip email for order #%d", order.ID)
			return nil
		}
		admin := adminNotifyEmail()
		if admin == "" {
			return nil
		}
		amount := float64(order.AmountSatang) / 100
		if amount <= 0 {
			amount = order.Total
		}
		subject := fmt.Sprintf("[รอตรวจสลิป] #%d — ฿%s — %s", order.ID, formatBaht(amount), order.CustomerName)
		body := fmt.Sprintf(`ลูกค้าแนบสลิปโอนเงินแล้ว กรุณาเข้าตรวจในหลังบ้าน

ออเดอร์: #%d
ลูกค้า: %s <%s>
ยอดที่โอน: ฿%s
สถานะ: รอตรวจสอบสลิป

เปิดคำสั่งซื้อ: %s/admin/orders
`, order.ID, order.CustomerName, order.CustomerEmail, formatBaht(amount), siteURL())
		return sendMail([]string{admin}, subject, body)
	})
}

// OrderPaidAsync sends confirmation emails once per successful order.
func OrderPaidAsync(order models.Order) {
	go func() {
		if err := OrderPaid(order.ID); err != nil {
			log.Printf("[notify] order %d: %v", order.ID, err)
		}
	}()
}

func OrderPaid(orderID uint) error {
	now := time.Now()
	result := database.DB.Model(&models.Order{}).
		Where("id = ? AND status IN ? AND notified_at IS NULL", orderID, []string{"successful", "deposit_paid"}).
		Update("notified_at", now)
	if result.Error != nil {
		return result.Error
	}
	if result.RowsAffected == 0 {
		return nil
	}

	var order models.Order
	if err := database.DB.First(&order, orderID).Error; err != nil {
		return err
	}

	if !smtpConfigured() {
		log.Printf("[notify] SMTP not configured — skipped email for order #%d (customer=%s)", order.ID, order.CustomerEmail)
		return nil
	}

	items := formatItems(order.Items)
	paidAt := ""
	if order.PaidAt != nil {
		paidAt = order.PaidAt.Local().Format("2 Jan 2006 15:04")
	}
	discountLine := ""
	if order.DiscountAmount > 0 {
		discountLine = fmt.Sprintf("ยอดก่อนส่วนลด: ฿%s\nส่วนลด (%s): -฿%s\n", formatBaht(order.Subtotal), order.CouponCode, formatBaht(order.DiscountAmount))
	}

	customerSubject := fmt.Sprintf("ยืนยันการชำระเงิน #%d — PortfolioPro Studio", order.ID)
	balanceNote := ""
	if order.Status == "deposit_paid" && order.DepositPercent < 100 {
		balanceNote = fmt.Sprintf("มัดจำ %d%% ชำระแล้ว ฿%s · ยอดคงเหลือ ฿%s\n",
			order.DepositPercent, formatBaht(order.AmountPaid), formatBaht(order.Total-order.AmountPaid))
	}
	slaLine := ""
	if order.DepositPercent > 0 && order.DepositPercent < 100 {
		slaLine = fmt.Sprintf("คิวงาน: %s\n", depositSLA(order.DepositPercent))
	}
	step3 := "รอรับลิงก์งานเมื่อส่งมอบเสร็จ"
	if order.Status == "deposit_paid" {
		step3 = "ชำระยอดที่เหลือก่อนรับงานที่ส่งมอบ"
	}
	customerBody := fmt.Sprintf(`สวัสดีคุณ %s,

ขอบคุณที่สั่งซื้อบริการกับ PortfolioPro Studio
เราได้รับการชำระเงินเรียบร้อยแล้ว

หมายเลขออเดอร์: #%d
%sยอดรวมโปรเจกต: ฿%s
%sช่องทาง: %s
เวลาชำระ: %s
%s
รายการ:
%s

ขั้นตอนถัดไป:
1. เข้าหน้า "งานของฉัน" เพื่อดูสถานะโปรเจกต
2. รอแอดมินส่งสัญญา → กดยอมรับสัญญา
3. %s

เปิดงานของฉัน: %s

หากมีคำถาม ตอบกลับอีเมลนี้หรือติดต่อผ่าน Line ได้เลย

PortfolioPro Studio
`, order.CustomerName, order.ID, discountLine, formatBaht(order.Total), balanceNote,
		order.PaymentMethod, paidAt, slaLine, items, step3, myProjectsURL())

	adminSubject := fmt.Sprintf("[ออเดอร์ใหม่] #%d — ฿%s — %s", order.ID, formatBaht(order.Total), order.CustomerName)
	adminBody := fmt.Sprintf(`ออเดอร์ #%d ชำระเงินสำเร็จ

ลูกค้า: %s <%s>
%sยอดชำระ: ฿%s
ช่องทาง: %s
เวลา: %s

รายการ:
%s
`, order.ID, order.CustomerName, order.CustomerEmail, discountLine, formatBaht(order.Total),
		order.PaymentMethod, paidAt, items)

	if order.CustomerEmail != "" {
		if err := sendMail([]string{order.CustomerEmail}, customerSubject, customerBody); err != nil {
			log.Printf("[notify] customer email order #%d: %v", order.ID, err)
		}
	}
	if admin := adminNotifyEmail(); admin != "" {
		if err := sendMail([]string{admin}, adminSubject, adminBody); err != nil {
			log.Printf("[notify] admin email order #%d: %v", order.ID, err)
		}
	}
	return nil
}

func formatItems(raw string) string {
	var lines []cartLine
	if err := json.Unmarshal([]byte(raw), &lines); err != nil || len(lines) == 0 {
		return "- (ไม่พบรายการ)"
	}
	var b strings.Builder
	for _, line := range lines {
		fmt.Fprintf(&b, "- %s — ฿%s\n", line.Title, formatBaht(line.Price))
	}
	return strings.TrimSpace(b.String())
}

func formatBaht(amount float64) string {
	return fmt.Sprintf("%.0f", amount)
}

func sendMail(to []string, subject, body string) error {
	host := os.Getenv("SMTP_HOST")
	port := os.Getenv("SMTP_PORT")
	if port == "" {
		port = "587"
	}
	from := os.Getenv("SMTP_FROM")
	user := os.Getenv("SMTP_USER")
	pass := os.Getenv("SMTP_PASSWORD")

	addr := net.JoinHostPort(host, port)
	msg := []byte("From: " + from + "\r\n" +
		"To: " + strings.Join(to, ", ") + "\r\n" +
		"Subject: " + subject + "\r\n" +
		"MIME-Version: 1.0\r\n" +
		"Content-Type: text/plain; charset=UTF-8\r\n" +
		"\r\n" + body + "\r\n")

	var auth smtp.Auth
	if user != "" {
		auth = smtp.PlainAuth("", user, pass, host)
	}
	return smtp.SendMail(addr, auth, from, to, msg)
}
