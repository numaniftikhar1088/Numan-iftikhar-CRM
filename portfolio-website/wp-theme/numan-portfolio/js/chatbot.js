/* ============================================
   AI CHATBOT - Numan Iftikhar Portfolio
   Smart FAQ Assistant
   ============================================ */

(function () {
    const knowledgeBase = [
        {
            keywords: ['hello', 'hi', 'hey', 'greetings', 'assalam', 'salam', 'good morning', 'good evening'],
            response: "Hello! Welcome to Numan's portfolio. I can help you learn about his skills, experience, certifications, services, and availability. What would you like to know?"
        },
        {
            keywords: ['who', 'about', 'introduce', 'tell me about', 'yourself', 'numan'],
            response: "Numan Iftikhar is a <strong>Senior Multi-Cloud DevOps Engineer</strong> with 5+ years of experience specializing in Azure, AWS, and Google Cloud Platform. He's a Kubernetes Architect and Terraform Expert focused on building secure, self-healing cloud infrastructures."
        },
        {
            keywords: ['skill', 'expertise', 'technologies', 'tech stack', 'tools', 'what can you do', 'capable'],
            response: "Numan's core skills include:<br><br>☁️ <strong>Cloud:</strong> Azure, AWS, GCP<br>🐳 <strong>Containers:</strong> Kubernetes, Docker, Helm, Istio<br>🚀 <strong>CI/CD:</strong> Jenkins, GitHub Actions, GitLab CI, ArgoCD<br>📦 <strong>IaC:</strong> Terraform, Ansible, Pulumi<br>📊 <strong>Monitoring:</strong> Prometheus, Grafana, Datadog<br>🔒 <strong>Security:</strong> DevSecOps, Trivy, Prisma Cloud, OPA"
        },
        {
            keywords: ['experience', 'work history', 'career', 'years', 'where did you work', 'companies', 'job'],
            response: "Numan has <strong>5+ years</strong> of professional experience:<br><br>🏢 <strong>Senior DevOps Engineer</strong> at TrueMedIT (March 2023 – Present) — Calgary, Canada (Remote)<br>• Multi-cloud architecture, Kubernetes orchestration, CI/CD automation<br><br>🏢 <strong>DevOps Engineer</strong> at 403 IT Solutions (July 2021 – March 2023) — Texas, US (Remote)<br>• Hybrid cloud infrastructure, Tier 3 technical leadership"
        },
        {
            keywords: ['certification', 'certified', 'certificate', 'credentials', 'qualifications'],
            response: "Numan holds <strong>8+ industry certifications</strong>:<br><br>🟢 Google Cloud – Professional Cloud DevOps Engineer<br>🟢 Google Cloud – Professional Cloud Architect<br>🟢 Google Cloud – Associate Cloud Engineer<br>🟠 AWS Solutions Architect – Associate<br>🟠 AWS Developer – Associate<br>🔵 Microsoft Azure Administrator Associate<br>🟣 HashiCorp Terraform Associate<br>🔴 Kaseya Certified – Cybersecurity"
        },
        {
            keywords: ['service', 'offer', 'what do you provide', 'help with', 'consulting'],
            response: "Numan offers the following services:<br><br>☁️ <strong>Cloud Migration & Architecture</strong> — AWS, Azure, GCP<br>⚙️ <strong>Kubernetes Design & Deployment</strong> — AKS, EKS, GKE<br>🔄 <strong>CI/CD Pipeline Engineering</strong> — End-to-end automation<br>📋 <strong>Infrastructure as Code</strong> — Terraform, Ansible<br>🔒 <strong>DevSecOps Implementation</strong> — Security-first pipelines<br>📊 <strong>Monitoring & Observability</strong> — Prometheus, Grafana<br>💰 <strong>Cloud Cost Optimization</strong> — FinOps strategies"
        },
        {
            keywords: ['available', 'hire', 'hiring', 'freelance', 'remote', 'open to work', 'looking for'],
            response: "Yes! Numan is <strong>currently available</strong> for:<br><br>✅ Full-time remote positions<br>✅ Freelance & contract projects<br>✅ Consulting engagements<br><br>📅 You can <a href='#book-call' onclick='closeChatAndScroll(\"book-call\")'>book a free 30-minute consultation</a> to discuss your project!"
        },
        {
            keywords: ['contact', 'reach', 'email', 'phone', 'get in touch', 'connect'],
            response: "You can reach Numan through:<br><br>📧 <strong>Email:</strong> <a href='mailto:hellonumaniftikhar@gmail.com'>hellonumaniftikhar@gmail.com</a><br>📞 <strong>Phone:</strong> +92 301 000 7414<br>🔗 <strong>LinkedIn:</strong> <a href='https://linkedin.com/in/numaniftikhar' target='_blank'>linkedin.com/in/numaniftikhar</a><br>💻 <strong>GitHub:</strong> <a href='https://github.com/numaniftikhar1088' target='_blank'>github.com/numaniftikhar1088</a><br><br>Or <a href='#book-call' onclick='closeChatAndScroll(\"book-call\")'>book a free call</a>!"
        },
        {
            keywords: ['project', 'portfolio', 'case study', 'work sample', 'built'],
            response: "Numan has worked on impressive projects:<br><br>🏦 <strong>FinGuard</strong> — Multi-Cloud Banking Platform<br>• AWS EKS + GCP GKE, Terraform, ArgoCD, Istio<br>• PCI-DSS & SOC 2 compliant, RPO < 5 min<br><br>🧪 <strong>Lab Management System</strong> — Multi-Tenant SaaS on AKS<br>• HIPAA & ISO 27001 compliant<br>• 99.97% uptime, p99 < 100ms<br>• ~70% cost reduction with KEDA autoscaling<br><br>Check them out in the <a href='#projects' onclick='closeChatAndScroll(\"projects\")'>Projects section</a>!"
        },
        {
            keywords: ['kubernetes', 'k8s', 'container', 'docker', 'orchestration', 'aks', 'eks', 'gke'],
            response: "Numan is a <strong>Kubernetes Architect</strong> with expertise in:<br><br>• Production clusters on <strong>AKS, EKS, and GKE</strong><br>• Helm charts & Istio service mesh<br>• KEDA autoscaling & HPA<br>• Self-healing configurations with 99.9% uptime<br>• Multi-tenant namespace isolation<br>• Velero backup & disaster recovery"
        },
        {
            keywords: ['terraform', 'iac', 'infrastructure as code', 'ansible', 'pulumi'],
            response: "Numan is a <strong>HashiCorp Certified Terraform Associate</strong> with deep IaC expertise:<br><br>• Multi-cloud provisioning (Azure + GCP + AWS)<br>• Terraform modules for reusable infrastructure<br>• Ansible for configuration management<br>• 100% consistency across Dev, QA, and Production<br>• Zero configuration drift with GitOps workflows"
        },
        {
            keywords: ['ci/cd', 'cicd', 'pipeline', 'deployment', 'automation', 'jenkins', 'github actions', 'argocd', 'gitops'],
            response: "Numan engineers <strong>end-to-end CI/CD pipelines</strong> using:<br><br>• Jenkins, GitHub Actions, GitLab CI<br>• Azure DevOps & Google Cloud Build<br>• ArgoCD for GitOps deployments<br>• Canary & blue/green deployment strategies<br>• Automated security scanning (Trivy, Semgrep)<br>• Cosign image signing for supply chain security"
        },
        {
            keywords: ['security', 'devsecops', 'compliance', 'pci', 'hipaa', 'soc'],
            response: "Numan specializes in <strong>DevSecOps & Compliance</strong>:<br><br>🔒 SSL/TLS enforcement across all environments<br>🔒 Automated vulnerability scanning (Prisma/Trivy)<br>🔒 Secrets management (Azure Key Vault, GCP Secret Manager)<br>🔒 OPA Gatekeeper policy-as-code<br>🔒 PCI-DSS, SOC 2, HIPAA & ISO 27001 compliance<br>🔒 Zero-trust networking with Istio mTLS"
        },
        {
            keywords: ['cloud', 'aws', 'azure', 'gcp', 'google cloud', 'multi-cloud', 'migration'],
            response: "Numan is certified across <strong>all 3 major cloud platforms</strong>:<br><br>☁️ <strong>Azure:</strong> VMs, AKS, Blob Storage, Entra ID, VNETs<br>☁️ <strong>AWS:</strong> EKS, EC2, S3, IAM, CloudFormation<br>☁️ <strong>GCP:</strong> GKE, Compute Engine, Cloud Storage, VPC<br><br>He architects multi-cloud solutions with cross-cloud failover and disaster recovery."
        },
        {
            keywords: ['monitoring', 'observability', 'prometheus', 'grafana', 'datadog', 'logging', 'alerting'],
            response: "Numan implements <strong>centralized monitoring & observability</strong>:<br><br>📊 Prometheus & Grafana dashboards<br>📊 Google Cloud Monitoring & Logging<br>📊 Datadog integration<br>📊 Proactive alerting for incident detection<br>📊 Custom metrics and SLI/SLO tracking<br>📊 Cross-cloud unified observability"
        },
        {
            keywords: ['education', 'degree', 'university', 'study', 'college'],
            response: "Numan holds a <strong>Bachelor of Science in Information Technology</strong> from the Virtual University of Pakistan (2018 – 2022) with a CGPA of 3.2/4.0."
        },
        {
            keywords: ['location', 'where', 'country', 'based', 'timezone'],
            response: "Numan is based in <strong>Pakistan</strong> and works remotely with clients worldwide. He's experienced in collaborating across timezones with teams in <strong>Canada, the United States</strong>, and globally."
        },
        {
            keywords: ['language', 'speak', 'english', 'urdu'],
            response: "Numan speaks:<br><br>🌐 <strong>English</strong> — Professional Working Proficiency<br>🌐 <strong>Urdu</strong> — Native"
        },
        {
            keywords: ['rate', 'price', 'cost', 'charge', 'budget', 'pricing', 'how much'],
            response: "Numan offers competitive rates based on project scope and duration. For a detailed quote, you can:<br><br>📅 <a href='#book-call' onclick='closeChatAndScroll(\"book-call\")'>Book a free 30-minute consultation</a><br>📧 Email: <a href='mailto:hellonumaniftikhar@gmail.com'>hellonumaniftikhar@gmail.com</a><br><br>The initial consultation is <strong>100% free</strong> with no obligations!"
        },
        {
            keywords: ['resume', 'cv', 'download'],
            response: "You can download Numan's resume by clicking the <strong>Resume</strong> button in the navigation bar, or <a href='Numan_Iftikhar_Resume.pdf' download>click here to download</a>."
        },
        {
            keywords: ['book', 'call', 'meeting', 'schedule', 'consultation', 'appointment'],
            response: "You can book a <strong>free 30-minute consultation</strong> with Numan!<br><br>🕐 30 minutes, one-on-one<br>📹 Google Meet or Zoom<br>💰 100% free, no obligations<br><br>👉 <a href='#book-call' onclick='closeChatAndScroll(\"book-call\")'>Schedule your call now</a>"
        },
        {
            keywords: ['thank', 'thanks', 'bye', 'goodbye', 'see you', 'that\'s all'],
            response: "You're welcome! If you have more questions, feel free to ask anytime. Don't forget to <a href='#book-call' onclick='closeChatAndScroll(\"book-call\")'>book a free consultation</a> if you'd like to discuss a project. Have a great day! 👋"
        }
    ];

    const fallbackResponses = [
        "I'm not sure about that. You can ask me about Numan's skills, experience, certifications, services, or availability. Or <a href='#contact' onclick='closeChatAndScroll(\"contact\")'>contact him directly</a>!",
        "That's a great question! I may not have the answer, but Numan would love to discuss it. <a href='#book-call' onclick='closeChatAndScroll(\"book-call\")'>Book a free call</a> to chat with him directly.",
        "I'm designed to answer basic questions about Numan. Try asking about his skills, projects, certifications, or how to hire him!"
    ];

    let fallbackIndex = 0;

    // DOM Elements
    const chatToggle = document.getElementById('chatToggle');
    const chatWindow = document.getElementById('chatWindow');
    const chatClose = document.getElementById('chatClose');
    const chatInput = document.getElementById('chatInput');
    const chatSend = document.getElementById('chatSend');
    const chatMessages = document.getElementById('chatMessages');
    const chatSuggestions = document.getElementById('chatSuggestions');
    const chatBadge = document.querySelector('.chatbot-badge');
    const chatIconOpen = document.getElementById('chatIconOpen');
    const chatIconClose = document.getElementById('chatIconClose');
    let isOpen = false;

    // Toggle chat window
    chatToggle.addEventListener('click', () => {
        isOpen = !isOpen;
        chatWindow.classList.toggle('open', isOpen);
        chatToggle.classList.toggle('active', isOpen);
        chatIconOpen.style.display = isOpen ? 'none' : 'block';
        chatIconClose.style.display = isOpen ? 'block' : 'none';
        if (isOpen) {
            chatBadge.style.display = 'none';
            chatInput.focus();
        }
    });

    chatClose.addEventListener('click', () => {
        isOpen = false;
        chatWindow.classList.remove('open');
        chatToggle.classList.remove('active');
        chatIconOpen.style.display = 'block';
        chatIconClose.style.display = 'none';
    });

    // Send message
    function sendMessage() {
        const text = chatInput.value.trim();
        if (!text) return;

        addMessage(text, 'user');
        chatInput.value = '';

        // Hide suggestions after first message
        if (chatSuggestions) chatSuggestions.style.display = 'none';

        // Typing indicator
        const typingDiv = document.createElement('div');
        typingDiv.className = 'chat-message bot typing-indicator';
        typingDiv.innerHTML = '<div class="chat-bubble"><span class="typing-dots"><span></span><span></span><span></span></span></div>';
        chatMessages.appendChild(typingDiv);
        scrollToBottom();

        setTimeout(() => {
            typingDiv.remove();
            const response = getResponse(text);
            addMessage(response, 'bot');
        }, 600 + Math.random() * 800);
    }

    chatSend.addEventListener('click', sendMessage);
    chatInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') sendMessage();
    });

    // Suggestion buttons
    document.querySelectorAll('.suggestion-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const q = btn.getAttribute('data-q');
            chatInput.value = q;
            sendMessage();
        });
    });

    // Add message to chat
    function addMessage(text, sender) {
        const msgDiv = document.createElement('div');
        msgDiv.className = `chat-message ${sender}`;
        msgDiv.innerHTML = `<div class="chat-bubble">${text}</div>`;
        chatMessages.appendChild(msgDiv);
        scrollToBottom();
    }

    function scrollToBottom() {
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    // Match response from knowledge base
    function getResponse(input) {
        const lower = input.toLowerCase();

        let bestMatch = null;
        let bestScore = 0;

        for (const entry of knowledgeBase) {
            let score = 0;
            for (const kw of entry.keywords) {
                if (lower.includes(kw)) {
                    score += kw.length;
                }
            }
            if (score > bestScore) {
                bestScore = score;
                bestMatch = entry;
            }
        }

        if (bestMatch && bestScore > 0) {
            return bestMatch.response;
        }

        const response = fallbackResponses[fallbackIndex];
        fallbackIndex = (fallbackIndex + 1) % fallbackResponses.length;
        return response;
    }

    // Global function for closing chat and scrolling
    window.closeChatAndScroll = function (sectionId) {
        isOpen = false;
        chatWindow.classList.remove('open');
        chatToggle.classList.remove('active');
        chatIconOpen.style.display = 'block';
        chatIconClose.style.display = 'none';
        setTimeout(() => {
            document.getElementById(sectionId).scrollIntoView({ behavior: 'smooth' });
        }, 300);
    };

    // Auto-open after 5 seconds on first visit
    setTimeout(() => {
        if (!isOpen && !sessionStorage.getItem('chatOpened')) {
            chatBadge.classList.add('pulse');
        }
    }, 5000);

})();
