# Samvid AI - Makefile
# Common commands for local development and AWS deployment

.PHONY: help install build-layer local deploy destroy frontend-dev frontend-build seed-secret

STACK_NAME ?= samvid-ai
ENV ?= dev
REGION ?= ap-south-1

help: ## Show this help
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-25s\033[0m %s\n", $$1, $$2}'

# ─── Backend ─────────────────────────────────────────

install: ## Install backend layer dependencies locally
	pip install -r backend/layers/shared/requirements.txt --target backend/layers/shared/python/ --break-system-packages

build-layer: ## Build the shared Lambda layer
	pip3 install -r backend/layers/shared/requirements.txt \
		--target backend/layers/shared/python/ \
		--platform manylinux2014_x86_64 \
		--only-binary=:all: \
		--implementation cp \
		--python-version 3.11 \
		--upgrade

sam-build: ## Build SAM application
	sam build --use-container

local: ## Run API locally (requires Docker + AWS credentials)
	sam local start-api \
		--env-vars env.json \
		--port 3001 \
		--region $(REGION)

deploy: ## Deploy to AWS (requires AWS credentials)
	sam deploy \
		--stack-name $(STACK_NAME)-$(ENV) \
		--region $(REGION) \
		--capabilities CAPABILITY_IAM CAPABILITY_NAMED_IAM \
		--parameter-overrides Environment=$(ENV) \
		--resolve-s3 \
		--confirm-changeset

deploy-guided: ## Deploy with guided prompts (first-time)
	sam deploy --guided \
		--stack-name $(STACK_NAME)-$(ENV) \
		--region $(REGION) \
		--capabilities CAPABILITY_IAM CAPABILITY_NAMED_IAM

destroy: ## Tear down the CloudFormation stack
	sam delete --stack-name $(STACK_NAME)-$(ENV) --region $(REGION)

# ─── Secrets ─────────────────────────────────────────

seed-secret: ## Store OpenAI API key in Secrets Manager (set OPENAI_KEY=sk-...)
	@if [ -z "$(OPENAI_KEY)" ]; then echo "Usage: make seed-secret OPENAI_KEY=sk-..."; exit 1; fi
	aws secretsmanager create-secret \
		--name samvid-ai/openai-api-key \
		--secret-string '{"api_key":"$(OPENAI_KEY)"}' \
		--region $(REGION) || \
	aws secretsmanager update-secret \
		--secret-id samvid-ai/openai-api-key \
		--secret-string '{"api_key":"$(OPENAI_KEY)"}' \
		--region $(REGION)
	@echo "✅ OpenAI key stored in Secrets Manager"

# ─── Frontend ─────────────────────────────────────────

frontend-install: ## Install frontend dependencies
	cd frontend && npm install

frontend-dev: ## Start frontend dev server
	cd frontend && npm run dev

frontend-build: ## Build frontend for production
	cd frontend && npm run build

frontend-deploy: ## Deploy frontend build to S3 (set FRONTEND_BUCKET=your-bucket)
	@if [ -z "$(FRONTEND_BUCKET)" ]; then echo "Usage: make frontend-deploy FRONTEND_BUCKET=bucket-name"; exit 1; fi
	cd frontend && npm run build
	aws s3 sync frontend/dist s3://$(FRONTEND_BUCKET) --delete
	@echo "✅ Frontend deployed to s3://$(FRONTEND_BUCKET)"

# ─── Testing ─────────────────────────────────────────

test-upload: ## Test the upload endpoint locally
	curl -X POST http://localhost:3001/api/v1/documents/upload \
		-H "Content-Type: application/json" \
		-d '{"file_name":"test.pdf","file_size":102400,"mime_type":"application/pdf","document_type":"Rental Agreement"}' | jq .

test-results: ## Test results endpoint (set DOC_ID=your-doc-id)
	@if [ -z "$(DOC_ID)" ]; then echo "Usage: make test-results DOC_ID=uuid"; exit 1; fi
	curl -s http://localhost:3001/api/v1/documents/$(DOC_ID)/results | jq .

# ─── Utilities ────────────────────────────────────────

outputs: ## Show CloudFormation stack outputs
	aws cloudformation describe-stacks \
		--stack-name $(STACK_NAME)-$(ENV) \
		--region $(REGION) \
		--query 'Stacks[0].Outputs' \
		--output table

logs-analyze: ## Tail AI analysis Lambda logs
	sam logs -n AnalyzeFunction --stack-name $(STACK_NAME)-$(ENV) --tail

logs-upload: ## Tail upload Lambda logs
	sam logs -n UploadFunction --stack-name $(STACK_NAME)-$(ENV) --tail
