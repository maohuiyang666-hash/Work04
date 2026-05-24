.PHONY: check check-frontend check-backend

check:
	@echo "="
	@echo "运行完整代码质量检查..."
	@echo "="
	npm run check

check-frontend:
	@echo "="
	@echo "运行前端代码质量检查..."
	@echo "="
	npm run check:frontend

check-backend:
	@echo "="
	@echo "运行后端代码质量检查..."
	@echo "="
	npm run check:backend
