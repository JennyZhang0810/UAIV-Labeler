# Domain Deployment Notes

To publish with a domain such as:

```text
https://annotation.example.com
```

## DNS

Point your domain or subdomain to the server public IP:

```text
Type: A
Host: annotation
Value: <server-ip>
```

## Nginx

Generate an Nginx config:

```bash
scripts/make_nginx_config.sh annotation.example.com
sudo cp deploy/nginx_annotation.example.com.conf /etc/nginx/conf.d/uaiv-labeler.conf
sudo nginx -t
sudo systemctl reload nginx
```

The site should work at:

```text
http://annotation.example.com
```

## HTTPS

After DNS works, install Certbot and run:

```bash
sudo certbot --nginx -d annotation.example.com
```

Then open:

```text
https://annotation.example.com
```

## Systemd Service

Edit `deploy/uaiv-labeler.service`:

- replace `YOUR_USER`;
- replace `/opt/UAIV-Labeler` if your deployment path is different;
- configure `UAIV_BROWSE_ROOTS` for your mounted datasets.

Install:

```bash
sudo cp deploy/uaiv-labeler.service /etc/systemd/system/uaiv-labeler.service
sudo systemctl daemon-reload
sudo systemctl enable --now uaiv-labeler
sudo systemctl status uaiv-labeler
```
