# Security Guidelines & Best Practices

## 🔒 Security Philosophy

### Security-First Development
- **Security by Design**: Security considerations are integrated from the beginning, not added later
- **Defense in Depth**: Multiple layers of security controls
- **Principle of Least Privilege**: Users and systems have minimal necessary access
- **Fail Securely**: System failures don't compromise security

### OWASP Compliance
We follow the OWASP Top 10 and additional security guidelines:
- Input validation and sanitization
- Authentication and session management
- Access control and authorization
- Data protection and privacy
- Security logging and monitoring

---

## 🛡️ Application Security

### Input Validation & Sanitization
```typescript
// ✅ GOOD: Using Zod for input validation
import { z } from 'zod';

const UserInputSchema = z.object({
  email: z.string().email(),
  username: z.string().min(3).max(50).regex(/^[a-zA-Z0-9_]+$/),
  password: z.string().min(8).regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
});

// ✅ GOOD: Sanitizing HTML content
import DOMPurify from 'dompurify';
const sanitizedContent = DOMPurify.sanitize(userInput);

// ❌ BAD: Direct string interpolation
const query = `SELECT * FROM users WHERE id = ${userId}`;
```

### Authentication Security
```typescript
// ✅ GOOD: Secure JWT implementation
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';

// Password hashing
const hashedPassword = await bcrypt.hash(password, 12);

// JWT with short expiration and refresh tokens
const accessToken = jwt.sign(
  { userId: user.id, role: user.role },
  process.env.JWT_SECRET!,
  { expiresIn: '15m' }
);

// ✅ GOOD: Rate limiting for auth endpoints
@UseGuards(ThrottlerGuard)
@Throttle(5, 300) // 5 attempts per 5 minutes
@Post('login')
async login(@Body() loginDto: LoginDto) {
  // Implementation
}
```

### Session Management
```typescript
// ✅ GOOD: Secure session configuration
const sessionConfig = {
  secret: process.env.SESSION_SECRET!,
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 1000 * 60 * 60 * 24 * 7 // 7 days
  }
};

// ✅ GOOD: Session invalidation on logout
@Post('logout')
async logout(@Req() req: Request) {
  req.session.destroy();
  res.clearCookie('connect.sid');
  return { message: 'Logged out successfully' };
}
```

---

## 🌐 Web Security Headers

### Security Headers Configuration
```typescript
// ✅ GOOD: Comprehensive security headers
import helmet from 'helmet';

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "wss:", "https:"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"]
    }
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
}));

// Additional security headers
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  next();
});
```

### CORS Configuration
```typescript
// ✅ GOOD: Restrictive CORS policy
const corsOptions = {
  origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  maxAge: 86400 // 24 hours
};

app.use(cors(corsOptions));
```

---

## 🗄️ Database Security

### SQL Injection Prevention
```typescript
// ✅ GOOD: Using Prisma ORM (prevents SQL injection)
const user = await prisma.user.findUnique({
  where: { id: userId },
  select: { id: true, email: true, role: true }
});

// ✅ GOOD: Parameterized queries if using raw SQL
const result = await prisma.$queryRaw`
  SELECT * FROM users WHERE email = ${email} AND active = true
`;

// ❌ BAD: String concatenation (vulnerable to SQL injection)
const query = `SELECT * FROM users WHERE email = '${email}'`;
```

### Database Connection Security
```typescript
// ✅ GOOD: Secure database configuration
const databaseConfig = {
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT!),
  username: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  connectionLimit: 10,
  acquireTimeout: 60000,
  timeout: 60000,
  reconnect: true
};

// ✅ GOOD: Connection pooling with limits
const pool = mysql.createPool({
  ...databaseConfig,
  connectionLimit: 10,
  queueLimit: 0,
  acquireTimeout: 60000,
  timeout: 60000
});
```

---

## 📁 File Upload Security

### File Validation & Scanning
```typescript
// ✅ GOOD: Comprehensive file validation
const allowedMimeTypes = [
  'image/jpeg', 'image/png', 'image/gif',
  'application/pdf', 'text/plain'
];

const maxFileSize = 10 * 1024 * 1024; // 10MB

const validateFile = (file: Express.Multer.File) => {
  if (!allowedMimeTypes.includes(file.mimetype)) {
    throw new BadRequestException('File type not allowed');
  }
  
  if (file.size > maxFileSize) {
    throw new BadRequestException('File too large');
  }
  
  // Check file extension
  const ext = path.extname(file.originalname).toLowerCase();
  const allowedExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.pdf', '.txt'];
  
  if (!allowedExtensions.includes(ext)) {
    throw new BadRequestException('File extension not allowed');
  }
};

// ✅ GOOD: Malware scanning integration
import { scanFile } from './malware-scanner';

const scanUploadedFile = async (filePath: string) => {
  const scanResult = await scanFile(filePath);
  if (scanResult.isInfected) {
    fs.unlinkSync(filePath);
    throw new BadRequestException('File appears to be malicious');
  }
};
```

### Secure File Storage
```typescript
// ✅ GOOD: S3 with proper access controls
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

const s3Client = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!
  }
});

const uploadToS3 = async (file: Buffer, key: string) => {
  const command = new PutObjectCommand({
    Bucket: process.env.S3_BUCKET_NAME,
    Key: key,
    Body: file,
    ContentType: 'application/octet-stream',
    ACL: 'private', // Private by default
    ServerSideEncryption: 'AES256'
  });
  
  return await s3Client.send(command);
};
```

---

## 🔐 API Security

### Rate Limiting
```typescript
// ✅ GOOD: Comprehensive rate limiting
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';

@Module({
  imports: [
    ThrottlerModule.forRoot([{
      ttl: 60000, // 1 minute
      limit: 100, // 100 requests per minute
    }])
  ]
})

// ✅ GOOD: Different limits for different endpoints
@UseGuards(ThrottlerGuard)
@Throttle(5, 300) // 5 attempts per 5 minutes for auth
@Post('login')
async login() {}

@UseGuards(ThrottlerGuard)
@Throttle(100, 60) // 100 requests per minute for general API
@Get('users')
async getUsers() {}
```

### API Key Management
```typescript
// ✅ GOOD: Secure API key storage and validation
import { createHash } from 'crypto';

class ApiKeyService {
  private hashApiKey(apiKey: string): string {
    return createHash('sha256').update(apiKey).digest('hex');
  }
  
  async validateApiKey(apiKey: string): Promise<boolean> {
    const hashedKey = this.hashApiKey(apiKey);
    const storedKey = await this.findApiKey(hashedKey);
    
    if (!storedKey) return false;
    
    // Check if key is expired
    if (storedKey.expiresAt && new Date() > storedKey.expiresAt) {
      return false;
    }
    
    // Update last used timestamp
    await this.updateLastUsed(storedKey.id);
    return true;
  }
}
```

---

## 🚨 Security Monitoring & Logging

### Security Event Logging
```typescript
// ✅ GOOD: Comprehensive security logging
import { Logger } from '@nestjs/common';

class SecurityLogger {
  private logger = new Logger('Security');
  
  logLoginAttempt(userId: string, success: boolean, ip: string) {
    this.logger.log({
      event: 'LOGIN_ATTEMPT',
      userId,
      success,
      ip,
      timestamp: new Date().toISOString(),
      userAgent: req.headers['user-agent']
    });
  }
  
  logSecurityViolation(type: string, details: any) {
    this.logger.warn({
      event: 'SECURITY_VIOLATION',
      type,
      details,
      timestamp: new Date().toISOString()
    });
  }
}
```

### Audit Trail
```typescript
// ✅ GOOD: Comprehensive audit logging
@Entity('audit_logs')
export class AuditLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;
  
  @Column()
  userId: string;
  
  @Column()
  action: string;
  
  @Column('jsonb')
  details: any;
  
  @Column()
  ipAddress: string;
  
  @Column()
  userAgent: string;
  
  @CreateDateColumn()
  createdAt: Date;
}

// ✅ GOOD: Audit decorator
export const Audit = (action: string) => {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;
    
    descriptor.value = async function (...args: any[]) {
      const result = await originalMethod.apply(this, args);
      
      // Log the action
      await this.auditService.log({
        action,
        userId: this.getCurrentUserId(),
        details: { args, result },
        ipAddress: this.getClientIp(),
        userAgent: this.getUserAgent()
      });
      
      return result;
    };
    
    return descriptor;
  };
};
```

---

## 🔍 Security Testing

### Automated Security Testing
```typescript
// ✅ GOOD: Security test examples
describe('Security Tests', () => {
  it('should prevent SQL injection', async () => {
    const maliciousInput = "'; DROP TABLE users; --";
    
    const response = await request(app.getHttpServer())
      .post('/api/users/search')
      .send({ query: maliciousInput });
    
    expect(response.status).toBe(400);
  });
  
  it('should validate file uploads', async () => {
    const maliciousFile = Buffer.from('malicious content');
    
    const response = await request(app.getHttpServer())
      .post('/api/upload')
      .attach('file', maliciousFile, 'script.js');
    
    expect(response.status).toBe(400);
  });
  
  it('should enforce rate limiting', async () => {
    const requests = Array(101).fill(null).map(() =>
      request(app.getHttpServer()).get('/api/users')
    );
    
    const responses = await Promise.all(requests);
    const tooManyRequests = responses.filter(r => r.status === 429);
    
    expect(tooManyRequests.length).toBeGreaterThan(0);
  });
});
```

### Dependency Security Scanning
```bash
# ✅ GOOD: Regular security scans
npm audit
npm audit fix

# Using Snyk for deeper security analysis
npx snyk test
npx snyk monitor

# Using OWASP Dependency Check
dependency-check --scan ./ --format HTML --out reports/
```

---

## 🚀 Production Security

### Environment Security
```bash
# ✅ GOOD: Secure environment variable management
# .env.example (template, no real secrets)
JWT_SECRET=your-jwt-secret-here
DATABASE_URL=postgresql://user:password@localhost:5432/dbname
API_KEYS=your-api-keys-here

# .env (actual secrets, never committed)
JWT_SECRET=super-secret-jwt-key-here
DATABASE_URL=postgresql://realuser:realpassword@localhost:5432/realdb
API_KEYS=sk-1234567890abcdef
```

### Production Hardening
```typescript
// ✅ GOOD: Production security configuration
const productionConfig = {
  // Disable detailed error messages
  showErrors: false,
  
  // Enable HTTPS only
  httpsOnly: true,
  
  // Strict CORS
  cors: {
    origin: process.env.FRONTEND_URL,
    credentials: true
  },
  
  // Security headers
  security: {
    helmet: true,
    rateLimit: true,
    cors: true
  },
  
  // Logging
  logging: {
    level: 'warn',
    security: true
  }
};
```

---

## 📚 Security Resources

### OWASP Resources
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [OWASP Cheat Sheets](https://cheatsheetseries.owasp.org/)
- [OWASP Testing Guide](https://owasp.org/www-project-web-security-testing-guide/)

### Security Tools
- **Static Analysis**: SonarQube, ESLint security rules
- **Dependency Scanning**: Snyk, npm audit, OWASP Dependency Check
- **Dynamic Testing**: OWASP ZAP, Burp Suite
- **Container Security**: Trivy, Clair

### Security Standards
- **OWASP ASVS**: Application Security Verification Standard
- **NIST Cybersecurity Framework**: Risk management framework
- **ISO 27001**: Information security management
- **SOC 2**: Security, availability, and confidentiality controls

---

## 🎯 Security Checklist

### Development Phase
- [ ] Input validation implemented for all endpoints
- [ ] Authentication and authorization implemented
- [ ] Rate limiting configured
- [ ] Security headers configured
- [ ] CORS policy defined
- [ ] File upload validation implemented
- [ ] SQL injection prevention measures in place
- [ ] XSS prevention measures implemented
- [ ] CSRF protection implemented

### Testing Phase
- [ ] Security tests written and passing
- [ ] Dependency vulnerabilities scanned
- [ ] Penetration testing completed
- [ ] Security code review completed
- [ ] OWASP Top 10 vulnerabilities addressed

### Production Phase
- [ ] Environment variables secured
- [ ] HTTPS enforced
- [ ] Security monitoring implemented
- [ ] Incident response plan documented
- [ ] Security training completed for team

Remember: Security is not a one-time task but an ongoing process. Regular security reviews, updates, and monitoring are essential for maintaining a secure application.
