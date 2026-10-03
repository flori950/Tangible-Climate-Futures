resource "google_compute_instance" "adsp" {
  name         = "adsp"
  machine_type = var.machine_type
  tags         = ["http-server"]

  boot_disk {
    initialize_params {
      image = var.boot_image
    }
  }

  network_interface {
    network = "default"
    access_config {}
  }

  metadata = {
    ssh-keys       = "ubuntu:${tls_private_key.ssh_key.public_key_openssh}"
    startup-script = file("${path.module}/setup.sh")
  }

  connection {
    user        = "ubuntu"
    host        = self.network_interface[0].access_config[0].nat_ip
    private_key = tls_private_key.ssh_key.private_key_pem
  }

  provisioner "file" {
    source      = "${path.module}/../"
    destination = "/home/ubuntu"
  }

  provisioner "remote-exec" {
    inline = [
      "until [ -f /home/setup_finished.txt ] && [ -f /home/ubuntu/production.docker-compose.yml ]; do sleep 30; done",
      "newgrp docker << EOF",
      "docker compose -f /home/ubuntu/production.docker-compose.yml up -d --quiet-pull",
      "EOF"
    ]
  }
}
