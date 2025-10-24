# Security Policy

## Reporting a Vulnerability

If you discover a security vulnerability in this project, please report it by:

1. **Do NOT** open a public issue
2. Email the project maintainers directly
3. Include detailed information about the vulnerability
4. Allow reasonable time for a fix before public disclosure

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 1.x.x   | :white_check_mark: |
| < 1.0   | :x:                |

## Security Best Practices

### Environment Variables

- **NEVER** commit `.env` files to git
- Use `.env.example` as a template with placeholder values
- Rotate credentials regularly (API keys every 90 days)
- Use different credentials for development, staging, and production

### API Keys & Secrets

Protected files (automatically ignored by `.gitignore`):

- `*.env` and `.env.*`
- `*.env.backup*`
- `*.key`, `*.pem`, `*.p12`, `*.pfx`
- `*.keystore`, `*.jks`
- `*.cert`, `*.crt`

### Before Committing

Always verify you're not committing secrets:

```bash
# Check what you're committing
git diff --cached

# Verify ignored files are not staged
git status

# Scan for potential secrets (optional)
git log --all --pretty=format: --name-only | grep -E "\.env$|\.key$"
```

### Production Deployment

1. **Use secure secret management:**
   - AWS Secrets Manager
   - HashiCorp Vault
   - Kubernetes Secrets
   - Platform environment variables

2. **Enable security features:**
   - GitHub secret scanning
   - Dependabot alerts
   - Code scanning (CodeQL)

3. **Regular security audits:**
   - Review dependencies monthly
   - Update packages regularly
   - Monitor for CVEs

## What We Do

- ✅ Comprehensive `.gitignore` for sensitive files
- ✅ Security audit documentation
- ✅ Environment variable templates
- ✅ Secure defaults in code
- ✅ Input validation and sanitization
- ✅ Rate limiting on API endpoints
- ✅ JWT-based authentication
- ✅ CORS configuration
- ✅ Helmet.js security headers

## Resources

- [Security Audit Report](../SECURITY_AUDIT.md)
- [Troubleshooting Guide](../apps/api/docs/TROUBLESHOOTING.md)
- [Security Guidelines](../spec/security-guidelines.md)

## Contact

For security concerns, contact the project maintainers.
