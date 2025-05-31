# Architecture Comparison: Edge LB vs Direct Connections

## **Current Architecture (With Edge LB)**
```
Client → Edge LB (nginx:80) → {
    /api/* → API LB (haproxy:8080) → FastAPI instances
    /ws/*  → WS LB (haproxy:6789) → WebSocket instances  
    /      → Frontend static files
}
```

## **Alternative: Direct Connections (No Edge LB)**
```
Client → {
    :8080/health → API LB → FastAPI instances
    :6789/       → WS LB → WebSocket instances
    :3000/       → Frontend server
}
```

## **Alternative: DNS Subdomain Routing**
```
Client → {
    api.yourdomain.com:8080 → API LB → FastAPI instances
    ws.yourdomain.com:6789  → WS LB → WebSocket instances
    yourdomain.com:3000     → Frontend server
}
```

## **Trade-offs Analysis**

| **Aspect** | **Edge LB** | **Direct Ports** | **DNS Subdomains** |
|------------|-------------|------------------|-------------------|
| **URLs** | Clean paths (`/api/health`) | Port-based (`:8080/health`) | Subdomain-based (`api.domain.com`) |
| **Ports Exposed** | 1 (port 80) | 3 (8080, 6789, 3000) | 3 (8080, 6789, 3000) |
| **SSL Certificates** | 1 certificate | 3 certificates | 3 certificates or 1 wildcard |
| **Security** | Internal services isolated | All services internet-exposed | All services internet-exposed |
| **Firewall Rules** | Simple (allow 80/443) | Complex (allow multiple ports) | Complex (allow multiple ports) |
| **Client Code** | Simple base URLs | Port management | Subdomain mapping |
| **DNS Config** | Simple A record | Simple A record | Multiple A records |
| **Load Balancer** | Centralized routing | None | None |

## **DNS Limitations Explained**

### **1. Port Exposure Problem**
Even with DNS subdomains, you still need to expose multiple ports:
```bash
# All three approaches need these ports open on your server:
8080 → API service
6789 → WebSocket service  
3000 → Frontend service

# Only Edge LB consolidates to:
80 → Everything (routes internally)
```

### **2. SSL Certificate Management**
```bash
# DNS subdomain approach needs:
api.yourdomain.com → SSL cert
ws.yourdomain.com  → SSL cert  
yourdomain.com     → SSL cert

# Edge LB approach needs:
yourdomain.com     → SSL cert (covers all paths)
```

### **3. Client Configuration Complexity**
```javascript
// DNS approach requires domain mapping:
const getApiUrl = () => {
    const domain = window.location.hostname;
    return `https://api.${domain}`;
};

const getWsUrl = () => {
    const domain = window.location.hostname;
    return `wss://ws.${domain}`;
};

// Edge LB approach is simpler:
const getApiUrl = () => `${window.location.origin}/api`;
const getWsUrl = () => `wss://${window.location.host}/ws/`;
```

## **When Each Makes Sense**

### **Edge LB Preferred For:**
- Production deployments
- Custom domains
- SSL requirements
- Security compliance
- Clean API design
- **Single point of SSL termination**
- **Minimal port exposure**

### **Direct Connections OK For:**
- Development environments
- Internal networks
- Rapid prototyping
- Resource-constrained setups

### **DNS Subdomains OK For:**
- Microservices architecture (different teams/services)
- Services that truly need isolation
- When you have budget for multiple SSL certificates
- Enterprise setups with complex DNS management

## **QueuePlay Decision**

We chose Edge LB because:
1. **Production-ready** architecture from the start
2. **Clean URLs** improve user experience  
3. **SSL termination** simplifies certificate management
4. **Security** best practices (minimal port exposure)
5. **Extensibility** for future services
6. **Single domain** management
7. **Centralized routing** logic 