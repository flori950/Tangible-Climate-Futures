# Plan-only tests with mocked providers: no GCP credentials, nothing is created.
# Run from deploy/: terraform init -backend=false && terraform test

mock_provider "google" {}
mock_provider "tls" {
  # Make the generated key known at plan time so the ssh-keys metadata can be asserted.
  override_during = plan

  mock_resource "tls_private_key" {
    defaults = {
      public_key_openssh = "ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAABAQCtest terraform-test"
      private_key_pem    = "-----BEGIN RSA PRIVATE KEY-----\ntest\n-----END RSA PRIVATE KEY-----\n"
    }
  }
}

run "defaults_produce_expected_vm" {
  command = plan

  assert {
    condition     = google_compute_instance.adsp.machine_type == "e2-standard-2"
    error_message = "Default machine type changed."
  }

  assert {
    condition     = google_compute_instance.adsp.boot_disk[0].initialize_params[0].image == "ubuntu-os-cloud/ubuntu-2404-lts-amd64"
    error_message = "VM must boot from the Ubuntu 24.04 LTS image family."
  }

  assert {
    condition     = contains(google_compute_instance.adsp.tags, "http-server")
    error_message = "VM must carry the http-server tag the firewall rule targets."
  }

  assert {
    condition     = strcontains(google_compute_instance.adsp.metadata["startup-script"], "docker-compose-plugin")
    error_message = "Startup script must install the Docker Compose plugin."
  }

  assert {
    condition     = strcontains(google_compute_instance.adsp.metadata["ssh-keys"], "ubuntu:")
    error_message = "SSH key metadata must be issued for the ubuntu user."
  }

  assert {
    condition     = length(google_compute_instance.adsp.network_interface[0].access_config) == 1
    error_message = "VM needs exactly one external access config (public IP)."
  }
}

run "firewall_only_opens_http" {
  command = plan

  assert {
    condition     = length(google_compute_firewall.allow-http.allow) == 1
    error_message = "Firewall must have exactly one allow block."
  }

  assert {
    condition     = one([for a in google_compute_firewall.allow-http.allow : a.protocol]) == "tcp"
    error_message = "Firewall must only allow TCP."
  }

  assert {
    condition     = one([for a in google_compute_firewall.allow-http.allow : a.ports]) == tolist(["80"])
    error_message = "Firewall must only open port 80."
  }

  assert {
    condition     = google_compute_firewall.allow-http.target_tags == toset(["http-server"])
    error_message = "Firewall must target the http-server tag."
  }
}

run "ssh_key_is_rsa" {
  command = plan

  assert {
    condition     = tls_private_key.ssh_key.algorithm == "RSA"
    error_message = "Provisioner key must be RSA."
  }
}

run "variables_are_applied" {
  command = plan

  variables {
    machine_type               = "e2-medium"
    zone                       = "europe-west1-b"
    allowed_http_source_ranges = ["203.0.113.0/24"]
  }

  assert {
    condition     = google_compute_instance.adsp.machine_type == "e2-medium"
    error_message = "machine_type variable is not used."
  }

  assert {
    condition     = google_compute_firewall.allow-http.source_ranges == toset(["203.0.113.0/24"])
    error_message = "allowed_http_source_ranges variable is not used."
  }
}

run "invalid_cidr_is_rejected" {
  command = plan

  variables {
    allowed_http_source_ranges = ["not-a-cidr"]
  }

  expect_failures = [var.allowed_http_source_ranges]
}
