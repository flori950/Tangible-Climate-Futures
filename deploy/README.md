# deploy/

Terraform for the original 2023 production deployment: one Google Compute Engine VM that runs the whole stack with `production.docker-compose.yml`.

| File | What |
|---|---|
| `provider.tf` | Google provider, project `adsp-387109` (the course project, almost certainly deleted), region `europe-west3`. Change `project` to your own before use. |
| `vm.tf` | VM `adsp` (e2-standard-2, Ubuntu LTS image). Uploads the repository via a `file` provisioner, waits for `setup.sh` to finish, then runs `docker compose -f production.docker-compose.yml up -d`. |
| `firewall.tf` | Opens TCP 80 to the world for instances tagged `http-server`. |
| `ssh_key.tf` | Generates an RSA key pair in Terraform state for the provisioners. |
| `output.tf` | `vm_url`: the public HTTP URL. |
| `setup.sh` | VM startup script: installs Docker + Compose plugin, adds `ubuntu` to the docker group, removes its sudo rights, writes `/home/setup_finished.txt`. |

## Usage

```bash
export GOOGLE_APPLICATION_CREDENTIALS=/path/to/key.json
cd deploy
terraform init
terraform apply      # prints vm_url
terraform destroy
```

Fill in the Firebase keys in `frontend/src/environments/` and real `PROD_MONGODB_*` values in the root `.env` first.

## Gotchas

- The `file` provisioner copies from `../../SS23_ADSP_TCF/`, i.e. it expects the checkout folder to be named like the upstream repository. In this fork the folder is `Tangible-Climate-Futures`; adjust the path or rename the checkout.
- The private SSH key lives in Terraform state (`deploy/*terraform*` is gitignored). Never commit state files.
- Only port 80 is opened; the Express API port must be reachable from the browser too unless the frontend proxies it.
