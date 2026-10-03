# deploy/

Terraform for the original 2023 production deployment: one Google Compute Engine VM that runs the whole stack with `production.docker-compose.yml`.

| File | What |
|---|---|
| `provider.tf` | Required Terraform/provider versions (google ~> 8.0, tls ~> 4.0) and the Google provider, configured from variables. |
| `variables.tf` | `project_id` (default `adsp-387109`, the course project, almost certainly deleted: override it), `region`, `zone`, `machine_type`, `boot_image`, `allowed_http_source_ranges` (validated CIDRs). |
| `.terraform.lock.hcl` | Provider lock with checksums for linux_amd64, darwin_arm64 and darwin_amd64. Regenerate with `terraform providers lock -platform=…` after a provider upgrade. |
| `.tflint.hcl` | TFLint config: recommended Terraform preset + Google ruleset. |
| `tests/deploy.tftest.hcl` | `terraform test` suite, plan-only with mocked `google`/`tls` providers: VM defaults, firewall opens only TCP 80 to the tagged VM, RSA key, variable overrides, CIDR validation. Needs no credentials. |
| `vm.tf` | VM `adsp` (default e2-standard-2, Ubuntu 24.04 LTS). Uploads the repository root (`${path.module}/../`) via a `file` provisioner, waits for `setup.sh` to finish, then runs `docker compose -f production.docker-compose.yml up -d`. |
| `firewall.tf` | Opens TCP 80 for instances tagged `http-server`, from `allowed_http_source_ranges` (default: everyone). |
| `ssh_key.tf` | Generates an RSA key pair in Terraform state for the provisioners. |
| `output.tf` | `vm_url`: the public HTTP URL. |
| `setup.sh` | VM startup script: installs Docker + Compose plugin, adds `ubuntu` to the docker group, removes its sudo rights, writes `/home/setup_finished.txt`. |

## Usage

```bash
export GOOGLE_APPLICATION_CREDENTIALS=/path/to/key.json
cd deploy
terraform init
terraform apply -var project_id=<your-project>   # prints vm_url
terraform destroy
```

Fill in the Firebase keys in `frontend/src/environments/` and real `PROD_MONGODB_*` values in the root `.env` first.

## Checks (same as CI)

```bash
cd deploy
terraform fmt -recursive -check
terraform init -backend=false
terraform validate
tflint --init && tflint
terraform test        # 5 plan-only runs, mocked providers, no credentials
```

What the tests cannot cover: real GCP API behaviour, the provisioners (they only run on apply) and whether `setup.sh` works on the VM.

## Gotchas

- The `file` provisioner uploads the whole repository root, including local `node_modules`, `.venv` and `.git` if present. Deploy from a clean checkout.
- The private SSH key lives in Terraform state (`deploy/*terraform*` is gitignored). Never commit state files.
- Only port 80 is opened; the Express API port must be reachable from the browser too unless the frontend proxies it.
