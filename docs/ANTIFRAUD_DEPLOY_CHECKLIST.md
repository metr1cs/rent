# Anti-Fraud Deployment Checklist

## 1) Reverse Proxy (Nginx) Rate Limits
Apply per-IP limits on public write endpoints:
- `/api/venues/*/requests`
- `/api/venues/*/reviews`
- `/api/support/requests`
- `/api/owner/*` auth/write endpoints
- `/api/admin/*` auth endpoints

Recommended baseline:
```nginx
limit_req_zone $binary_remote_addr zone=vmesto_public:10m rate=30r/m;
limit_req_zone $binary_remote_addr zone=vmesto_auth:10m rate=10r/m;

location ~* ^/api/venues/.*/requests$ {
  limit_req zone=vmesto_public burst=20 nodelay;
  proxy_pass http://127.0.0.1:8090;
}

location ~* ^/api/venues/.*/reviews$ {
  limit_req zone=vmesto_public burst=12 nodelay;
  proxy_pass http://127.0.0.1:8090;
}

location = /api/support/requests {
  limit_req zone=vmesto_public burst=10 nodelay;
  proxy_pass http://127.0.0.1:8090;
}

location = /api/owner/login {
  limit_req zone=vmesto_auth burst=8 nodelay;
  proxy_pass http://127.0.0.1:8090;
}
```

## 2) API-Level Anti-Fraud
- Device/IP-aware rate limit enabled (`x-client-fingerprint` + IP bucket).
- Duplicate checks enabled for:
  - lead submissions
  - support requests
  - review submissions
- Review anti-fraud queue enabled (`pending` + risk flags).

## 3) Frontend Fingerprint
- All critical POST requests must include `x-client-fingerprint`.
- Fingerprint is client-persistent in local storage.

## 4) Verification
- Trigger 10+ repeated requests and verify `429`.
- Send duplicate lead/support payload and verify `409`.
- Verify suspicious review goes to `pending`.

