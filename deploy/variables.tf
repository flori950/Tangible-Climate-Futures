variable "project_id" {
  description = "GCP project that hosts the VM."
  type        = string
  default     = "adsp-387109"
}

variable "region" {
  description = "GCP region."
  type        = string
  default     = "europe-west3"
}

variable "zone" {
  description = "GCP zone for the VM."
  type        = string
  default     = "europe-west3-c"
}

variable "machine_type" {
  description = "Compute Engine machine type for the VM."
  type        = string
  default     = "e2-standard-2"
}

variable "boot_image" {
  description = "Boot disk image (project/family)."
  type        = string
  default     = "ubuntu-os-cloud/ubuntu-2404-lts-amd64"
}

variable "allowed_http_source_ranges" {
  description = "CIDR ranges allowed to reach port 80."
  type        = list(string)
  default     = ["0.0.0.0/0"]

  validation {
    condition     = alltrue([for cidr in var.allowed_http_source_ranges : can(cidrnetmask(cidr))])
    error_message = "Every entry must be a valid IPv4 CIDR range."
  }
}
