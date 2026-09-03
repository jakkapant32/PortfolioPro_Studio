package handlers

import (
	"encoding/json"
	"net/http"
	"strconv"
	"strings"
	"time"

	"portfoliopro-backend/database"
	"portfoliopro-backend/models"
	"portfoliopro-backend/notify"

	"github.com/gin-gonic/gin"
)

type deliveryLink struct {
	Label string `json:"label"`
	URL   string `json:"url"`
}

func defaultContractContent(title string) string {
	return `สัญญาจ้างทำ "` + title + `"

1. ผู้ว่าจ้าง (ลูกค้า) ตกลงชำระค่าบริการตามใบสั่งซื้อ
2. ผู้รับจ้าง (PortfolioPro Studio) จะดำเนินการตามขอบเขตงานที่ตกลง
3. เมื่อส่งมอบงานแล้ว ลูกค้าได้รับสิทธิ์เป็นเจ้าของงานตามที่ระบุในแพ็กเกจ
4. รอบแก้ไขและเงื่อนไขอื่นๆ เป็นไปตามแพ็กเกจบริการที่เลือก

โปรดอ่านและกด "ยอมรับสัญญา" เพื่อเริ่มดำเนินการ`
}

func ensureProjectForOrder(order *models.Order) {
	if order == nil || (order.Status != "successful" && order.Status != "deposit_paid") {
		return
	}
	var existing models.Project
	if err := database.DB.Where("order_id = ?", order.ID).First(&existing).Error; err == nil {
		return
	}

	title := "โปรเจกตจากออเดอร์ #" + strconv.FormatUint(uint64(order.ID), 10)
	var items []CartItem
	if err := json.Unmarshal([]byte(order.Items), &items); err == nil && len(items) > 0 {
		title = items[0].Title
		if len(items) > 1 {
			title += " (+ " + strconv.Itoa(len(items)-1) + " รายการ)"
		}
	}

	project := models.Project{
		OrderID:        &order.ID,
		UserID:         order.UserID,
		Title:          title,
		Status:         models.ProjectStatusPending,
		DepositPercent: order.DepositPercent,
	}
	if err := database.DB.Create(&project).Error; err != nil {
		return
	}

	contract := models.Contract{
		ProjectID: project.ID,
		Title:     "สัญญาจ้างทำบริการ — " + project.Title,
		Content:   defaultContractContent(project.Title),
		Version:   1,
		Status:    models.ContractStatusDraft,
	}
	database.DB.Create(&contract)
}

func mapProjectListItem(p models.Project, userName, userEmail string) gin.H {
	item := gin.H{
		"id": p.ID, "order_id": p.OrderID, "user_id": p.UserID,
		"title": p.Title, "status": p.Status, "admin_note": p.AdminNote,
		"deposit_percent": p.DepositPercent,
		"created_at": p.CreatedAt, "updated_at": p.UpdatedAt,
		"customer_name": userName, "customer_email": userEmail,
	}
	var contract models.Contract
	if database.DB.Where("project_id = ?", p.ID).First(&contract).Error == nil {
		item["contract_status"] = contract.Status
		if contract.Status == models.ContractStatusSent && (p.Status == models.ProjectStatusPending || p.Status == "") {
			item["status"] = models.ProjectStatusContractSent
			database.DB.Model(&models.Project{}).Where("id = ?", p.ID).Update("status", models.ProjectStatusContractSent)
		}
		if contract.Status == models.ContractStatusAccepted && p.Status == models.ProjectStatusPending {
			item["status"] = models.ProjectStatusContractAccepted
			database.DB.Model(&models.Project{}).Where("id = ?", p.ID).Update("status", models.ProjectStatusContractAccepted)
		}
	}
	if p.OrderID != nil {
		var o models.Order
		if database.DB.First(&o, *p.OrderID).Error == nil {
			item["fully_paid"] = orderFullyPaid(&o)
			item["amount_due"] = orderAmountDue(&o)
			item["amount_paid"] = normalizedAmountPaid(&o)
			item["order_status"] = o.Status
			item["order_total"] = o.Total
			if p.DepositPercent == 0 {
				item["deposit_percent"] = normalizeDepositPercent(o.DepositPercent)
			}
		}
	}
	return item
}

func loadProjectDetail(projectID uint, userID *uint) (gin.H, error) {
	var project models.Project
	query := database.DB
	if userID != nil {
		query = query.Where("user_id = ?", *userID)
	}
	if err := query.First(&project, projectID).Error; err != nil {
		return nil, err
	}

	var user models.User
	database.DB.First(&user, project.UserID)

	var contract models.Contract
	database.DB.Where("project_id = ?", project.ID).First(&contract)
	if contract.ID != 0 {
		if contract.Status == models.ContractStatusSent && project.Status == models.ProjectStatusPending {
			project.Status = models.ProjectStatusContractSent
			database.DB.Model(&project).Update("status", models.ProjectStatusContractSent)
		}
		if contract.Status == models.ContractStatusAccepted && (project.Status == models.ProjectStatusPending || project.Status == models.ProjectStatusContractSent) {
			project.Status = models.ProjectStatusContractAccepted
			database.DB.Model(&project).Update("status", models.ProjectStatusContractAccepted)
		}
	}

	var delivery models.Delivery
	database.DB.Where("project_id = ?", project.ID).First(&delivery)

	var links []deliveryLink
	if delivery.Links != "" {
		_ = json.Unmarshal([]byte(delivery.Links), &links)
	}

	var order gin.H
	if project.OrderID != nil {
		var o models.Order
		if database.DB.First(&o, *project.OrderID).Error == nil {
			order = gin.H{
				"id": o.ID, "total": o.Total, "status": o.Status, "paid_at": o.PaidAt,
				"deposit_percent": normalizeDepositPercent(o.DepositPercent),
				"amount_paid": normalizedAmountPaid(&o),
				"amount_due": orderAmountDue(&o), "fully_paid": orderFullyPaid(&o),
				"charge_amount": float64(o.AmountSatang) / 100,
				"has_slip": strings.TrimSpace(o.SlipFilename) != "",
				"reject_reason": o.RejectReason,
				"sla_label": slaLabelForDeposit(o.DepositPercent),
			}
		}
	}

	return gin.H{
		"project": mapProjectListItem(project, user.Name, user.Email),
		"contract": gin.H{
			"id": contract.ID, "title": contract.Title, "content": contract.Content,
			"version": contract.Version, "status": contract.Status,
			"sent_at": contract.SentAt, "accepted_at": contract.AcceptedAt,
		},
		"delivery": gin.H{
			"id": delivery.ID, "message": delivery.Message, "links": links,
			"status": delivery.Status, "sent_at": delivery.SentAt, "received_at": delivery.ReceivedAt,
		},
		"order": order,
	}, nil
}

func AdminListProjects(c *gin.Context) {
	status := c.Query("status")
	query := database.DB.Model(&models.Project{}).Order("created_at DESC")
	if status != "" {
		query = query.Where("status = ?", status)
	}
	var projects []models.Project
	query.Find(&projects)

	items := make([]gin.H, 0, len(projects))
	for _, p := range projects {
		var user models.User
		database.DB.First(&user, p.UserID)
		items = append(items, mapProjectListItem(p, user.Name, user.Email))
	}
	c.JSON(http.StatusOK, gin.H{"items": items})
}

func AdminCreateProject(c *gin.Context) {
	var req struct {
		OrderID   *uint  `json:"order_id"`
		UserID    uint   `json:"user_id"`
		Title     string `json:"title" binding:"required"`
		AdminNote string `json:"admin_note"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	userID := req.UserID
	if req.OrderID != nil {
		var order models.Order
		if err := database.DB.First(&order, *req.OrderID).Error; err != nil {
			c.JSON(http.StatusNotFound, gin.H{"error": "order not found"})
			return
		}
		userID = order.UserID
		var existing models.Project
		if err := database.DB.Where("order_id = ?", *req.OrderID).First(&existing).Error; err == nil {
			c.JSON(http.StatusConflict, gin.H{"error": "ออเดอร์นี้มีโปรเจกตแล้ว", "project_id": existing.ID})
			return
		}
	}

	if userID == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "กรุณาระบุ user_id หรือ order_id"})
		return
	}

	project := models.Project{
		OrderID:   req.OrderID,
		UserID:    userID,
		Title:     strings.TrimSpace(req.Title),
		Status:    models.ProjectStatusPending,
		AdminNote: req.AdminNote,
	}
	if err := database.DB.Create(&project).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "สร้างโปรเจกตไม่สำเร็จ"})
		return
	}

	contract := models.Contract{
		ProjectID: project.ID,
		Title:     "สัญญาจ้างทำบริการ — " + project.Title,
		Content:   defaultContractContent(project.Title),
		Version:   1,
		Status:    models.ContractStatusDraft,
	}
	database.DB.Create(&contract)

	detail, _ := loadProjectDetail(project.ID, nil)
	c.JSON(http.StatusCreated, detail)
}

func AdminCreateProjectFromOrder(c *gin.Context) {
	orderID, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid order id"})
		return
	}
	var order models.Order
	if err := database.DB.First(&order, orderID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "order not found"})
		return
	}
	ensureProjectForOrder(&order)
	var project models.Project
	if err := database.DB.Where("order_id = ?", order.ID).First(&project).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "สร้างโปรเจกตไม่สำเร็จ"})
		return
	}
	detail, _ := loadProjectDetail(project.ID, nil)
	c.JSON(http.StatusOK, detail)
}

func AdminGetProject(c *gin.Context) {
	id, _ := strconv.ParseUint(c.Param("id"), 10, 64)
	detail, err := loadProjectDetail(uint(id), nil)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "not found"})
		return
	}
	c.JSON(http.StatusOK, detail)
}

func AdminUpdateProject(c *gin.Context) {
	id, _ := strconv.ParseUint(c.Param("id"), 10, 64)
	var req struct {
		Title     *string `json:"title"`
		Status    *string `json:"status"`
		AdminNote *string `json:"admin_note"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	var project models.Project
	if err := database.DB.First(&project, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "not found"})
		return
	}
	if req.Title != nil {
		project.Title = strings.TrimSpace(*req.Title)
	}
	if req.Status != nil {
		project.Status = *req.Status
	}
	if req.AdminNote != nil {
		project.AdminNote = *req.AdminNote
	}
	database.DB.Save(&project)
	detail, _ := loadProjectDetail(project.ID, nil)
	c.JSON(http.StatusOK, detail)
}

func AdminDeleteProject(c *gin.Context) {
	id, _ := strconv.ParseUint(c.Param("id"), 10, 64)
	database.DB.Where("project_id = ?", id).Delete(&models.Contract{})
	database.DB.Where("project_id = ?", id).Delete(&models.Delivery{})
	database.DB.Delete(&models.Project{}, id)
	c.JSON(http.StatusOK, gin.H{"ok": true})
}

func AdminSaveContract(c *gin.Context) {
	id, _ := strconv.ParseUint(c.Param("id"), 10, 64)
	var req struct {
		Title   string `json:"title"`
		Content string `json:"content"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	var project models.Project
	if err := database.DB.First(&project, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "not found"})
		return
	}
	var contract models.Contract
	if err := database.DB.Where("project_id = ?", project.ID).First(&contract).Error; err != nil {
		contract = models.Contract{ProjectID: project.ID, Version: 1, Status: models.ContractStatusDraft}
	}
	if contract.Status == models.ContractStatusAccepted {
		c.JSON(http.StatusBadRequest, gin.H{"error": "ลูกค้ายอมรับสัญญาแล้ว ไม่สามารถแก้ไขได้"})
		return
	}
	contract.Title = req.Title
	contract.Content = req.Content
	if contract.Status != models.ContractStatusSent {
		contract.Status = models.ContractStatusDraft
	}
	database.DB.Save(&contract)
	detail, _ := loadProjectDetail(project.ID, nil)
	c.JSON(http.StatusOK, detail)
}

func AdminSendContract(c *gin.Context) {
	id, _ := strconv.ParseUint(c.Param("id"), 10, 64)
	var project models.Project
	if err := database.DB.First(&project, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "not found"})
		return
	}
	var contract models.Contract
	if err := database.DB.Where("project_id = ?", project.ID).First(&contract).Error; err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "ยังไม่มีสัญญา"})
		return
	}
	if strings.TrimSpace(contract.Content) == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "กรุณากรอกเนื้อหาสัญญา"})
		return
	}
	now := time.Now()
	contract.Status = models.ContractStatusSent
	contract.SentAt = &now
	if err := database.DB.Save(&contract).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "ไม่สามารถบันทึกสัญญาได้"})
		return
	}
	if err := database.DB.Model(&project).Update("status", models.ProjectStatusContractSent).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "ไม่สามารถอัปเดตสถานะโปรเจกต์ได้"})
		return
	}
	notify.ContractSentAsync(project.ID)
	detail, _ := loadProjectDetail(project.ID, nil)
	c.JSON(http.StatusOK, detail)
}

func AdminSaveDelivery(c *gin.Context) {
	id, _ := strconv.ParseUint(c.Param("id"), 10, 64)
	var req struct {
		Message string         `json:"message"`
		Links   []deliveryLink `json:"links"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	var project models.Project
	if err := database.DB.First(&project, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "not found"})
		return
	}
	if project.Status != models.ProjectStatusContractAccepted &&
		project.Status != models.ProjectStatusInProgress &&
		project.Status != models.ProjectStatusDelivered &&
		project.Status != models.ProjectStatusCompleted {
		c.JSON(http.StatusBadRequest, gin.H{"error": "ลูกค้าต้องยอมรับสัญญาก่อนจึงจะส่งมอบงานได้"})
		return
	}
	linksJSON, _ := json.Marshal(req.Links)
	var delivery models.Delivery
	if err := database.DB.Where("project_id = ?", project.ID).First(&delivery).Error; err != nil {
		delivery = models.Delivery{ProjectID: project.ID, Status: models.DeliveryStatusDraft}
	}
	delivery.Message = req.Message
	delivery.Links = string(linksJSON)
	if delivery.Status != models.DeliveryStatusSent && delivery.Status != models.DeliveryStatusReceived {
		delivery.Status = models.DeliveryStatusDraft
	}
	database.DB.Save(&delivery)
	detail, _ := loadProjectDetail(project.ID, nil)
	c.JSON(http.StatusOK, detail)
}

func AdminSendDelivery(c *gin.Context) {
	id, _ := strconv.ParseUint(c.Param("id"), 10, 64)
	var project models.Project
	if err := database.DB.First(&project, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "not found"})
		return
	}
	if project.OrderID != nil {
		var o models.Order
		if database.DB.First(&o, *project.OrderID).Error == nil && !orderFullyPaid(&o) {
			c.JSON(http.StatusBadRequest, gin.H{
				"error":      "ลูกค้าต้องชำระยอดที่เหลือก่อนส่งมอบงาน",
				"amount_due": orderAmountDue(&o),
			})
			return
		}
	}
	var delivery models.Delivery
	if err := database.DB.Where("project_id = ?", project.ID).First(&delivery).Error; err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "กรุณากรอกข้อมูลส่งมอบก่อน"})
		return
	}
	now := time.Now()
	delivery.Status = models.DeliveryStatusSent
	delivery.SentAt = &now
	database.DB.Save(&delivery)
	project.Status = models.ProjectStatusDelivered
	database.DB.Save(&project)
	notify.DeliverySentAsync(project.ID)
	detail, _ := loadProjectDetail(project.ID, nil)
	c.JSON(http.StatusOK, detail)
}

func MyListProjects(c *gin.Context) {
	userID := c.GetUint("userID")
	var projects []models.Project
	database.DB.Where("user_id = ?", userID).Order("created_at DESC").Find(&projects)
	items := make([]gin.H, 0, len(projects))
	for _, p := range projects {
		items = append(items, mapProjectListItem(p, "", ""))
	}
	c.JSON(http.StatusOK, gin.H{"items": items})
}

func MyGetProject(c *gin.Context) {
	userID := c.GetUint("userID")
	id, _ := strconv.ParseUint(c.Param("id"), 10, 64)
	detail, err := loadProjectDetail(uint(id), &userID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "not found"})
		return
	}
	c.JSON(http.StatusOK, detail)
}

func MyAcceptContract(c *gin.Context) {
	userID := c.GetUint("userID")
	id, _ := strconv.ParseUint(c.Param("id"), 10, 64)
	var project models.Project
	if err := database.DB.Where("id = ? AND user_id = ?", id, userID).First(&project).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "not found"})
		return
	}
	var contract models.Contract
	if err := database.DB.Where("project_id = ?", project.ID).First(&contract).Error; err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "ไม่พบสัญญา"})
		return
	}
	if contract.Status != models.ContractStatusSent {
		c.JSON(http.StatusBadRequest, gin.H{"error": "สัญญายังไม่พร้อมให้ยอมรับ"})
		return
	}
	now := time.Now()
	contract.Status = models.ContractStatusAccepted
	contract.AcceptedAt = &now
	contract.AcceptedIP = c.ClientIP()
	database.DB.Save(&contract)
	project.Status = models.ProjectStatusContractAccepted
	database.DB.Save(&project)
	detail, _ := loadProjectDetail(project.ID, &userID)
	c.JSON(http.StatusOK, detail)
}

func MyReceiveDelivery(c *gin.Context) {
	userID := c.GetUint("userID")
	id, _ := strconv.ParseUint(c.Param("id"), 10, 64)
	var project models.Project
	if err := database.DB.Where("id = ? AND user_id = ?", id, userID).First(&project).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "not found"})
		return
	}
	var delivery models.Delivery
	if err := database.DB.Where("project_id = ?", project.ID).First(&delivery).Error; err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "ยังไม่มีงานส่งมอบ"})
		return
	}
	if delivery.Status != models.DeliveryStatusSent {
		c.JSON(http.StatusBadRequest, gin.H{"error": "งานยังไม่พร้อมรับ"})
		return
	}
	now := time.Now()
	delivery.Status = models.DeliveryStatusReceived
	delivery.ReceivedAt = &now
	database.DB.Save(&delivery)
	project.Status = models.ProjectStatusCompleted
	database.DB.Save(&project)
	detail, _ := loadProjectDetail(project.ID, &userID)
	c.JSON(http.StatusOK, detail)
}
