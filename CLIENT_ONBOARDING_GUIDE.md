# 🚀 Client Onboarding Workflow Guide

## Overview
This guide walks you through the complete process of onboarding a new client with their services using the MSSP Client Manager platform.

---

## ✅ **Step 1: Client Information Setup** (5 minutes)

### Navigate to Clients
1. Go to **Clients** page from the main navigation
2. Click **"Add New Client"** button

### Fill in Client Details
- **Basic Information:**
  - Company Name (e.g., "TechCorp Solutions")
  - Short Name (e.g., "TechCorp")
  - Industry (e.g., "Technology")
  - Company Size (e.g., "500-1000 employees")
  - Website URL
  - Address

- **Primary Contact:**
  - Full Name
  - Email Address
  - Phone Number
  - Job Title
  - Mark as "Primary Contact"

### Add Additional Contacts
- **Technical Contact** (IT Manager, CTO)
- **Billing Contact** (Finance, Accounting)
- **Security Contact** (CISO, Security Manager)

**✅ Save the client and note the Client ID for next steps**

---

## ✅ **Step 2: Contract Creation** (10 minutes)

### Navigate to Contracts
1. Go to **Contracts** page
2. Click **"Create New Contract"**

### Configure Contract Details
- **Select Client:** Choose the client you just created
- **Contract Name:** e.g., "TechCorp SOC Services Agreement 2024"
- **Start Date:** Contract effective date
- **End Date:** Contract expiration date
- **Auto-Renewal:** Enable if applicable
- **Total Value:** Contract financial value
- **Status:** Set to "Active" or "Draft"

### Upload Documents
- Upload signed contract PDF
- Add any amendments or addendums
- Include SOW (Statement of Work) if separate

**✅ Save the contract and note the Contract ID**

---

## ✅ **Step 3: Service Selection & Scope Configuration** (15 minutes)

### Navigate to Service Scopes
1. Go to **Service Scopes** page
2. Click **"Create New Service Scope"**

### For Each Service (repeat as needed):

#### A. Select Service Type
Choose from available services:
- **SOC Services** (24x7 monitoring)
- **Managed Detection & Response (MDR)**
- **Vulnerability Management**
- **Incident Response**
- **Compliance Management**
- **Network Security Monitoring**

#### B. Configure Service Scope Parameters

**Core Variables:**
- **Service Tier:** Enterprise, Professional, Standard
- **Coverage Hours:** 24x7, 16x5, 8x5
- **Response Time:** Critical incident response time (minutes)
- **EPS (Events Per Second):** Expected log volume
- **Endpoints:** Number of monitored endpoints
- **Data Volume:** GB per day processed

**Advanced Variables (using our new dynamic system):**
```bash
# You can now add any custom scope variables:
- Threat Detection Accuracy: 99.5%
- Security Analysts Assigned: 8
- Compliance Frameworks: SOC2,ISO27001,GDPR
- Threat Intelligence Sources: 25
- Mean Time to Detection: 45 minutes
- Cloud Accounts Monitored: 120
- API Calls per Day: 1,500,000
```

#### C. Define Deliverables
- Monthly security reports
- Quarterly business reviews
- Incident response documentation
- Compliance attestations
- Threat hunting reports

**✅ Create multiple service scopes for each service offering**

---

## ✅ **Step 4: Resource Allocation** (8 minutes) *[Optional]*

### License Management
1. Go to **License Pools** or **Assets** page
2. Assign software licenses needed for the client:
   - SIEM licenses
   - EDR/XDR licenses
   - Threat intelligence feeds
   - Compliance tools

### Hardware Assignment
1. Navigate to **Hardware Assets**
2. Assign dedicated hardware if applicable:
   - Security appliances
   - Network monitoring devices
   - Backup/DR equipment

### Team Assignments
1. Go to **Team** page
2. Assign team members to the client:
   - Primary SOC analysts
   - Incident response team
   - Account manager
   - Technical lead

---

## ✅ **Step 5: System Integration** (12 minutes) *[Optional]*

### External System Mapping
1. Go to **External Systems** page
2. Configure integrations:

#### Jira Integration
- Create client-specific Jira project
- Map incident categories
- Set up automatic ticket creation
- Configure SLA mappings

#### Monitoring Tools
- SIEM integration
- EDR platform connectivity
- Network monitoring tools
- Threat intelligence feeds

#### Communication Channels
- Slack/Teams integration
- Email notification groups
- Emergency contact escalation

---

## ✅ **Step 6: Final Review & Activation** (5 minutes)

### Review Configuration
1. **Client Information:** Verify all details are correct
2. **Contract Terms:** Confirm dates, values, and renewal settings
3. **Service Scopes:** Review all scope parameters and variables
4. **Resource Assignments:** Validate license and hardware allocations
5. **Integration Settings:** Test external system connections

### Activate Client
1. Set client status to **"Active"**
2. Set contract status to **"Active"**
3. Activate all service scopes
4. Enable monitoring and alerting

### Welcome & Kickoff
- Send welcome email to client contacts
- Schedule kickoff meeting
- Provide access credentials if needed
- Share initial documentation

---

## 🎉 **Completion Checklist**

- [ ] Client profile created with all contacts
- [ ] Contract created and activated
- [ ] All service scopes configured with proper variables
- [ ] Resources allocated (licenses, hardware, team)
- [ ] External systems integrated
- [ ] Client status set to "Active"
- [ ] Welcome communication sent
- [ ] Initial monitoring confirmed

---

## 🔧 **Current Workflow Access**

### Quick Navigation Links:
- **Clients:** `http://localhost:3000/clients`
- **Contracts:** `http://localhost:3000/contracts`
- **Service Scopes:** `http://localhost:3000/service-scopes`
- **Assets & Licenses:** `http://localhost:3000/assets`
- **Team Management:** `http://localhost:3000/team`
- **External Systems:** `http://localhost:3000/external-systems`

### New Features Available:
- **Dynamic Scope Variables:** Add any custom scope parameters instantly
- **Advanced Filtering:** Filter service scopes by EPS, endpoints, tier, etc.
- **Real-time Search:** Find clients and scopes with powerful search

---

## 💡 **Pro Tips**

1. **Use Templates:** Create service scope templates for common configurations
2. **Batch Operations:** Set up multiple similar scopes at once
3. **Documentation:** Always add detailed notes and descriptions
4. **Validation:** Double-check all parameters before activation
5. **Communication:** Keep client informed throughout the process

---

## 🆘 **Need Help?**

- **Demo Page:** Use `demo-dynamic-scope-variables.html` to test scope variables
- **API Testing:** Run `node test-dynamic-scope-system.js` for validation
- **Documentation:** Refer to scope filtering implementation docs

---

**Ready to onboard your first client? Start with Step 1! 🚀** 